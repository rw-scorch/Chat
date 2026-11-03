export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'invisible' | 'offline';

export interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  statusText: string | null;
  presence: PresenceStatus;
}

export interface ServerSummary {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  description: string | null;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  createdAt: string;
}
