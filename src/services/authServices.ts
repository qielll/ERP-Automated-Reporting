import { authenticate, getUserTag } from "./odooServices";

let cachedUid: number | null = null;
let lastAuthTime = 0;
let userCache = <string | null>null;

const EXPIRATION = 1000 * 60 * 60; // 60 minutes

export const getCachedUid = async (): Promise<number> => {
  const now = Date.now();

  //  return cached if still valid
  if (cachedUid && now - lastAuthTime < EXPIRATION) {
    return cachedUid;
  }

  //  re-authenticate
  const uid = await authenticate();

  cachedUid = uid;
  lastAuthTime = now;

  return uid;
};

export const getCachedUser = async (userInput: string): Promise<string | null> => {
  if (userCache != userInput) {
    userCache = await getUserTag(userInput);
    return userCache;
  }

  return userCache;
};
