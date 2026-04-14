'use client';

import { useMusicStore } from '@/store/musicStore';
import { joinSyncParty, leaveSyncParty, generatePartyCode } from '@/lib/syncService';
import { X, Users, Copy, CheckCircle2, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PartyModal() {
  const { showPartyModal, setShowPartyModal, partyId } = useMusicStore();
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!showPartyModal) return null;

  const handleCopy = async () => {
    if (partyId) {
      await navigator.clipboard.writeText(partyId);
      setCopied(true);
    }
  };

  const handleHost = () => {
    const code = generatePartyCode();
    joinSyncParty(code);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length > 0) {
      joinSyncParty(joinCode.trim().toUpperCase());
      setJoinCode('');
    }
  };

  const handleLeave = () => {
    leaveSyncParty();
  };

  return (
    <>
      <style>{`
        .party-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: partyFadeIn 0.2s ease-out;
        }
        .party-modal {
          background: var(--surface);
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          border-radius: 20px;
          width: 100%; max-width: 420px;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          animation: partyScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes partyFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes partyScaleIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
        .party-input {
          width: 100%;
          background: var(--surface2);
          border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
          color: var(--text);
          padding: 12px 16px;
          border-radius: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          text-align: center;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          outline: none;
          transition: all 0.2s;
        }
        .party-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 15%, transparent);
        }
      `}</style>

      <div className="party-overlay" onClick={() => setShowPartyModal(false)}>
        <div className="party-modal" onClick={e => e.stopPropagation()}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '24px 24px 16px',
            borderBottom: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
          }}>
            <h2 style={{
              margin: 0, fontFamily: 'Syne, sans-serif',
              fontWeight: 800, fontSize: 22, color: 'var(--text)',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <Users size={24} color="var(--accent)" />
              Listen Together
            </h2>
            <button
              onClick={() => setShowPartyModal(false)}
              style={{
                background: 'var(--surface2)', border: 'none',
                width: 32, height: 32, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-faint)', cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: 24 }}>
            {partyId ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontFamily: 'Epilogue, sans-serif', marginBottom: 24 }}>
                  You are currently in a listening party! Share this code with friends to sync playback.
                </p>
                <div style={{
                  background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  border: '1px dashed var(--accent)',
                  borderRadius: 16, padding: '24px',
                  marginBottom: 24,
                }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 32, fontWeight: 700, color: 'var(--accent)',
                    letterSpacing: '0.2em', marginBottom: 16,
                  }}>
                    {partyId}
                  </div>
                  <button
                    onClick={handleCopy}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      padding: '8px 16px', borderRadius: 99,
                      color: copied ? 'var(--accent)' : 'var(--text)',
                      fontFamily: 'Epilogue, sans-serif', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                <button
                  onClick={handleLeave}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 12,
                    background: 'color-mix(in srgb, var(--danger) 15%, transparent)',
                    color: 'var(--danger)', border: 'none',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <LogOut size={18} /> Leave Party
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', fontFamily: 'Epilogue, sans-serif', marginBottom: 24, lineHeight: 1.5 }}>
                  Host a party or join an existing one to sync your music playback with friends in real-time.
                </p>

                <button
                  onClick={handleHost}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 12,
                    background: 'var(--accent)', color: '#000', border: 'none',
                    fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16,
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 8px 24px color-mix(in srgb, var(--accent) 30%, transparent)',
                    marginBottom: 24,
                  }}
                >
                  Host New Party
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                  <span style={{ color: 'var(--text-faint)', fontSize: 12, fontFamily: 'Epilogue, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OR JOIN</span>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                </div>

                <form onSubmit={handleJoin} style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="text"
                    placeholder="ENTER 6-DIGIT CODE"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    className="party-input"
                    maxLength={6}
                    required
                  />
                  <button
                    type="submit"
                    disabled={joinCode.length < 3}
                    style={{
                      padding: '0 24px', borderRadius: 12,
                      background: 'var(--surface2)', color: 'var(--text)',
                      border: '1px solid var(--border)',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15,
                      cursor: joinCode.length < 3 ? 'not-allowed' : 'pointer',
                      opacity: joinCode.length < 3 ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    Join
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
