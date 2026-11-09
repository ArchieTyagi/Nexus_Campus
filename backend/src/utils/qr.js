import crypto from "crypto";
import { QR_SECONDS } from "../models/AttendanceSession.js";

// The QR holds "nexus:<sessionId>:<code>". The code is made from the session's secret
// and the current 30 second window, so it changes on its own and can't be guessed.
const windowAt = (time) => Math.floor(time / (QR_SECONDS * 1000));

const codeFor = (secret, sessionId, window) =>
  crypto.createHmac("sha256", secret).update(`${sessionId}:${window}`).digest("base64url").slice(0, 12);

export const currentQr = (secret, sessionId, now = Date.now()) => {
  const window = windowAt(now);
  const msLeft = (window + 1) * QR_SECONDS * 1000 - now;
  return { value: `nexus:${sessionId}:${codeFor(secret, sessionId, window)}`, secondsLeft: Math.ceil(msLeft / 1000) };
};

export const parseQr = (text) => {
  const match = /^nexus:([a-f0-9]{24}):([A-Za-z0-9_-]{12})$/.exec(String(text || "").trim());
  return match ? { sessionId: match[1], code: match[2] } : null;
};

// Accept this window and the one before, so a scan right as the code changes still works
export const isValidCode = (secret, sessionId, code, now = Date.now()) => {
  const window = windowAt(now);
  return [window, window - 1].some((w) =>
    crypto.timingSafeEqual(Buffer.from(codeFor(secret, sessionId, w)), Buffer.from(code))
  );
};
