export const onRequestGet = async (context) => {
  try {
    const kv = context.env.TA3AFI_DATA;
    
    // 1. List all keys with prefix 'user_'
    // In Cloudflare KV, list returns a list of keys. Since we want to find all user accounts,
    // we fetch them. Note that HASH of usernames are stored as user_[sha256].
    const listResult = await kv.list({ prefix: 'user_' });
    const keys = listResult.keys || [];
    
    const usersList = [];
    
    // 2. Fetch each user's document
    for (const key of keys) {
      // Skip keys that are not direct user documents (just in case)
      if (!key.name.startsWith('user_') || key.name.includes('_msg_count_')) {
        continue;
      }
      
      const docVal = await kv.get(key.name);
      if (docVal) {
        try {
          const userDoc = JSON.parse(docVal);
          if (userDoc && userDoc.username) {
            const username = userDoc.username;
            
            // Get user message count from KV stats
            const cleanUser = username.trim().toLowerCase();
            const msgCountVal = await kv.get(`stats_user_msgs_${cleanUser}`);
            const msgCount = msgCountVal ? parseInt(msgCountVal, 10) : 0;
            
            usersList.push({
              username,
              msgCount,
              keyName: key.name
            });
          }
        } catch (e) {
          // Ignore JSON parse errors for non-user documents
          console.warn("Failed to parse user doc for key:", key.name, e);
        }
      }
    }
    
    // Sort users by message count (descending)
    usersList.sort((a, b) => b.msgCount - a.msgCount);
    
    return new Response(JSON.stringify({
      totalUsers: usersList.length,
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
