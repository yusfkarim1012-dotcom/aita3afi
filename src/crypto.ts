export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function encryptData(data: string, secret: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret.substring(0, 32).padEnd(32, '0')),
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      keyMaterial,
      enc.encode(data)
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (e) {
    console.error("Encryption failed:", e);
    throw e;
  }
}

export async function decryptData(cipherBase64: string, secret: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const combined = new Uint8Array(atob(cipherBase64).split("").map(c => c.charCodeAt(0)));
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret.substring(0, 32).padEnd(32, '0')),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      keyMaterial,
      ciphertext
    );
    
    return dec.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    throw e;
  }
}
