import app from './api/index';
import { ChannelRoom } from './websocket/channel-room';
import type { Env } from './services/db';

export default {
  fetch: app.fetch
};

export { ChannelRoom };
export type { Env };
