import { timingSafeEqual } from "node:crypto";

export function testAccessAllowed(authorization: string | null, user?: string, password?: string): boolean {
  if (!user && !password) return true;
  if (!user || !password || !authorization || !/^Basic /i.test(authorization)) return false;
  try {
    const received = Buffer.from(authorization.slice(6), "base64");
    const expected = Buffer.from(`${user}:${password}`);
    return received.length === expected.length && timingSafeEqual(received, expected);
  } catch { return false; }
}
