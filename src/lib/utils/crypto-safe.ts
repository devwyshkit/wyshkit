/**
 * Cryptographically safe comparison utility
 * Works in both Node.js and Edge runtime
 */

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses crypto.timingSafeEqual in Node.js, manual comparison in Edge
 */
export function timingSafeEqual(a: string | Uint8Array, b: string | Uint8Array): boolean {
  // In Node.js, use crypto.timingSafeEqual
  if (typeof crypto !== "undefined" && "timingSafeEqual" in crypto) {
    try {
      const nodeCrypto = require("crypto");
      const aBuf = typeof a === "string" ? Buffer.from(a, "hex") : Buffer.from(a);
      const bBuf = typeof b === "string" ? Buffer.from(b, "hex") : Buffer.from(b);
      
      if (aBuf.length !== bBuf.length) {
        return false;
      }
      
      return nodeCrypto.timingSafeEqual(aBuf, bBuf);
    } catch {
      // Fall through to manual comparison
    }
  }
  
  // Manual constant-time comparison for Edge runtime
  const aArray = typeof a === "string" ? new TextEncoder().encode(a) : new Uint8Array(a);
  const bArray = typeof b === "string" ? new TextEncoder().encode(b) : new Uint8Array(b);
  
  if (aArray.length !== bArray.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < aArray.length; i++) {
    result |= aArray[i] ^ bArray[i];
  }
  
  return result === 0;
}

/**
 * Convert string to Uint8Array (hex string or regular string)
 */
export function stringToBytes(str: string, encoding: "hex" | "utf8" = "utf8"): Uint8Array {
  if (encoding === "hex") {
    const bytes = new Uint8Array(str.length / 2);
    for (let i = 0; i < str.length; i += 2) {
      bytes[i / 2] = parseInt(str.substr(i, 2), 16);
    }
    return bytes;
  }
  
  return new TextEncoder().encode(str);
}


