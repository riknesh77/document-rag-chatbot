import { getDb } from '../../lib/db';
import { HttpError, publicUser, getUser, hashPassword, verifyPassword, checkOrigin, rateLimit, createSession, logout, apiError } from '../../lib/auth';
import { seedDemo } from '../../lib/demo';
export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.json({ user: publicUserOrNull(await getUser(req)) });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Use GET or POST.' }); }
    checkOrigin(req);
    const { action, email, password, name } = req.body || {};
    if (action === 'logout') { await logout(req, res); return res.json({ ok: true }); }
    if (action === 'demo') {
      const existing = await getUser(req);
      if (existing) return res.json({ user: publicUser(existing) });
      await rateLimit(req, 'demo', 10);
      const user = await seedDemo();
      await createSession(req, res, user);
      return res.status(201).json({ user: publicUser(user) });
    }
    if (!['signup', 'login'].includes(action)) throw new HttpError(400, 'Choose signup or login.');
    await rateLimit(req, 'auth', 20, 900000);
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || password.length < 10 || password.length > 128) throw new HttpError(400, 'Enter a valid email and a password of 10–128 characters.');
    const normalizedEmail = email.trim().toLowerCase();
    let user;
    if (action === 'signup') {
      if (typeof name !== 'string' || !name.trim() || name.length > 80) throw new HttpError(400, 'Enter your name (up to 80 characters).');
      const passwordHash = await hashPassword(password);
      try { user = await getDb().user.create({ data: { email: normalizedEmail, name: name.trim(), passwordHash } }); }
      catch (error) { if (error.code === 'P2002') throw new HttpError(409, 'An account with that email already exists. Please sign in.'); throw error; }
    } else {
      user = await getDb().user.findUnique({ where: { email: normalizedEmail } });
      if (!await verifyPassword(password, user?.passwordHash) || user?.isDemo) throw new HttpError(401, 'Email or password is incorrect.');
    }
    await createSession(req, res, user);
    return res.status(action === 'signup' ? 201 : 200).json({ user: publicUser(user) });
  } catch (error) { return apiError(res, error); }
}
function publicUserOrNull(user) { return user ? publicUser(user) : null; }
