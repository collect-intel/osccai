"use server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const ANONYMOUS_ID_KEY = "anonymousId";

// Get the anonymous ID from the cookie
const cookieStore = cookies();
const anonymousId = cookieStore.get(ANONYMOUS_ID_KEY)?.value;

// If the cookie doesn't exist, create a new one
if (!anonymousId) {
  const newAnonymousId = uuidv4();
  cookieStore.set(ANONYMOUS_ID_KEY, newAnonymousId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

// Use the anonymousId for further operations
// ...