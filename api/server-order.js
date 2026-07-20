import supabase from './db-client.js';

const ADMIN_PASSWORD = '12345678rk';
const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) return res.status(401).json({ error: 'كلمة مرور يوسف غير صحيحة' });
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('server_positions').select('server_id,position').order('position', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'PUT') {
      const ids = Array.isArray(req.body?.server_ids) ? req.body.server_ids.map(Number).filter(Number.isFinite) : [];
      if (!ids.length) return res.status(400).json({ error: 'ترتيب الخوادم مطلوب' });
      const { error: deleteError } = await supabase.from('server_positions').delete().gte('position', 0);
      if (deleteError) throw deleteError;
      const rows = ids.map((server_id, position) => ({ server_id, position }));
      const { data, error } = await supabase.from('server_positions').insert(rows).select();
      if (error) throw error;
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'الطريقة غير مدعومة' });
  } catch (error) {
    console.error('Server order API:', error);
    return res.status(500).json({ error: error.message || 'خطأ في الخادم' });
  }
}
