import supabase from './db-client.js';

const ADMIN_PASSWORD = '12345678rk';
const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) return res.status(401).json({ error: 'كلمة مرور يوسف غير صحيحة' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'الطريقة غير مدعومة' });
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [conversations, messages, feedback, recentMessages] = await Promise.all([
      supabase.from('conversations').select('id,user_id,created_at'),
      supabase.from('messages').select('id,role,created_at'),
      supabase.from('message_feedback').select('rating,created_at'),
      supabase.from('messages').select('id,role,created_at').gte('created_at', since).order('created_at', { ascending: true }),
    ]);
    for (const result of [conversations, messages, feedback, recentMessages]) if (result.error) throw result.error;
    const allConversations = conversations.data || [];
    const allMessages = messages.data || [];
    const allFeedback = feedback.data || [];
    const uniqueUsers = new Set(allConversations.map((item) => item.user_id));
    const registeredUsers = new Set(allConversations.filter((item) => String(item.user_id).startsWith('user:')).map((item) => item.user_id));
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(Date.now() - (6 - offset) * 86400000);
      const key = date.toISOString().slice(0, 10);
      return { date: key, label: date.toLocaleDateString('ar', { weekday: 'short' }), messages: 0 };
    });
    for (const message of recentMessages.data || []) {
      const day = days.find((item) => item.date === String(message.created_at).slice(0, 10));
      if (day) day.messages += 1;
    }
    return res.status(200).json({
      totals: {
        conversations: allConversations.length,
        messages: allMessages.filter((item) => item.role === 'user').length,
        answers: allMessages.filter((item) => item.role === 'assistant').length,
        visitors: uniqueUsers.size,
        registered: registeredUsers.size,
        likes: allFeedback.filter((item) => item.rating === 'like').length,
        dislikes: allFeedback.filter((item) => item.rating === 'dislike').length,
      },
      daily: days,
    });
  } catch (error) {
    console.error('Analytics API:', error);
    return res.status(500).json({ error: error.message || 'خطأ في الخادم' });
  }
}
