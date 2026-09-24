'use client';

import { useMusicStore } from '@/store/musicStore';
import {
  joinSyncParty, leaveSyncParty, generatePartyCode,
  sendChatMessage, broadcastQueueAdd, sendMemberInfo,
  emitReaction, emitVote, emitRoomSettings,
  broadcastPlayback, getSocketId,
} from '@/lib/syncService';
import {
  Users, Plus, CheckCircle2, Copy, LogOut, Send,
  PlayCircle, Search, Library, Radio, ArrowRight,
  User, X, Shield, ChevronUp, Music2, Volume2,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { CoverImage } from './CoverImage';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDur = (s: number) => {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const COLORS = ['#16a34a', '#2563eb', '#9333ea', '#dc2626', '#d97706', '#0891b2'];

const memberColor = (name: string, fallback?: string) => {
  if (fallback) return fallback;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function PlayTogetherView() {
  const {
    partyId, partyMembersList, partyChatMessages,
    displayName, setDisplayName,
    currentTrack, isPlaying, queue, setActiveView,
    partyVotes, isHostOnly, liveReactions,
    setIsHostOnly, addLiveReaction,
    setCurrentTrack, setIsPlaying, setCurrentTime,
  } = useMusicStore();

  const isHost = partyMembersList.length > 0 && partyMembersList[0].socketId === getSocketId();

  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [votedTracks, setVotedTracks] = useState<Set<string>>(new Set());

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current && !isScrolledUp)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [partyChatMessages, isScrolledUp]);

  const onScroll = useCallback(() => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 60);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  /* ── Handlers ─────────────────────────────────────────────── */
  const copy = async () => {
    if (!partyId) return;
    try { await navigator.clipboard.writeText(partyId); } catch {
      const el = Object.assign(document.createElement('textarea'), { value: partyId });
      document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove();
    }
    setCopied(true);
  };

  const hostSession = () => {
    if (tempName.trim() && !displayName) setDisplayName(tempName.trim());
    joinSyncParty(generatePartyCode());
  };

  const joinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim() && !displayName) setDisplayName(tempName.trim());
    if (joinCode.trim()) { joinSyncParty(joinCode.trim().toUpperCase()); setJoinCode(''); }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) { sendChatMessage(chatInput.trim()); setChatInput(''); }
  };

  const saveName = () => {
    if (tempName.trim()) {
      setDisplayName(tempName.trim());
      if (partyId) { joinSyncParty(partyId); sendMemberInfo(tempName.trim()); }
    }
    setEditingName(false);
  };

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results?.slice(0, 5) || []);
    } finally { setIsSearching(false); }
  };

  const ghost = (r: any) => ({
    id: `party-${r.id}-${Date.now()}`, title: r.title, artist: r.artist,
    album: 'YouTube', duration: r.duration, filename: '',
    coverUrl: r.thumbnail, sourceUrl: r.url, format: 'mp3', playlistIds: [],
    addedAt: new Date().toISOString(),
    fileSize: 0,
  });

  const addTrack = (r: any) => {
    const t = ghost(r);
    useMusicStore.getState().addToQueue(t as any);
    broadcastQueueAdd(t);
    setAddedId(r.id);
    setTimeout(() => { setAddedId(null); setSearchQuery(''); setSearchResults([]); }, 1200);
  };

  const playNow = (r: any) => {
    const t = ghost(r);
    setCurrentTrack(t as any); setIsPlaying(true); setCurrentTime(0);
    broadcastPlayback('change_track', 0, t as any);
    setSearchQuery(''); setSearchResults([]);
  };

  const queuePlay = (t: any) => {
    setCurrentTrack(t); setIsPlaying(true); setCurrentTime(0);
    broadcastPlayback('change_track', 0, t);
  };

  const vote = (id: string) => {
    if (votedTracks.has(id)) return;
    emitVote(id);
    setVotedTracks(p => new Set(p).add(id));
  };

  const react = (type: string) => {
    emitReaction(type);
    addLiveReaction({ id: `${Date.now()}-${Math.random()}`, type, senderName: displayName });
  };

  const sortedQueue = [...queue].sort((a, b) => (partyVotes[b.id] || 0) - (partyVotes[a.id] || 0));

  /* ═══════════════════════════════════════════════════════════
     HUB
  ═══════════════════════════════════════════════════════════ */
  if (!partyId) return (
    <div style={s.wrap}>
      <div style={s.page}>

        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroInner}>
            <div style={s.heroIcon}><Radio size={20} strokeWidth={2} /></div>
            <div>
              <h1 style={s.heroTitle}>Listen Together</h1>
              <p style={s.heroSub}>Start a room, share the code, sync instantly.</p>
            </div>
          </div>

          <div style={s.nameRow}>
            <label style={s.label}>Your name</label>
            <input
              placeholder="Anonymous"
              value={displayName || tempName}
              onChange={e => setTempName(e.target.value)}
              onBlur={() => { if (tempName.trim()) setDisplayName(tempName.trim()); }}
              maxLength={20}
              style={{ ...s.input, maxWidth: 280 }}
            />
          </div>

          <button onClick={hostSession} style={s.primaryBtn}>
            <Plus size={15} /> Create session
          </button>
        </div>

        <div style={s.hubGrid}>
          {/* Join */}
          <div style={{ ...s.card, gridColumn: 'span 2' }}>
            <p style={s.cardTitle}>Join a session</p>
            <p style={s.cardSub}>Enter the 6-character room code to listen in sync.</p>
            <form onSubmit={joinSession} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                placeholder="ABC123"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ ...s.input, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.18em', flex: 1 }}
              />
              <button
                type="submit"
                disabled={joinCode.length < 3}
                style={{ ...s.primaryBtn, padding: '0 18px', opacity: joinCode.length < 3 ? 0.4 : 1, cursor: joinCode.length < 3 ? 'not-allowed' : 'pointer' }}
              >
                Join
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     ACTIVE PARTY
  ═══════════════════════════════════════════════════════════ */
  return (
    <div style={s.wrap}>
      <div style={s.page}>

        {/* Floating reactions */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
          {liveReactions.map(r => (
            <div key={r.id} className="sp-reaction" style={{ position: 'absolute', bottom: 80, left: `${20 + Math.random() * 60}%` }}>
              <span style={{ fontSize: 26 }}>{r.type === 'fire' ? '🔥' : r.type === 'heart' ? '❤️' : '⚡'}</span>
            </div>
          ))}
        </div>

        {/* ── Session bar ──────────────────────────────────── */}
        <div style={s.sessionBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={s.livePip} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={s.codeText}>{partyId}</span>
                <button onClick={copy} style={s.iconBtn} title="Copy code">
                  {copied ? <CheckCircle2 size={13} color="var(--accent)" /> : <Copy size={13} />}
                </button>
              </div>
              <p style={s.sessionMeta}>{partyMembersList.length} listener{partyMembersList.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Avatars */}
            <div style={{ display: 'flex' }}>
              {partyMembersList.slice(0, 5).map((m, i) => (
                <div key={m.socketId} title={m.displayName} style={{ ...s.avatar, background: memberColor(m.displayName, m.color), marginLeft: i === 0 ? 0 : -8, zIndex: 5 - i }}>
                  {m.displayName[0].toUpperCase()}
                </div>
              ))}
              {partyMembersList.length > 5 && (
                <div style={{ ...s.avatar, background: 'var(--surface2)', color: 'var(--text-muted)', marginLeft: -8 }}>
                  +{partyMembersList.length - 5}
                </div>
              )}
            </div>

            {/* Name */}
            {editingName ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} maxLength={20} onKeyDown={e => e.key === 'Enter' && saveName()} style={{ ...s.input, width: 130, padding: '6px 10px', fontSize: 13 }} />
                <button onClick={saveName} style={{ ...s.primaryBtn, padding: '6px 12px', fontSize: 12 }}>Save</button>
                <button onClick={() => setEditingName(false)} style={s.iconBtn}><X size={13} /></button>
              </div>
            ) : (
              <button onClick={() => { setTempName(displayName); setEditingName(true); }} style={s.namePill} title="Change name">
                <User size={12} color="var(--accent)" />
                {displayName || 'Anonymous'}
                {isHost && <span style={s.hostTag}>host</span>}
              </button>
            )}

            <button onClick={leaveSyncParty} style={s.leaveBtn}>
              <LogOut size={13} /> Leave
            </button>
          </div>
        </div>

        {/* ── Main grid ────────────────────────────────────── */}
        <div className="sp-grid">

          {/* LEFT — Chat */}
          <div style={s.panel}>
            {/* Messages */}
            <div style={s.messages} ref={chatRef} onScroll={onScroll}>
              {partyChatMessages.length === 0 ? (
                <div style={s.empty}>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--text-faint)' }}>No messages yet — say hi 👋</p>
                </div>
              ) : partyChatMessages.map(msg => {
                const own = msg.senderName === displayName;
                const member = partyMembersList.find(m => m.displayName === msg.senderName);
                const color = memberColor(msg.senderName || '?', member?.color);
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: own ? 'row-reverse' : 'row', gap: 8, marginBottom: 14, alignItems: 'flex-end' }}>
                    <div style={{ ...s.msgAvatar, background: color }}>{(msg.senderName || '?')[0].toUpperCase()}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start', gap: 3, maxWidth: '78%' }}>
                      <span style={s.msgMeta}>{own ? 'You' : msg.senderName}{msg.timestamp ? ` · ${fmt(msg.timestamp)}` : ''}</span>
                      <div style={own ? s.bubbleOwn : s.bubbleOther}>{msg.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {isScrolledUp && (
              <button onClick={() => { if (chatRef.current) { chatRef.current.scrollTop = chatRef.current.scrollHeight; setIsScrolledUp(false); } }} style={s.scrollPill}>
                ↓ new messages
              </button>
            )}

            <form onSubmit={sendChat} style={s.chatForm}>
              <input
                placeholder="Message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                maxLength={200}
                style={{ ...s.input, flex: 1 }}
              />
              <button type="submit" disabled={!chatInput.trim()} style={{ ...s.primaryBtn, padding: '0 16px', opacity: chatInput.trim() ? 1 : 0.4 }}>
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* RIGHT — Now playing + search + queue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Now playing */}
            {currentTrack && (
              <div style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <span style={s.livePip} />
                  <span style={s.sectionLabel}>Now playing</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={s.thumb}>
                    <CoverImage
                      coverUrl={currentTrack.coverUrl}
                      sourceUrl={currentTrack.sourceUrl}
                      title={currentTrack.title}
                      fallbackFontSize={16}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.trackTitle}>{currentTrack.title}</p>
                    <p style={s.trackArtist}>{currentTrack.artist}</p>
                  </div>
                  {/* EQ bars */}
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 18, flexShrink: 0 }}>
                    {[0.5, 1, 0.35, 0.7, 0.5].map((h, i) => (
                      <span key={i} style={{ display: 'block', width: 3, borderRadius: 2, background: 'var(--accent)', height: `${h * 18}px`, animation: 'eq .7s ease-in-out infinite alternate', animationDelay: `${i * .12}s`, animationPlayState: isPlaying ? 'running' : 'paused', transformOrigin: 'bottom' }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div style={s.card}>
              <form onSubmit={doSearch} style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
                  <input
                    placeholder="Add to queue..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ ...s.input, paddingLeft: 30, width: '100%', boxSizing: 'border-box' as const }}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="submit" disabled={!searchQuery.trim() || isSearching} style={{ ...s.primaryBtn, padding: '0 14px', opacity: searchQuery.trim() ? 1 : 0.4 }}>
                  {isSearching ? '...' : <Search size={14} />}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {searchResults.map((r, i) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                      <div style={{ ...s.thumb, width: 36, height: 36, borderRadius: 6, cursor: 'pointer', flexShrink: 0 }} onClick={() => playNow(r)}>
                        <Image src={`/api/proxy/image?url=${encodeURIComponent(r.thumbnail)}`} alt="" fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => playNow(r)}>
                        <p style={{ ...s.trackTitle, fontSize: 13 }}>{r.title}</p>
                        <p style={{ ...s.trackArtist, fontSize: 12 }}>{r.artist} · {fmtDur(r.duration)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => playNow(r)} style={s.ghostBtn}>Play</button>
                        <button onClick={() => addTrack(r)} disabled={addedId === r.id} style={{ ...s.ghostBtn, color: addedId === r.id ? 'var(--accent)' : undefined }}>
                          {addedId === r.id ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Queue header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={s.sectionLabel}>Up next</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isHost && (
                  <button onClick={() => { const next = !isHostOnly; setIsHostOnly(next); emitRoomSettings(next, 'default'); }} style={{ ...s.ghostBtn, color: isHostOnly ? 'var(--accent)' : undefined, borderColor: isHostOnly ? 'var(--accent)' : undefined }}>
                    <Shield size={12} /> {isHostOnly ? 'Locked' : 'Lock'}
                  </button>
                )}
                <button onClick={() => setActiveView('queue')} style={s.ghostBtn}>
                  All <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Queue list */}
            {sortedQueue.length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center' as const, padding: '28px 20px' }}>
                <Volume2 size={18} style={{ color: 'var(--text-faint)', marginBottom: 6 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)' }}>Queue is empty</p>
              </div>
            ) : (
              <div style={s.card}>
                {sortedQueue.slice(0, 8).map((t, i) => {
                  const votes = partyVotes[t.id] || 0;
                  const voted = votedTracks.has(t.id);
                  const isLast = i === Math.min(sortedQueue.length, 8) - 1;
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 16, textAlign: 'center' as const, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ ...s.thumb, width: 38, height: 38, borderRadius: 6, flexShrink: 0, cursor: 'pointer' }} onClick={() => queuePlay(t)}>
                        <CoverImage
                          coverUrl={t.coverUrl}
                          sourceUrl={t.sourceUrl}
                          title={t.title}
                          fallbackFontSize={14}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...s.trackTitle, fontSize: 13 }}>{t.title}</p>
                        <p style={{ ...s.trackArtist, fontSize: 12 }}>{t.artist}</p>
                      </div>
                      {t.duration && <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{fmtDur(t.duration)}</span>}
                      <button
                        onClick={() => vote(t.id)}
                        disabled={voted}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: 'none', border: `1px solid ${voted ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, padding: '4px 7px', cursor: voted ? 'default' : 'pointer', flexShrink: 0, transition: 'border-color .15s' }}
                      >
                        <ChevronUp size={11} color={voted ? 'var(--accent)' : 'var(--text-faint)'} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: voted ? 'var(--accent)' : 'var(--text-faint)' }}>{votes}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes eq {
          0%,100% { transform: scaleY(1); }
          50%      { transform: scaleY(.25); }
        }
        @keyframes pip {
          0%,100% { opacity: 1; }
          50%      { opacity: .3; }
        }
        @keyframes rise {
          0%   { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-160px); opacity: 0; }
        }
        .sp-reaction { animation: rise 2.4s ease-out forwards; }
        .sp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 860px) {
          .sp-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  wrap: { flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', paddingBottom: 120 },
  page: { display: 'flex', flexDirection: 'column', gap: 16, padding: '28px 24px', maxWidth: 1160, margin: '0 auto', width: '100%' },

  /* Shared */
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' },
  panel: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', flexDirection: 'column', minHeight: 520, overflow: 'hidden', position: 'relative' },

  input: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px', borderRadius: 9, fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },

  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', transition: 'opacity .15s', flexShrink: 0 },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', transition: 'border-color .15s', flexShrink: 0 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4 },

  /* Hub */
  hero: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 18 },
  heroInner: { display: 'flex', alignItems: 'center', gap: 14 },
  heroIcon: { width: 40, height: 40, borderRadius: 10, background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroTitle: { fontFamily: 'var(--font-display, sans-serif)', fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.4px' },
  heroSub: { fontSize: 14, color: 'var(--text-muted)', margin: 0, marginTop: 2 },
  nameRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-faint)' },
  hubGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  cardTitle: { fontFamily: 'var(--font-display, sans-serif)', fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: 0 },
  cardSub: { fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' },

  /* Session bar */
  sessionBar: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  livePip: { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: 'pip 2s ease-in-out infinite', flexShrink: 0 },
  codeText: { fontFamily: 'var(--font-mono, monospace)', fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.18em' },
  sessionMeta: { fontSize: 11, color: 'var(--text-faint)', margin: '2px 0 0', fontWeight: 500 },
  avatar: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', border: '2px solid var(--surface)', position: 'relative' },
  namePill: { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 99, padding: '5px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' },
  hostTag: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', padding: '2px 6px', borderRadius: 99 },
  leaveBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid color-mix(in srgb, #ef4444 40%, transparent)', color: '#ef4444', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },

  /* Chat */
  reactStrip: { display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid var(--border)' },
  reactBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', transition: 'border-color .15s' },
  messages: { flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column' },
  empty: { display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgAvatar: { width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 },
  msgMeta: { fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 },
  bubbleOther: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '3px 12px 12px 12px', padding: '8px 13px', fontSize: 14, color: 'var(--text)', lineHeight: 1.45 },
  bubbleOwn: { background: 'var(--accent)', borderRadius: '12px 3px 12px 12px', padding: '8px 13px', fontSize: 14, color: '#000', lineHeight: 1.45, fontWeight: 500 },
  scrollPill: { position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', zIndex: 10 },
  chatForm: { display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)' },

  /* Tracks */
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-faint)' },
  thumb: { position: 'relative', overflow: 'hidden', borderRadius: 8, width: 46, height: 46 },
  thumbEmpty: { width: '100%', height: '100%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' },
  trackTitle: { fontWeight: 600, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, marginBottom: 2 },
  trackArtist: { fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 },
};