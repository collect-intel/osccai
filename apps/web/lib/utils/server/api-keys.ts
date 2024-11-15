'use server';
import { hash, compare } from "bcrypt";

function generateRandomString(length: number) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

const SALT_ROUNDS = 10;

export async function generateApiKey(prefix: string = 'sk'): Promise<{raw: string, hashed: string}> {
  // Generate a random API key
  const random = generateRandomString(24);
  const raw = `${prefix}_${random}`;
  
  // Hash the API key
  const hashed = await hash(raw, SALT_ROUNDS);
  
  return { raw, hashed };
}

export async function verifyApiKey(rawKey: string, hashedKey: string): Promise<boolean> {
  try {
    return await compare(rawKey, hashedKey);
  } catch (error) {
    console.error('Error verifying API key:', error);
    return false;
  }
} 