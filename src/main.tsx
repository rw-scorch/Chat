import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, Gamepad2, Home, MessageSquare, Plus, User2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from './services/api';
import { applyMove, createBoard, getWinner, isDraw, type Board } from './games/tic-tac-toe/engine';
import type { Channel, Message, ServerSummary, User } from './types';
import './styles/index.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState('');
  const [view, setView] = useState<'chat' | 'game'>('chat');

  const [board, setBoard] = useState<Board>(createBoard());
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const winner = useMemo(() => getWinner(board), [board]);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.listServers().then((items) => {
      setServers(items);
      setSelectedServer(items[0]?.id ?? null);
    });
  }, [user]);

  useEffect(() => {
    if (!selectedServer) return;
    api.listChannels(selectedServer).then((items) => {
      setChannels(items);
      setSelectedChannel(items[0]?.id ?? null);
    });
  }, [selectedServer]);

  useEffect(() => {
    if (!selectedChannel) return;

    api.listMessages(selectedChannel).then(setMessages);
    const ws = new WebSocket(`${window.location.origin.replace('http', 'ws')}/ws/${selectedChannel}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as Message;
      setMessages((prev) => [...prev, data]);
    };

    return () => ws.close();
  }, [selectedChannel]);

  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center p-4">
        <section className="w-full max-w-md rounded-xl border border-white/10 bg-nova-panel p-6">
          <h1 className="mb-2 text-2xl font-bold">NOVA</h1>
          <p className="mb-6 text-sm text-slate-400">Secure social platform foundation for chat, calls, and games.</p>
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <input className="w-full rounded bg-black/30 p-3" placeholder="Username" value={authForm.username} onChange={(e) => setAuthForm((p) => ({ ...p, username: e.target.value }))} />
            <input className="w-full rounded bg-black/30 p-3" placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))} />
            <div className="flex gap-2">
              <button className="flex-1 rounded bg-nova-accent px-3 py-2" onClick={() => api.login(authForm.username, authForm.password).then(setUser)}>Login</button>
              <button className="flex-1 rounded border border-white/20 px-3 py-2" onClick={() => api.register(authForm.username, authForm.password).then(setUser)}>Register</button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  async function sendMessage() {
    if (!selectedChannel || !composer.trim()) return;
    const sent = await api.sendMessage(selectedChannel, composer.trim());
    setMessages((prev) => [...prev, sent]);
    setComposer('');
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-[#080a11] via-[#0d1220] to-[#111024] md:flex-row">
      <aside className="border-b border-white/10 bg-black/20 p-2 md:w-16 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 md:block">
          <div className="grid place-items-center rounded-xl bg-nova-accent/40 p-3"><Home size={18} /></div>
          <div className="flex flex-1 justify-around gap-1 md:mt-3 md:block md:space-y-2">
          {[Users, MessageSquare, Bell, Gamepad2, User2].map((Icon, i) => (
            <button key={i} aria-label={i === 3 ? 'Games' : 'Chat navigation'} className="rounded-lg bg-white/5 p-2 hover:bg-white/10 md:block md:w-full" onClick={() => setView(i === 3 ? 'game' : 'chat')}><Icon size={16} /></button>
          ))}
          </div>
        </div>
      </aside>

      <aside className="border-b border-white/10 bg-black/20 p-3 md:w-56 md:border-b-0 md:border-r">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Servers</h2><button onClick={async () => {
          const name = `Server ${servers.length + 1}`;
          const server = await api.createServer(name);
          setServers((prev) => [...prev, server]);
          setSelectedServer(server.id);
        }}><Plus size={16} /></button></div>
        <div className="space-y-1">
          {servers.map((server) => (
            <button key={server.id} className={`w-full rounded px-2 py-1 text-left ${selectedServer === server.id ? 'bg-nova-accent/40' : 'bg-white/5'}`} onClick={() => setSelectedServer(server.id)}>{server.name}</button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 flex-1 p-3 md:p-4">
        {view === 'chat' ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chat</h2>
              <button className="rounded border border-white/20 px-2 py-1" onClick={async () => {
                if (!selectedServer) return;
                const ch = await api.createChannel(selectedServer, `channel-${channels.length + 1}`);
                setChannels((prev) => [...prev, ch]);
                setSelectedChannel(ch.id);
              }}>Add Channel</button>
            </div>
            <div className="mb-2 flex gap-2 overflow-auto">
              {channels.map((channel) => (
                <button key={channel.id} className={`rounded px-2 py-1 text-sm ${selectedChannel === channel.id ? 'bg-nova-purple' : 'bg-white/10'}`} onClick={() => setSelectedChannel(channel.id)}>#{channel.name}</button>
              ))}
            </div>
            <div className="mb-3 h-[55vh] min-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3">
              {messages.map((message) => (
                <p key={message.id} className="mb-2 text-sm"><span className="text-cyan-300">{message.authorUsername}</span>: {message.content}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea aria-label="Message" className="h-12 min-w-0 flex-1 resize-none rounded bg-black/30 p-2" value={composer} onChange={(e) => setComposer(e.target.value)} onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }} />
              <button className="rounded bg-nova-accent px-4" onClick={() => void sendMessage()}>Send</button>
            </div>
          </>
        ) : (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h2 className="mb-2 text-lg font-semibold">Tic-Tac-Toe</h2>
            <p className="mb-2 text-sm text-slate-300">Turn: {turn} {winner ? `• Winner: ${winner}` : isDraw(board) ? '• Draw' : ''}</p>
            <div className="grid grid-cols-3 gap-2 max-w-56">
              {board.map((cell, index) => (
                <button key={index} className="h-16 rounded bg-white/10 text-xl" onClick={() => {
                  if (winner || cell) return;
                  const next = applyMove(board, index, turn);
                  if (next !== board) {
                    setBoard(next);
                    setTurn((t) => (t === 'X' ? 'O' : 'X'));
                  }
                }}>{cell ?? ''}</button>
              ))}
            </div>
            <button className="mt-3 rounded border border-white/20 px-2 py-1 text-sm" onClick={() => {
              setBoard(createBoard());
              setTurn('X');
            }}>Rematch</button>
          </motion.section>
        )}
      </section>

      <aside className="hidden w-56 border-l border-white/10 bg-black/20 p-3 lg:block">
        <h2 className="mb-3 text-sm font-semibold">Member Activity</h2>
        <div className="rounded bg-white/5 p-2 text-sm">
          <p>{user.username}</p>
          <p className="text-xs text-slate-400">{user.statusText ?? 'Online'}</p>
          <button className="mt-2 rounded border border-white/20 px-2 py-1 text-xs" onClick={() => api.logout().then(() => setUser(null))}>Logout</button>
        </div>
      </aside>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
