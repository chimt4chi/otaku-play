import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Send, 
  Copy, 
  Check, 
  X, 
  Crown, 
  LogOut, 
  Sparkles, 
  RotateCw, 
  ShieldCheck,
  Minimize2,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { ANIME_REACTIONS, watchPartyService } from '../services/watchPartyService';

export default function WatchPartyDrawer({
  isOpen,
  onClose,
  roomCode,
  isHost,
  members = [],
  messages = [],
  onSendMessage,
  onSendReaction,
  onLeaveParty,
  onRequestSync,
  hostName = 'Host'
}) {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const chatBottomRef = useRef(null);

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?party=${roomCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage?.(inputText.trim());
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <aside className="watch-party-drawer" aria-label="Watch Party Room">
      {/* Drawer Header */}
      <div className="party-drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="party-live-pulse" title="Room Active" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="party-room-badge" onClick={handleCopyInvite} title="Click to copy invite link">
                {roomCode}
                {copied ? <Check size={11} color="var(--accent-color)" /> : <Copy size={11} />}
              </span>
              {copied && <span className="copied-tag">Link Copied!</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            className={`party-members-btn ${showMembers ? 'active' : ''}`}
            onClick={() => setShowMembers(!showMembers)}
            title="View participants"
          >
            <Users size={14} />
            <span>{members.length}</span>
          </button>

          <button
            className="party-icon-btn"
            onClick={onClose}
            title="Minimize drawer"
            aria-label="Minimize drawer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Host / Sync Status Strip */}
      <div className="party-status-strip">
        {isHost ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: '#fbbf24' }}>
            <Crown size={14} />
            <span>You are Host • Friends are synced with you</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)' }} />
              <span>Synced with {hostName}</span>
            </div>
            <button
              className="party-sync-btn"
              onClick={onRequestSync}
              title="Resync video with host"
            >
              <RotateCw size={11} />
              <span>Resync</span>
            </button>
          </div>
        )}
      </div>

      {/* Slide-out Participant Roster Modal Overlay */}
      {showMembers && (
        <div className="party-members-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Room Participants ({members.length})
            </div>
            <button className="party-icon-btn" onClick={() => setShowMembers(false)} style={{ padding: '2px' }}>
              <X size={14} />
            </button>
          </div>

          <div className="party-members-list">
            {members.map(m => (
              <div key={m.id || m.username} className="party-member-row">
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: m.avatarColor || 'var(--accent-color)',
                    color: '#07080d',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: '0.75rem'
                  }}
                >
                  {(m.username[0] || 'O').toUpperCase()}
                </div>
                <span className="party-member-name" title={m.username}>{m.username}</span>
                {m.isHost && (
                  <span className="party-host-badge">
                    <Crown size={10} />
                    <span>Host</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            className="party-leave-btn"
            onClick={onLeaveParty}
            style={{ marginTop: '1rem', width: '100%' }}
          >
            <LogOut size={13} />
            <span>Leave Watch Party</span>
          </button>
        </div>
      )}

      {/* Live Chat Stream */}
      <div className="party-chat-stream">
        {messages.length === 0 && (
          <div className="party-empty-chat">
            <MessageSquare size={24} color="var(--text-dim)" />
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Watch Party Chat Ready!
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Share invite link to invite friends to watch together.
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="party-sys-msg">
                <span>{msg.text}</span>
              </div>
            );
          }

          const isMe = msg.senderId === watchPartyService.currentUser.id;

          return (
            <div key={msg.id} className={`party-chat-bubble ${isMe ? 'me' : ''}`}>
              <div className="party-bubble-head">
                <span
                  className="party-sender-pill"
                  style={{ color: msg.avatarColor || 'var(--accent-color)' }}
                >
                  {msg.senderName}
                </span>
                {msg.isHost && (
                  <span className="party-host-tag" title="Host">
                    <Crown size={9} />
                  </span>
                )}
                <span className="party-msg-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="party-bubble-text">
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Reaction Bar */}
      <div className="party-reaction-bar">
        {ANIME_REACTIONS.slice(0, 7).map(emoji => (
          <button
            key={emoji}
            type="button"
            className="party-reaction-btn"
            onClick={() => onSendReaction?.(emoji)}
            title={`Send ${emoji} reaction`}
          >
            <span>{emoji}</span>
          </button>
        ))}
      </div>

      {/* Chat Message Input */}
      <form className="party-input-bar" onSubmit={handleSend}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message to party..."
          maxLength={180}
        />
        <button
          type="submit"
          className="party-send-btn"
          disabled={!inputText.trim()}
          title="Send message"
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </form>
    </aside>
  );
}
