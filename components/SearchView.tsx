'use client';

import { useState, useRef, useEffect } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { Search, Download, CheckCircle, Music2, Play, CheckSquare, Square, DownloadCloud, X, Sparkles, TrendingUp } from 'lucide-react';
import { useDownloadProcessor } from '@/hooks/useDownloadProcessor';
import Image from 'next/image';

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  url: string;
}

const DISCOVERY_TAGS = [
  { label: '🔥 Trending', query: 'Top Hits Music 2026' },
  { label: '☕ Lofi Chill', query: 'Lofi hip hop beats to relax' },
  { label: '⚡ Synthwave', query: 'Synthwave retrowave electronic' },
  { label: '🎧 Deep House', query: 'Deep house vocal dance' },
  { label: '🎸 Rock Classics', query: 'Classic rock greatest hits' },
  { label: '🌿 Acoustic Folk', query: 'Acoustic indie folk songs' },
  { label: '🎹 Piano Focus', query: 'Peaceful piano instrumental focus' },
  { label: '🌃 Night Drive', query: 'Night drive synth electronic' },
];

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { processDownload, processBulkDownload } = useDownloadProcessor();
  const { downloads, library, setCurrentTrack, setIsPlaying, setQueue } = useMusicStore();

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setSelectedUrls(new Set());
    setSelectionMode(false);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch results');
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred during search');
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    performSearch(query);
  }

  function handleQuickSearch(tagQuery: string) {
    setQuery(tagQuery);
    performSearch(tagQuery);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setError(null);
    inputRef.current?.focus();
  }

  function handleDownload(url: string) {
    if (library.some(t => t.sourceUrl === url)) return;
    processDownload(url, undefined);
  }

  async function handleBulkDownload() {
    if (selectedUrls.size === 0) return;
    const urls = Array.from(selectedUrls);
    try {
      await processBulkDownload(urls);
      setSelectedUrls(new Set());
      setSelectionMode(false);
      // Optional: switch to downloads view
      useMusicStore.getState().setActiveView('downloads');
    } catch (err) {
      alert('Failed to start bulk download');
    }
  }

  function toggleSelect(url: string) {
    const next = new Set(selectedUrls);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelectedUrls(next);
    if (next.size > 0) setSelectionMode(true);
  }

  function selectAll() {
    const allUrls = results
      .filter(r => !library.some(t => t.sourceUrl === r.url))
      .map(r => r.url);
    setSelectedUrls(new Set(allUrls));
    setSelectionMode(true);
  }

  function handlePlay(result: SearchResult) {
    const ghostTrack = {
      id: `search-${result.id}`,
      title: result.title,
      artist: result.artist,
      album: 'YouTube Search',
      duration: result.duration,
      filename: '',
      coverUrl: result.thumbnail,
      sourceUrl: result.url,
      format: 'mp3',
      playlistIds: [],
    };
    setCurrentTrack(ghostTrack as any);
    setQueue([ghostTrack as any]);
    setIsPlaying(true);
  }

  return (
    <div style={{ padding: '40px 24px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 900, marginBottom: 12, letterSpacing: '-1.5px', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Discover Music
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
            Search millions of tracks and build your personal offline library.
          </p>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '0 20px',
            boxShadow: 'var(--card-shadow)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }} className="search-input-wrapper">
            <Search size={20} color="var(--text-faint)" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs, artists, or paste a link..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 16, padding: '18px 0', fontFamily: 'var(--font-sans)',
                fontWeight: 500,
              }}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'var(--surface2)', border: 'none', borderRadius: '50%',
                  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-faint)', cursor: 'pointer', transition: 'all 0.15s'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
            <kbd style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '2px 7px', fontSize: 11,
              fontFamily: 'var(--font-mono)', color: 'var(--text-faint)',
              userSelect: 'none',
            }}>
              /
            </kbd>
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="tap-active"
            style={{
              padding: '0 28px', background: 'var(--brand-gradient)', color: '#000',
              border: 'none', borderRadius: '20px', fontWeight: 800,
              fontSize: 15, cursor: 'pointer',
              boxShadow: '0 8px 24px var(--accent-glow)',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: !query.trim() && !isSearching ? 0.6 : 1,
            }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Discovery quick tags */}
        {results.length === 0 && !isSearching && (
          <div style={{ marginBottom: 36 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 14, fontSize: 12, fontWeight: 700,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', fontFamily: 'var(--font-mono)'
            }}>
              <Sparkles size={14} color="var(--accent)" />
              Quick Discovery & Vibes
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DISCOVERY_TAGS.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => handleQuickSearch(tag.query)}
                  className="tap-active"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 99,
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isSearching && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 86, borderRadius: 16, width: '100%' }} />
            ))}
          </div>
        )}

        {results.length > 0 && !isSearching && (
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            marginBottom: 20, padding: '0 8px' 
          }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => { setSelectionMode(!selectionMode); if(selectionMode) setSelectedUrls(new Set()); }}
                style={{ background: 'transparent', border: 'none', color: selectionMode ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {selectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
                {selectionMode ? 'Stop Selecting' : 'Select Tracks'}
              </button>
              {selectionMode && (
                <button 
                  onClick={selectAll}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Select All
                </button>
              )}
            </div>
            
            {(selectionMode && selectedUrls.size > 0) && (
              <button 
                onClick={handleBulkDownload}
                className="bouncy-hover"
                style={{ 
                  background: 'var(--brand-gradient)', color: '#000', border: 'none', 
                  borderRadius: 12, padding: '8px 16px', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--accent-glow)'
                }}
              >
                <DownloadCloud size={16} />
                Download ({selectedUrls.size})
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map((result) => {
            const isDownloading = downloads.some((d) => d.url === result.url && (d.status === 'pending' || d.status === 'downloading'));
            const isFinished = downloads.some((d) => d.url === result.url && d.status === 'done') || 
                               library.some((t) => t.sourceUrl === result.url);
            const isSelected = selectedUrls.has(result.url);
            
            return (
              <div
                key={`${result.id}-${result.url}`}
                className="glass-panel"
                onClick={() => selectionMode && toggleSelect(result.url)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: 12,
                  borderRadius: '16px', border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                  transition: 'all 0.2s', cursor: selectionMode ? 'pointer' : 'default',
                }}
              >
                {selectionMode && (
                  <div style={{ padding: '0 4px' }}>
                    {isSelected ? <CheckSquare size={20} color="var(--accent)" /> : <Square size={20} color="var(--text-faint)" />}
                  </div>
                )}

                <div style={{ width: 60, height: 60, position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--surface2)' }}>
                  <Image 
                    src={`/api/proxy/image?url=${encodeURIComponent(result.thumbnail)}`} 
                    alt={result.title} 
                    fill 
                    style={{ objectFit: 'cover' }} 
                    unoptimized 
                    className="image-fade-in"
                  />
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {result.title}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {result.artist} • {result.durationFormatted}
                  </div>
                </div>

                {!selectionMode && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handlePlay(result)} className="icon-btn-accent"><Play size={18} fill="currentColor" /></button>
                    <button 
                      onClick={() => handleDownload(result.url)} 
                      disabled={isFinished || isDownloading}
                      className="icon-btn"
                      style={{ color: isFinished ? 'var(--accent)' : 'inherit' }}
                    >
                      {isFinished ? <CheckCircle size={18} /> : isDownloading ? '...' : <Download size={18} />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .icon-btn, .icon-btn-accent {
          width: 40px; height: 40px; border-radius: 12px; border: none; 
          display: flex; alignItems: center; justifyContent: center; cursor: pointer;
          transition: transform 0.2s;
        }
        .icon-btn { background: var(--surface2); color: var(--text); }
        .icon-btn-accent { background: var(--accent); color: #000; }
        .icon-btn:hover, .icon-btn-accent:hover { transform: scale(1.05); }
      `}</style>
    </div>
  );
}
