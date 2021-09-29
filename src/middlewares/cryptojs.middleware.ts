import CryptoJS = require('crypto-js');

export function decrypt(encrypted: string, secretKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function encrypt(message: string, secretKey: string): string {
  return CryptoJS.AES.encrypt(message, secretKey).toString();
}
