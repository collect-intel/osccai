'use server';
import { hash, compare } from "bcrypt";
import crypto from 'crypto';

const SALT_ROUNDS = 10;

export async function generateApiKey(prefix: string = 'sk'): Promise<{raw: string, hashed: string}> {
  // Generate a random API key
  const random = crypto.randomBytes(24).toString('hex');
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