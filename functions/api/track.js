export const onRequestPost = async (context) => {
  try {
    const url = new URL(context.request.url);
    const persona = url.searchParams.get('persona') || 'doctor';
    const username = url.searchParams.get('username') || '';
    
    // Get current date/time components
    const now = new Date();
    
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    
    // Get Week Number
    const getWeekNumber = (d) => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    };
    const WW = String(getWeekNumber(now)).padStart(2, '0');
    
    const hourKey = `stats_hour_${YYYY}${MM}${DD}_${HH}_${persona}`;
    const dayKey = `stats_day_${YYYY}${MM}${DD}_${persona}`;
    const weekKey = `stats_week_${YYYY}_W${WW}_${persona}`;
    const monthKey = `stats_month_${YYYY}${MM}_${persona}`;
    
    const kv = context.env.TA3AFI_DATA;
    
    // Helper to increment KV key
    const increment = async (key) => {
      const current = await kv.get(key);
      const count = current ? parseInt(current, 10) : 0;
      await kv.put(key, String(count + 1));
    };
    
    const promises = [
      increment(hourKey),
      increment(dayKey),
      increment(weekKey),
      increment(monthKey)
    ];
    
    // Increment specific user message count if username is provided
    if (username.trim()) {
      const cleanUser = username.trim().toLowerCase();
      const userMsgsKey = `stats_user_msgs_${cleanUser}`;
      promises.push(increment(userMsgsKey));
      
      // If it is an unregistered/guest user, record it in KV so we can list it in Admin panel
      if (cleanUser.startsWith('guest_')) {
        promises.push(kv.put(`guest_user_${cleanUser}`, JSON.stringify({
          username: cleanUser,
          lastActive: now.toISOString()
        })));
      }
    }
    
    await Promise.all(promises);
    
    return new Response('OK', {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};
