import { Hono } from 'hono';
import type { Env } from '../services/db';
import { requireUserId } from '../services/db';
import { hashPassword, randomId, verifyPassword } from '../services/security';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const origin = c.req.header('origin');
  const allowed = c.env.ALLOWED_ORIGIN || '*';
  c.header('Access-Control-Allow-Origin', allowed === '*' ? origin ?? '*' : allowed);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Headers', 'content-type');
  c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  await next();
});

app.get('/api/health', (c) => c.json({ ok: true, service: 'nova-api' }));

app.post('/api/auth/register', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>();
  const username = body.username?.trim();
  const password = body.password ?? '';
  if (!username || username.length < 3 || password.length < 8) {
    return c.text('username and password must be valid', 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) return c.text('username already exists', 409);

  const userId = randomId();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(
      userId,
      username,
      passwordHash,
      now,
      now
    ),
    c.env.DB.prepare('INSERT INTO user_profiles (user_id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)').bind(
      userId,
      username,
      now,
      now
    )
  ]);

  const sessionId = randomId();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(sessionId, userId, expiresAt, now).run();

  c.header('Set-Cookie', `session_id=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=1209600`);
  return c.json({ id: userId, username, avatarUrl: null, bio: null, statusText: null, presence: 'online' });
});

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>();
  const username = body.username?.trim();
  const password = body.password ?? '';
  if (!username || !password) return c.text('invalid credentials', 400);

  const user = await c.env.DB.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').bind(username).first<{
    id: string;
    username: string;
    password_hash: string;
  }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.text('invalid credentials', 401);
  }

  const now = new Date().toISOString();
  const sessionId = randomId();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(sessionId, user.id, expiresAt, now).run();

  c.header('Set-Cookie', `session_id=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=1209600`);
  return c.json({ id: user.id, username: user.username, avatarUrl: null, bio: null, statusText: null, presence: 'online' });
});

app.post('/api/auth/logout', async (c) => {
  const cookie = c.req.header('cookie') ?? '';
  const session = cookie
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('session_id='))
    ?.split('=')[1];

  if (session) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(decodeURIComponent(session)).run();
  }

  c.header('Set-Cookie', 'session_id=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
  return c.body(null, 204);
});

app.get('/api/auth/me', async (c) => {
  const userId = await requireUserId(c.req.raw, c.env.DB);
  if (!userId) return c.json(null);

  const user = await c.env.DB.prepare('SELECT id, username FROM users WHERE id = ?').bind(userId).first<{ id: string; username: string }>();
  if (!user) return c.json(null);

  return c.json({ id: user.id, username: user.username, avatarUrl: null, bio: null, statusText: null, presence: 'online' });
});

app.get('/api/servers', async (c) => {
  const userId = await requireUserId(c.req.raw, c.env.DB);
  if (!userId) return c.text('unauthorized', 401);

  const rows = await c.env.DB.prepare(
    `SELECT s.id, s.name, s.icon_url AS iconUrl
     FROM servers s
     JOIN server_members sm ON sm.server_id = s.id
     WHERE sm.user_id = ?
     ORDER BY s.created_at DESC`
  )
    .bind(userId)
    .all();

  return c.json(rows.results);
});

app.post('/api/servers', async (c) => {
  const userId = await requireUserId(c.req.raw, c.env.DB);
  if (!userId) return c.text('unauthorized', 401);

  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name || name.length < 2) return c.text('invalid server name', 400);

  const serverId = randomId();
  const now = new Date().toISOString();

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO servers (id, owner_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(
      serverId,
      userId,
      name,
      now,
      now
    ),
    c.env.DB.prepare('INSERT INTO server_members (server_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').bind(serverId, userId, 'owner', now),
    c.env.DB.prepare('INSERT INTO channels (id, server_id, type, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(
      randomId(),
      serverId,
      'text',
      'general',
      userId,
      now,
      now
    )
  ]);

  return c.json({ id: serverId, name, iconUrl: null });
});

app.get('/api/servers/:serverId/channels', async (c) => {
  const userId = await requireUserId(c.req.raw, c.env.DB);
  if (!userId) return c.text('unauthorized', 401);

  const serverId = c.req.param('serverId');
  const member = await c.env.DB.prepare('SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?').bind(serverId, userId).first();
  if (!member) return c.text('forbidden', 403);

  const rows = await c.env.DB.prepare(
    'SELECT id, server_id AS serverId, name, description FROM channels WHERE server_id = ? AND type = ? ORDER BY position ASC, created_at ASC'
  )
    .bind(serverId, 'text')
    .all();

  return c.json(rows.results);
});

app.post('/api/servers/:serverId/channels', async (c) => {
  const userId = await requireUserId(c.req.raw, c.env.DB);
  if (!userId) return c.text('unauthorized', 401);

  const serverId = c.req.param('serverId');
  const member = await c.env.DB.prepare('SELECT role FROM server_members WHERE server_id = ? AND user_id = ?').bind(serverId, userId).first<{ role: string }>();
  if (!member) return c.text('forbidden', 403);

  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name || name.length < 2) return c.text('invalid channel name', 400);

  const channelId = randomId();
  const now = new Date().toISOString();
  const highest = await c.env.DB.prepare('SELECT COALESCE(MAX(position), 0) AS maxPosition FROM channels WHERE server_id = ?').bind(serverId).first<{ maxPosition: number }>();

  await c.env.DB.prepare(
    'INSERT INTO channels (id, server_id, type, name, created_by, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(channelId, serverId, 'text', name, userId, (highest?.maxPosition ?? 0) + 1, now, now)
    .run();

  return c.json({ id: channelId, serverId, name, description: null });
});

app.get('/api/channels/:channelId/messages', async (c) => {
  const userId = await requireUserId(c.req.raw, c.env.DB);
  if (!userId) return c.text('unauthorized', 401);

  const channelId = c.req.param('channelId');
  const access = await c.env.DB.prepare(
    `SELECT 1
     FROM channels ch
     JOIN server_members sm ON sm.server_id = ch.server_id
     WHERE ch.id = ? AND sm.user_id = ?`
  ).bind(channelId, userId).first();

  if (!access) return c.text('forbidden', 403);

  const rows = await c.env.DB.prepare(
    `SELECT m.id, m.channel_id AS channelId, m.author_id AS authorId, u.username AS authorUsername, m.content, m.created_at AS createdAt
     FROM messages m
     JOIN users u ON u.id = m.author_id
     WHERE m.channel_id = ?
     ORDER BY m.created_at ASC
     LIMIT 100`
  )
    .bind(channelId)
    .all();

  return c.json(rows.results);
});

app.post('/api/channels/:channelId/messages', async (c) => {
  const userId = await requireUserId(c.req.raw, c.env.DB);
  if (!userId) return c.text('unauthorized', 401);

  const channelId = c.req.param('channelId');
  const body = await c.req.json<{ content?: string }>();
  const content = body.content?.trim() ?? '';
  if (content.length < 1 || content.length > 2000) return c.text('invalid message length', 400);

  const access = await c.env.DB.prepare(
    `SELECT 1
     FROM channels ch
     JOIN server_members sm ON sm.server_id = ch.server_id
     WHERE ch.id = ? AND sm.user_id = ?`
  ).bind(channelId, userId).first();

  if (!access) return c.text('forbidden', 403);

  const messageId = randomId();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'INSERT INTO messages (id, channel_id, author_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(messageId, channelId, userId, content, now, now)
    .run();

  const message = await c.env.DB.prepare(
    `SELECT m.id, m.channel_id AS channelId, m.author_id AS authorId, u.username AS authorUsername, m.content, m.created_at AS createdAt
     FROM messages m
     JOIN users u ON u.id = m.author_id
     WHERE m.id = ?`
  )
    .bind(messageId)
    .first();

  const roomId = c.env.NOVA_CHANNELS.idFromName(`channel:${channelId}`);
  const roomStub = c.env.NOVA_CHANNELS.get(roomId);
  await roomStub.fetch(new Request('https://nova.internal/publish', { method: 'POST', body: JSON.stringify(message) }));

  return c.json(message);
});

app.all('/ws/:channelId', async (c) => {
  const userId = await requireUserId(c.req.raw, c.env.DB);
  if (!userId) return c.text('unauthorized', 401);

  const channelId = c.req.param('channelId');
  const access = await c.env.DB.prepare(
    `SELECT 1
     FROM channels ch
     JOIN server_members sm ON sm.server_id = ch.server_id
     WHERE ch.id = ? AND sm.user_id = ?`
  ).bind(channelId, userId).first();

  if (!access) return c.text('forbidden', 403);

  const roomId = c.env.NOVA_CHANNELS.idFromName(`channel:${channelId}`);
  const roomStub = c.env.NOVA_CHANNELS.get(roomId);
  return roomStub.fetch(c.req.raw);
});

export default app;
