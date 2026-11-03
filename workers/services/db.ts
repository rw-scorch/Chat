export interface Env {
  DB: D1Database;
  NOVA_CHANNELS: DurableObjectNamespace;
  PRESENCE_KV: KVNamespace;
  MEDIA_BUCKET: R2Bucket;
  ALLOWED_ORIGIN?: string;
  TURN_URL?: string;
  TURN_USERNAME?: string;
  TURN_CREDENTIAL?: string;
}

export async function requireUserId(request: Request, db: D1Database): Promise<string | null> {
  const cookies = Object.fromEntries(
    (request.headers.get('cookie') ?? '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((pair) => {
        const [key, value] = pair.split('=');
        return [key, decodeURIComponent(value ?? '')];
      })
  );

  const sessionId = cookies.session_id;
  if (!sessionId) return null;

  const row = await db
    .prepare('SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime(\'now\')')
    .bind(sessionId)
    .first<{ user_id: string }>();

  return row?.user_id ?? null;
}
