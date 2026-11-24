import { Peer } from 'peerjs';

/**
 * OtakuPlay Watch Party Service
 * Real-time Peer-to-Peer WebRTC sync + BroadcastChannel multi-tab mesh
 */

// Preset avatars / cyberpunk neon colors
export const PARTY_COLORS = [
  '#35d5bf', // Cyber Teal
  '#a78bfa', // Neon Violet
  '#60a5fa', // Electric Blue
  '#fbbf24', // Solar Amber
  '#fb7185', // Crimson Rose
  '#34d399', // Emerald
  '#f43f5e', // Hot Pink
  '#818cf8', // Indigo
];

export const ANIME_REACTIONS = ['🔥', '😱', '😭', '⚡', '🍿', '💖', '🚀', '👑', '🎉', '🤯'];

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OTK-${code}`;
}

export function cleanRoomCode(input) {
  if (!input) return '';
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

class WatchPartyManager {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // For host: Map<peerId, DataConnection>
    this.hostConnection = null;   // For guest: DataConnection to host
    this.broadcastChannel = null;
    this.roomCode = null;
    this.isHost = false;
    this.currentUser = {
      id: null,
      username: 'Otaku Watcher',
      avatarColor: '#35d5bf'
    };
    this.members = [];
    this.listeners = new Map();
    this.lastSyncState = null;
    this.syncInterval = null;
    this.heartbeatTimer = null;
  }

  // Event Subscription
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(cb => {
        try { cb(payload); } catch (e) { console.warn(`Error in watchParty listener for ${event}:`, e); }
      });
    }
  }

  getPeerIdForRoom(roomCode) {
    const clean = cleanRoomCode(roomCode).replace(/-/g, '').toLowerCase();
    return `otk-${clean}`;
  }

  // 1. Host creates a new room
  async createRoom(username, anime, episode = 1, currentTime = 0, avatarColor = '#35d5bf', _attempt = 0) {
    this.leaveRoom();

    const code = generateRoomCode();
    this.roomCode = code;
    this.isHost = true;
    const hostPeerId = this.getPeerIdForRoom(code);

    this.currentUser = {
      id: hostPeerId,
      username: username || 'Party Host',
      avatarColor: avatarColor || PARTY_COLORS[0],
      isHost: true
    };

    this.members = [this.currentUser];
    this.emit('members', this.members);
    this.emit('status', { state: 'connecting', message: 'Creating Watch Party room...' });

    // Multi-tab channel fallback
    this.initBroadcastChannel(code);

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(hostPeerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          this.currentUser.id = id;
          this.emit('status', { state: 'connected', roomCode: code, isHost: true });

          // Initial sync state
          this.lastSyncState = {
            animeId: anime?.id,
            animeTitle: anime?.title?.english || anime?.title?.romaji || 'Anime',
            animeCover: anime?.coverImage?.large,
            episode,
            currentTime,
            isPlaying: true,
            updatedAt: Date.now()
          };

          // Host heartbeat to keep room members synced
          this.syncInterval = setInterval(() => {
            // Nothing to report while the app is backgrounded; saves battery and data
            if (this.lastSyncState && !(typeof document !== 'undefined' && document.hidden)) {
              this.broadcast({
                type: 'SYNC',
                payload: this.lastSyncState
              });
            }
          }, 3500);

          resolve({ roomCode: code, isHost: true });
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingGuestConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('[WatchParty] Host Peer error:', err);
          if (err.type === 'unavailable-id') {
            // Collision or lingering session; generate new code and retry
            if (_attempt >= 3) {
              this.leaveRoom();
              const failure = new Error('Could not reserve a room code, please try again');
              this.emit('error', failure.message);
              reject(failure);
              return;
            }
            this.leaveRoom();
            this.createRoom(username, anime, episode, currentTime, avatarColor, _attempt + 1)
              .then(resolve)
              .catch(reject);
          } else {
            this.emit('error', err.message || 'Connection error');
          }
        });

        this.peer.on('disconnected', () => {
          this.emit('status', { state: 'disconnected', message: 'Disconnected from signaling server' });
          // Existing guest connections survive; re-register with the signaling server so new guests can join
          try {
            if (this.peer && !this.peer.destroyed) this.peer.reconnect();
          } catch {
            // Peer already torn down
          }
        });

      } catch (err) {
        this.emit('error', err.message);
        reject(err);
      }
    });
  }

  // 2. Guest joins an existing room
  async joinRoom(roomCode, username, avatarColor = '#a78bfa') {
    this.leaveRoom();

    const cleanCode = cleanRoomCode(roomCode);
    if (!cleanCode) {
      throw new Error('Please enter a valid room code (e.g. OTK-7X9P)');
    }

    this.roomCode = cleanCode;
    this.isHost = false;
    const hostPeerId = this.getPeerIdForRoom(cleanCode);

    this.currentUser = {
      id: `guest-${Math.random().toString(36).substring(2, 9)}`,
      username: username || 'Anime Fan',
      avatarColor: avatarColor || PARTY_COLORS[1],
      isHost: false
    };

    this.emit('status', { state: 'connecting', message: `Connecting to room ${cleanCode}...` });
    this.initBroadcastChannel(cleanCode);

    return new Promise((resolve, reject) => {
      let resolved = false;

      // Timeout safety for joining
      const timeout = setTimeout(() => {
        if (!resolved) {
          // If PeerJS timed out but BroadcastChannel got response, that's fine
          if (this.hostConnection?.open) {
            resolved = true;
            resolve({ roomCode: cleanCode, isHost: false });
          } else {
            this.emit('error', `Could not find room ${cleanCode}. Please verify the host is online.`);
            reject(new Error(`Room ${cleanCode} not found or host is offline.`));
          }
        }
      }, 9000);

      try {
        this.peer = new Peer(null, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (guestId) => {
          this.currentUser.id = guestId;

          // Connect to Host peer
          const conn = this.peer.connect(hostPeerId, {
            reliable: true,
            metadata: { user: this.currentUser }
          });

          this.hostConnection = conn;

          conn.on('open', () => {
            clearTimeout(timeout);
            resolved = true;
            this.emit('status', { state: 'connected', roomCode: cleanCode, isHost: false });

            // Introduce guest to host
            conn.send({
              type: 'JOIN',
              payload: { user: this.currentUser }
            });

            resolve({ roomCode: cleanCode, isHost: false });
          });

          conn.on('data', (data) => {
            this.handleMessageFromHost(data);
          });

          conn.on('close', () => {
            this.emit('status', { state: 'disconnected', message: 'Host has closed the Watch Party.' });
            this.emit('chat', {
              id: `sys-${Date.now()}`,
              isSystem: true,
              text: 'Host has ended the Watch Party.'
            });
          });

          conn.on('error', (err) => {
            console.warn('[WatchParty] Connection to host error:', err);
            clearTimeout(timeout);
            if (!resolved) {
              reject(err);
            }
          });
        });

        this.peer.on('error', (err) => {
          console.warn('[WatchParty] Guest Peer error:', err);
          clearTimeout(timeout);
          if (!resolved) {
            reject(err);
          }
        });

      } catch (err) {
        clearTimeout(timeout);
        this.emit('error', err.message);
        reject(err);
      }
    });
  }

  // Handle incoming guest connections on Host
  handleIncomingGuestConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);

      // Send initial welcome & current playback sync
      if (this.lastSyncState) {
        conn.send({
          type: 'SYNC',
          payload: this.lastSyncState
        });
      }
    });

    conn.on('data', (data) => {
      if (!data || !data.type) return;

      switch (data.type) {
        case 'JOIN': {
          const guestUser = { ...data.payload.user, id: conn.peer };
          if (!this.members.some(m => m.id === guestUser.id)) {
            this.members.push(guestUser);
            this.broadcastMemberList();
            this.broadcastSystemMessage(`${guestUser.username} joined the party! 🎉`);
          }
          break;
        }

        case 'CHAT': {
          // Re-broadcast chat message to everyone
          this.broadcast(data);
          this.emit('chat', data.payload);
          break;
        }

        case 'REACTION': {
          // Re-broadcast reaction to everyone
          this.broadcast(data);
          this.emit('reaction', data.payload);
          break;
        }

        case 'REQUEST_SYNC': {
          if (this.lastSyncState) {
            conn.send({
              type: 'SYNC',
              payload: this.lastSyncState
            });
          }
          break;
        }

        default:
          break;
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      const departing = this.members.find(m => m.id === conn.peer);
      this.members = this.members.filter(m => m.id !== conn.peer);
      this.broadcastMemberList();
      if (departing) {
        this.broadcastSystemMessage(`${departing.username} left the party.`);
      }
    });
  }

  // Handle incoming messages on Guest
  handleMessageFromHost(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'SYNC':
        this.lastSyncState = data.payload;
        this.emit('sync', data.payload);
        break;

      case 'CHAT':
        this.emit('chat', data.payload);
        break;

      case 'REACTION':
        this.emit('reaction', data.payload);
        break;

      case 'MEMBERS':
        this.members = data.payload;
        this.emit('members', this.members);
        break;

      default:
        break;
    }
  }

  // Broadcast to all connected peers + local BroadcastChannel
  broadcast(data) {
    // 1. Send across WebRTC data connections
    if (this.isHost) {
      this.connections.forEach(conn => {
        if (conn.open) {
          try { conn.send(data); } catch (e) { }
        }
      });
    }

    // 2. Send across local BroadcastChannel
    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(data); } catch (e) { }
    }
  }

  broadcastMemberList() {
    this.broadcast({
      type: 'MEMBERS',
      payload: this.members
    });
    this.emit('members', this.members);
  }

  broadcastSystemMessage(text) {
    const msg = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      isSystem: true,
      text,
      timestamp: Date.now()
    };
    this.broadcast({
      type: 'CHAT',
      payload: msg
    });
    this.emit('chat', msg);
  }

  // Host Action: Broadcast Playback State Sync
  broadcastPlaybackState(anime, episode, currentTime, isPlaying = true) {
    if (!this.isHost || !this.roomCode) return;

    const state = {
      animeId: anime?.id,
      animeTitle: anime?.title?.english || anime?.title?.romaji || 'Anime',
      animeCover: anime?.coverImage?.large,
      episode: Number(episode) || 1,
      currentTime: Number(currentTime) || 0,
      isPlaying: Boolean(isPlaying),
      updatedAt: Date.now(),
      hostName: this.currentUser.username
    };

    this.lastSyncState = state;
    this.broadcast({
      type: 'SYNC',
      payload: state
    });
  }

  // Send a Live Chat Message (Host or Guest)
  sendChatMessage(text) {
    if (!text || !text.trim() || !this.roomCode) return;

    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderId: this.currentUser.id,
      senderName: this.currentUser.username,
      avatarColor: this.currentUser.avatarColor,
      isHost: this.isHost,
      text: text.trim(),
      timestamp: Date.now()
    };

    if (this.isHost) {
      this.broadcast({
        type: 'CHAT',
        payload: msg
      });
      this.emit('chat', msg);
    } else if (this.hostConnection?.open) {
      this.hostConnection.send({
        type: 'CHAT',
        payload: msg
      });
      this.emit('chat', msg);
    }
  }

  // Send Floating Anime Reaction
  sendReaction(emoji) {
    if (!emoji || !this.roomCode) return;

    const reaction = {
      id: `rx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      emoji,
      senderName: this.currentUser.username,
      avatarColor: this.currentUser.avatarColor
    };

    if (this.isHost) {
      this.broadcast({
        type: 'REACTION',
        payload: reaction
      });
      this.emit('reaction', reaction);
    } else if (this.hostConnection?.open) {
      this.hostConnection.send({
        type: 'REACTION',
        payload: reaction
      });
      this.emit('reaction', reaction);
    }
  }

  // Request Sync from Host (for guest manual sync)
  requestSync() {
    if (this.isHost || !this.hostConnection?.open) return;
    this.hostConnection.send({ type: 'REQUEST_SYNC' });
  }

  // Multi-tab BroadcastChannel for zero-latency local testing
  initBroadcastChannel(code) {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      if (this.broadcastChannel) this.broadcastChannel.close();
      this.broadcastChannel = new BroadcastChannel(`otaku_party_${code}`);

      this.broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (this.isHost) {
          if (data.type === 'JOIN') {
            const guest = data.payload.user;
            if (!this.members.some(m => m.id === guest.id)) {
              this.members.push(guest);
              this.broadcastMemberList();
              this.broadcastSystemMessage(`${guest.username} joined! 🎉`);
            }
          } else if (data.type === 'CHAT') {
            this.emit('chat', data.payload);
          } else if (data.type === 'REACTION') {
            this.emit('reaction', data.payload);
          }
        } else {
          // Guest receiving from local host tab
          this.handleMessageFromHost(data);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  // Leave / Disconnect from Party
  leaveRoom() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);

    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch (e) {}
      this.broadcastChannel = null;
    }

    if (this.hostConnection) {
      try { this.hostConnection.close(); } catch (e) {}
      this.hostConnection = null;
    }

    if (this.connections.size > 0) {
      this.connections.forEach(conn => {
        try { conn.close(); } catch (e) {}
      });
      this.connections.clear();
    }

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }

    const prevCode = this.roomCode;
    this.roomCode = null;
    this.isHost = false;
    this.members = [];
    this.lastSyncState = null;

    if (prevCode) {
      this.emit('status', { state: 'idle', message: 'Left Watch Party' });
      this.emit('members', []);
    }
  }

  isActive() {
    return Boolean(this.roomCode);
  }
}

export const watchPartyService = new WatchPartyManager();
