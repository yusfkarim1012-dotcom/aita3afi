import supabase from './db-client.js';
import { COMPANION_PROMPT, DOCTOR_PROMPT } from './persona-prompts.js';

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Visitor-Id, X-Persona, Authorization');
};

async function identity(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) return `user:${data.user.id}`;
  }
  return String(req.headers['x-visitor-id'] || '').slice(0, 100);
}

const completionUrl = (base) => base.endsWith('/chat/completions')
  ? base
  : `${base.replace(/\/$/, '')}/chat/completions`;

const systemPrompt = (_language, persona) => persona === 'doctor' ? DOCTOR_PROMPT : COMPANION_PROMPT;

function answerFromPayload(payload) {
  return payload?.choices?.[0]?.message?.content
    || payload?.choices?.[0]?.text
    || payload?.output?.[0]?.content?.[0]?.text
    || payload?.output_text
    || '';
}

function answerFromSse(raw) {
  let answer = '';
  for (const line of raw.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean.startsWith('data:')) continue;
    const value = clean.slice(5).trim();
    if (!value || value === '[DONE]') continue;
    try {
      const payload = JSON.parse(value);
      answer += payload?.choices?.[0]?.delta?.content
        || payload?.choices?.[0]?.message?.content
        || payload?.delta?.text
        || '';
    } catch {
      // Ignore provider keep-alive lines.
    }
  }
  return answer;
}

function emitAnswer(res, answer) {
  const chunks = answer.match(/.{1,18}(?:\s+|$)|.{1,18}/gu) || [answer];
  for (const content of chunks) {
    res.write(`data: ${JSON.stringify({ type: 'delta', content })}\n\n`);
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'الطريقة غير مدعومة' });

  try {
    const owner = await identity(req);
    const { conversation_id, content, language = 'ar' } = req.body || {};
    const persona = req.headers['x-persona'] === 'doctor' ? 'doctor' : 'companion';
    if (!owner || !conversation_id || !content?.trim() || content.length > 12000) {
      return res.status(400).json({ error: 'الرسالة أو الجلسة غير صالحة' });
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id,title,server_id')
      .eq('id', conversation_id)
      .eq('user_id', owner)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) return res.status(404).json({ error: 'المحادثة غير موجودة' });

    const { data: server, error: serverError } = await supabase
      .from('ai_servers')
      .select('*')
      .eq('id', conversation.server_id)
      .eq('is_active', true)
      .maybeSingle();
    if (serverError) throw serverError;
    if (!server) return res.status(400).json({ error: 'الخادم غير متاح' });

    const { error: userMessageError } = await supabase
      .from('messages')
      .insert({ conversation_id, role: 'user', content: content.trim() });
    if (userMessageError) throw userMessageError;

    const { data: history, error: historyError } = await supabase
      .from('messages')
      .select('role,content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(24);
    if (historyError) throw historyError;

    const messages = [
      { role: 'system', content: systemPrompt(language, persona) },
      ...[...(history || [])].reverse(),
    ];

    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('server_id', server.id)
      .eq('is_active', true)
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .order('priority', { ascending: true })
      .limit(5000);
    if (keysError) throw keysError;
    if (!keys?.length) return res.status(400).json({ error: 'لا توجد مفاتيح نشطة' });

    let answer = '';
    let usedKey = null;
    let lastError = 'فشلت جميع المفاتيح';

    for (const key of keys) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      try {
        const upstream = await fetch(completionUrl(server.base_url), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key.key_value}`,
          },
          body: JSON.stringify({
            model: server.model,
            messages,
            temperature: 0.7,
            stream: true,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        const raw = await upstream.text();
        if (!upstream.ok) {
          lastError = `HTTP ${upstream.status}: ${raw.slice(0, 180)}`;
          await supabase.from('api_keys').update({
            fail_count: (key.fail_count || 0) + 1,
            last_error: lastError,
            last_used_at: new Date().toISOString(),
            is_active: ![401, 403].includes(upstream.status),
          }).eq('id', key.id);
          continue;
        }

        const contentType = upstream.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream') || raw.trimStart().startsWith('data:')) {
          answer = answerFromSse(raw);
        } else {
          try {
            answer = answerFromPayload(JSON.parse(raw));
          } catch {
            answer = raw.trim();
          }
        }

        if (!answer) {
          lastError = 'لم يُرجع الخادم نصاً مفهوماً';
          await supabase.from('api_keys').update({
            fail_count: (key.fail_count || 0) + 1,
            last_error: lastError,
            last_used_at: new Date().toISOString(),
          }).eq('id', key.id);
          continue;
        }
        usedKey = key;
        break;
      } catch (error) {
        clearTimeout(timer);
        lastError = error?.name === 'AbortError' ? 'انتهت مهلة الاتصال' : (error?.message || 'فشل الاتصال');
        await supabase.from('api_keys').update({
          fail_count: (key.fail_count || 0) + 1,
          last_error: lastError,
          last_used_at: new Date().toISOString(),
        }).eq('id', key.id);
      }
    }

    if (!answer || !usedKey) {
      return res.status(502).json({ error: `تعذر الحصول على إجابة. ${lastError}` });
    }

    const { data: saved, error: saveError } = await supabase
      .from('messages')
      .insert({ conversation_id, role: 'assistant', content: answer })
      .select('id,created_at')
      .single();
    if (saveError) throw saveError;

    await Promise.all([
      supabase.from('api_keys').update({
        use_count: (usedKey.use_count || 0) + 1,
        last_error: null,
        last_used_at: new Date().toISOString(),
      }).eq('id', usedKey.id),
      supabase.from('conversations').update({
        title: conversation.title === 'محادثة جديدة' ? content.trim().slice(0, 55) : conversation.title,
        updated_at: new Date().toISOString(),
      }).eq('id', conversation_id),
    ]);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    emitAnswer(res, answer);
    res.write(`data: ${JSON.stringify({ type: 'done', id: saved?.id })}\n\n`);
    return res.end();
  } catch (error) {
    console.error('Chat API error:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error?.message || 'خطأ في الخادم' })}\n\n`);
      return res.end();
    }
    return res.status(500).json({ error: error?.message || 'خطأ في الخادم' });
  }
}
