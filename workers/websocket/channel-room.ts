import type { Env } from '../services/db';

export class ChannelRoom {
  state: DurableObjectState;
  env: Env;
  sockets = new Set<WebSocket>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/publish' && request.method === 'POST') {
      const payload = await request.text();
      for (const socket of this.sockets) {
        socket.send(payload);
      }
      return new Response(null, { status: 204 });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    this.sockets.add(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    for (const socket of this.sockets) {
      if (socket !== ws) {
        socket.send(message);
      }
    }
  }

  webSocketClose(ws: WebSocket): void {
    this.sockets.delete(ws);
  }
}
