import { v4 as uuidv4 } from "uuid";

const ANONYMOUS_ID_KEY = "anonymousId";

export function getAnonymousId(): string {
  if (typeof window === "undefined") {
    throw new Error("This function should only be called on the client side");
  }

  // First check URL for PARTICIPANT_ID
  const urlParams = new URLSearchParams(window.location.search);
  const participantId = urlParams.get("PARTICIPANT_ID");

  // If we have a participant ID from URL, use and store it
  if (participantId) {
    localStorage.setItem(ANONYMOUS_ID_KEY, participantId);
    document.cookie = `${ANONYMOUS_ID_KEY}=${participantId}; path=/; max-age=${60 * 60 * 24 * 365}`;
    return participantId;
  }

  // Otherwise, proceed with existing UUID logic
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);

  if (!anonymousId) {
    anonymousId = uuidv4();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
    document.cookie = `${ANONYMOUS_ID_KEY}=${anonymousId}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }

  return anonymousId;
}
