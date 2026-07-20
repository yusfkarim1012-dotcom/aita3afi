import supabase from './db-client.js';

export const config = { maxDuration: 30 };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function validKey(value) {
  const key = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{1,180}$/.test(key) ? key : null;
}

function reply(res, status, body, type = 'application/json; charset=utf-8') {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  return res.end(type.startsWith('application/json') ? JSON.stringify(body) : String(body ?? ''));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return reply(res, 204, '', 'text/plain; charset=utf-8');

  const key = validKey(req.query?.key);
  if (!key) return reply(res, 400, { error: 'مفتاح التخزين غير صالح' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('cloud_kv').select('value').eq('key', key).limit(1);
      if (error) return reply(res, 503, { error: 'تعذر قراءة الحساب', detail: error.message });
      if (!data?.length) return reply(res, 404, '', 'text/plain; charset=utf-8');
      return reply(res, 200, data[0].value || '', 'text/plain; charset=utf-8');
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      let value;
      try {
        value = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      } catch {
        return reply(res, 400, { error: 'بيانات الحساب غير صالحة' });
      }
      const size = new TextEncoder().encode(value).length;
      if (size > 3_000_000) return reply(res, 413, { error: 'حجم المحادثات كبير جداً. احذف بعض المحادثات القديمة ثم حاول مجدداً.' });

      const now = new Date().toISOString();
      const { data: existing, error: findError } = await supabase.from('cloud_kv').select('id').eq('key', key).limit(1);
      if (findError) return reply(res, 503, { error: 'تعذر الوصول إلى التخزين', detail: findError.message });

      if (existing?.length) {
        const { error } = await supabase.from('cloud_kv').update({ value, updated_at: now }).eq('id', existing[0].id);
        if (error) return reply(res, 503, { error: 'تعذر تحديث الحساب', detail: error.message });
      } else {
        const { error } = await supabase.from('cloud_kv').insert({ key, value, updated_at: now });
        if (error) {
          const { error: retryError } = await supabase.from('cloud_kv').update({ value, updated_at: now }).eq('key', key);
          if (retryError) return reply(res, 503, { error: 'تعذر حفظ الحساب', detail: retryError.message });
        }
      }
      return reply(res, 200, { ok: true, saved_at: now });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('cloud_kv').delete().eq('key', key);
      if (error) return reply(res, 503, { error: 'تعذر حذف الحساب', detail: error.message });
      return reply(res, 200, { ok: true });
    }

    return reply(res, 405, { error: 'الطريقة غير مدعومة' });
  } catch (error) {
    console.error('KV API fatal error:', error);
    return reply(res, 500, { error: 'تعذر الاتصال بالتخزين السحابي. حاول مرة أخرى.', detail: error?.message || 'Unknown error' });
  }
}
