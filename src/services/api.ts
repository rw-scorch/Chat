import type { Channel, Message, ServerSummary, User } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<User | null>('/api/auth/me'),
  register: (username: string, password: string) =>
    request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  login: (username: string, password: string) =>
    request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  listServers: () => request<ServerSummary[]>('/api/servers'),
  createServer: (name: string) =>
    request<ServerSummary>('/api/servers', {
      method: 'POST',
      body: JSON.stringify({ name })
    }),
  listChannels: (serverId: string) => request<Channel[]>(`/api/servers/${serverId}/channels`),
  createChannel: (serverId: string, name: string) =>
    request<Channel>(`/api/servers/${serverId}/channels`, {
      method: 'POST',
      body: JSON.stringify({ name })
    }),
  listMessages: (channelId: string) => request<Message[]>(`/api/channels/${channelId}/messages`),
  sendMessage: (channelId: string, content: string) =>
    request<Message>(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content })
    })
};
