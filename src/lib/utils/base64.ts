/**
 * Base64 encoding utility
 * Works in both Node.js and Edge runtime
 */

/**
 * Encode string to base64
 * Uses btoa in browser/Edge, Buffer in Node.js
 */
export function encodeBase64(str: string): string {
  // In browser/Edge runtime, use btoa
  if (typeof window !== "undefined" || typeof btoa !== "undefined") {
    try {
      return btoa(str);
    } catch {
      // Fallback for Node.js if btoa not available
    }
  }
  
  // In Node.js runtime, use Buffer
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str).toString("base64");
  }
  
  // Last resort: manual base64 encoding
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : "=";
    result += i - 1 < str.length ? chars.charAt(bitmap & 63) : "=";
  }
  
  return result;
}

/**
 * Decode base64 string
 * Uses atob in browser/Edge, Buffer in Node.js
 */
export function decodeBase64(str: string): string {
  // In browser/Edge runtime, use atob
  if (typeof window !== "undefined" || typeof atob !== "undefined") {
    try {
      return atob(str);
    } catch {
      // Fallback for Node.js if atob not available
    }
  }
  
  // In Node.js runtime, use Buffer
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "base64").toString("utf-8");
  }
  
  // Last resort: manual base64 decoding
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  
  str = str.replace(/[^A-Za-z0-9\+\/]/g, "");
  
  while (i < str.length) {
    const encoded1 = chars.indexOf(str.charAt(i++));
    const encoded2 = chars.indexOf(str.charAt(i++));
    const encoded3 = chars.indexOf(str.charAt(i++));
    const encoded4 = chars.indexOf(str.charAt(i++));
    
    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    result += String.fromCharCode((bitmap >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
  }
  
  return result;
}


