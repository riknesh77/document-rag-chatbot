const { randomBytes, createHash, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { getDb } = require('./db');
const derive = promisify(scrypt);
const COOKIE = 'briefproof_session';
const publicUser = user => ({ id: user.id, name: user.name, email: user.isDemo ? null : user.email, isDemo: user.isDemo });
const tokenHash = token => createHash('sha256').update(token).digest('hex');
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `${salt}:${key.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  // Always perform the same expensive derivation, even for an unknown email.
  const [salt, hex] = stored?.split(':') || ['00000000000000000000000000000000', '00'.repeat(64)];
  const actual = await derive(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected) && !!stored;
}
function readToken(req) {
  const match = (req.headers?.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='));
  const token = match?.slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(token || '') ? token : null;
}
function cookie(value, seconds) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
async function getUser(req) {
  const token = readToken(req);
  if (!token) return null;
  const session = await getDb().session.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } });
  return session && session.expiresAt > new Date() ? session.user : null;
}
async function requireUser(req) {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, 'Please sign in to access your workspace.');
  return user;
}
function checkOrigin(req) {
  if (req.headers?.origin) {
    try { if (new URL(req.headers.origin).host === req.headers.host) return; } catch { /* reject malformed origins */ }
    throw new HttpError(403, 'This request must come from BriefProof.');
  }
  if (req.headers?.['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'This request must come from BriefProof.');
}
async function rateLimit(req, scope, maximum, windowMs = 3600000) {
  const ip = process.env.VERCEL ? req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for']?.split(',')[0] : req.socket?.remoteAddress;
  const key = `${scope}:${tokenHash(String(ip || 'unknown'))}:${Math.floor(Date.now() / windowMs)}`;
  const row = await getDb().rateLimit.upsert({ where: { key }, create: { key, expiresAt: new Date(Date.now() + windowMs) }, update: { count: { increment: 1 } } });
  if (row.count > maximum) throw new HttpError(429, 'Too many requests. Please try again later.');
}
async function createSession(req, res, user) {
  const old = readToken(req);
  if (old) await getDb().session.deleteMany({ where: { tokenHash: tokenHash(old) } });
  const token = randomBytes(32).toString('hex');
  const seconds = user.isDemo ? 86400 : 604800;
  await getDb().session.create({ data: { tokenHash: tokenHash(token), userId: user.id, expiresAt: new Date(Date.now() + seconds * 1000) } });
  res.setHeader('Set-Cookie', cookie(token, seconds));
}
async function logout(req, res) {
  const token = readToken(req);
  if (token) await getDb().session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  res.setHeader('Set-Cookie', cookie('', 0));
}
function apiError(res, error) {
  return res.status(error instanceof HttpError ? error.status : 503).json({ error: error instanceof HttpError ? error.message : 'The service is temporarily unavailable. Please retry.' });
}
async function protectPage(context) {
  const user = await getUser(context.req);
  return user ? { props: {} } : { redirect: { destination: '/auth', permanent: false } };
}
module.exports = { HttpError, publicUser, hashPassword, verifyPassword, requireUser, getUser, checkOrigin, rateLimit, createSession, logout, apiError, protectPage, tokenHash };
