/**
 * Encryption Utility - QAssure Platform
 * AES-256-GCM encryption for sensitive data at rest (API keys, secrets)
 * 
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 * Key: 32-byte hex string from ENCRYPTION_KEY env var
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * @returns {Buffer} 32-byte key
 */
function getEncryptionKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string
 * @param {string} plaintext - Value to encrypt
 * @returns {string} Encrypted string in format iv:authTag:ciphertext (all base64)
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedStr - Encrypted string in format iv:authTag:ciphertext
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedStr) {
  if (!encryptedStr || typeof encryptedStr !== 'string') {
    throw new Error('Encrypted string must be non-empty');
  }

  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected iv:authTag:ciphertext');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask an API key for display (show first 8 and last 4 chars)
 * @param {string} key - Raw API key
 * @returns {string} Masked key like "DPm2DIP2...T1NI"
 */
function maskApiKey(key) {
  if (!key || key.length < 16) return '****';
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
}

module.exports = { encrypt, decrypt, maskApiKey };