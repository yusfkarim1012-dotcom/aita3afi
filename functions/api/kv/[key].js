export const onRequestGet = async (context) => {
  const key = context.params.key;
  if (!key) return new Response('Bad Request', { status: 400 });
  
  const value = await context.env.TA3AFI_DATA.get(key);
  if (value === null) {
    return new Response('Not Found', { status: 404 });
  }
  return new Response(value);
};

export const onRequestPost = async (context) => {
  const key = context.params.key;
  if (!key) return new Response('Bad Request', { status: 400 });
  
  const value = await context.request.text();
  
  if (value === "") {
    await context.env.TA3AFI_DATA.delete(key);
  } else {
    await context.env.TA3AFI_DATA.put(key, value);
  }
  
  return new Response('OK');
};
