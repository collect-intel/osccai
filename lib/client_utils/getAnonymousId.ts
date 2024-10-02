import { v4 as uuidv4 } from 'uuid';

const ANONYMOUS_ID_KEY = 'anonymousId';

export function getAnonymousId(): string {
  if (typeof window === 'undefined') {
    throw new Error('This function should only be called on the client side');
  }

  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);

  if (!anonymousId) {
    anonymousId = uuidv4();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
    
    // Set a cookie as well, for server-side access if needed
    document.cookie = `${ANONYMOUS_ID_KEY}=${anonymousId}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }

  return anonymousId;
}