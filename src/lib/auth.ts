// Authentication utility
// Password hash (SHA-256) — the actual password is not stored here
const PASSWORD_HASH = "f3fc2f7af0e33a3ef10055dbbfc752d963eab4b095fea0e3a948b5f3ae042143";

const SESSION_KEY = "pdf-editor-auth";

/**
 * Hash a string with SHA-256 (browser-native)
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if the provided password matches
 */
export async function checkPassword(password: string): Promise<boolean> {
  const hash = await sha256(password);
  return hash === PASSWORD_HASH;
}

/**
 * Check if user is currently authenticated (session-based)
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

/**
 * Mark session as authenticated
 */
export function setAuthenticated(): void {
  sessionStorage.setItem(SESSION_KEY, "1");
}

/**
 * Logout
 */
export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
