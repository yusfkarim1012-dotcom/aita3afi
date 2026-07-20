export const onRequestGet = async (context) => {
  try {
    const kv = context.env.TA3AFI_DATA;
    
    // 1. List all keys with prefix 'user_' (Registered users)
    const listResult = await kv.list({ prefix: 'user_' });
    const keys = listResult.keys || [];
    
    // 2. List all keys with prefix 'guest_user_' (Guest / unregistered users)
    const guestListResult = await kv.list({ prefix: 'guest_user_' });
    const guestKeys = guestListResult.keys || [];
    
    const usersList = [];
    
    // Process registered users
    for (const key of keys) {
      if (!key.name.startsWith('user_') || key.name.includes('_msg_count_')) {
        continue;
      }
      
      const docVal = await kv.get(key.name);
      if (docVal) {
        try {
          const userDoc = JSON.parse(docVal);
          if (userDoc && userDoc.username) {
            const username = userDoc.username;
            const cleanUser = username.trim().toLowerCase();
            const msgCountVal = await kv.get(`stats_user_msgs_${cleanUser}`);
            const msgCount = msgCountVal ? parseInt(msgCountVal, 10) : 0;
            
            usersList.push({
              username,
              isRegistered: true,
              msgCount,
              keyName: key.name
            });
          }
        } catch (e) {
          console.warn("Failed to parse registered user doc:", key.name, e);
        }
      }
    }
    
    // Process guest users
    for (const key of guestKeys) {
      const docVal = await kv.get(key.name);
      if (docVal) {
        try {
          const guestDoc = JSON.parse(docVal);
          if (guestDoc && guestDoc.username) {
            const rawUsername = guestDoc.username;
            const msgCountVal = await kv.get(`stats_user_msgs_${rawUsername}`);
            const msgCount = msgCountVal ? parseInt(msgCountVal, 10) : 0;
            
            // Format guest username nicely for display, e.g. "زائر (guest_a1b2c3d4)"
            const friendlyName = `زائر (${rawUsername})`;
            
            usersList.push({
              username: friendlyName,
              isRegistered: false,
              msgCount,
              keyName: key.name
            });
          }
        } catch (e) {
          console.warn("Failed to parse guest user doc:", key.name, e);
        }
      }
    }
    
    // Sort users by message count (descending)
    usersList.sort((a, b) => b.msgCount - a.msgCount);
    
    const registeredCount = usersList.filter(u => u.isRegistered).length;
    const guestCount = usersList.filter(u => !u.isRegistered).length;
    
    return new Response(JSON.stringify({
      totalUsers: usersList.length,
      registeredCount,
      guestCount,
      users: usersList
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};
