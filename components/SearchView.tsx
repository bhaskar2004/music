'use client';

import { useState, useRef, useEffect } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { Search, Download, CheckCircle, Music2 } from 'lucide-react';
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

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { processDownload } = useDownloadProcessor();
  const { downloads, library } = useMusicStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch results');
      }
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred during search');
    } finally {
      setIsSearching(false);
    }
  }

  function handleDownload(url: string) {
    if (library.some(t => t.sourceUrl === url)) {
      alert('This song is already in your library.');
      return;
    }
    processDownload(url, undefined);
  }

  return (
    <div style={{ padding: '40px 24px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 900, marginBottom: 12, letterSpacing: '-1.5px', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Discover Music
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
            Search millions of tracks from YouTube and add them effortlessly to your offline library.
          </p>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 16, marginBottom: 48, position: 'relative' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '0 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }} className="search-input-wrapper">
            <Search size={22} color="var(--text-faint)" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste a link or search for songs..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 17, padding: '20px 0', fontFamily: 'var(--font-sans)',
                fontWeight: 500,
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="tap-active"
            style={{
              padding: '0 32px', background: 'var(--accent)', color: '#000',
              border: 'none', borderRadius: '20px', fontWeight: 800,
              fontSize: 16, cursor: isSearching || !query.trim() ? 'not-allowed' : 'pointer',
              opacity: isSearching || !query.trim() ? 0.6 : 1, fontFamily: 'var(--font-sans)',
              boxShadow: '0 10px 20px var(--accent-glow)',
              transition: 'all 0.2s ease',
            }}
          >
            {isSearching ? <div className="spinner" style={{ width: 20, height: 20, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Search'}
          </button>
        </form>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: 32, textAlign: 'center', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', padding: '14px 20px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)', fontSize: 14, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {results.map((result) => {
            const isDownloading = downloads.some((d) => d.url === result.url && (d.status === 'pending' || d.status === 'downloading'));
            const isFinished = downloads.some((d) => d.url === result.url && d.status === 'done') || 
                              library.some((t) => t.sourceUrl === result.url);
            
            return (
              <div
                key={result.id}
                className="glass-panel"
                style={{
                  display: 'flex', alignItems: 'center', gap: 20, padding: 14,
                  borderRadius: '18px',
                  border: '1px solid var(--border)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--surface2)';
                  e.currentTarget.style.transform = 'translateX(8px)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div style={{ width: 72, height: 72, position: 'relative', borderRadius: 12, overflow: 'hidden', backgroundColor: 'var(--surface3)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {result.thumbnail ? (
                    <Image src={result.thumbnail} alt={result.title} fill style={{ objectFit: 'cover' }} unoptimized />
                  ) : (
                    <div className="music-icon-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music2 size={28} />
                    </div>
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-sans)' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4, letterSpacing: '-0.3px' }}>
                    {result.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                      {result.artist}
                    </span>
                    <span style={{ opacity: 0.3 }}>•</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{result.durationFormatted}</span>
                  </div>
                </div>

                <div style={{ paddingRight: 8 }}>
                  <button
                    onClick={() => handleDownload(result.url)}
                    disabled={isDownloading || isFinished}
                    className="tap-active"
                    style={{
                      background: isFinished ? 'var(--accent-dim)' : 'var(--surface3)',
                      color: isFinished ? 'var(--accent)' : 'var(--text)',
                      border: 'none', borderRadius: '14px', width: 44, height: 44,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: (isDownloading || isFinished) ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isFinished ? 'none' : '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    {isFinished ? (
                      <CheckCircle size={22} strokeWidth={2.5} />
                    ) : isDownloading ? (
                      <div className="spinner" style={{ width: 24, height: 24, border: '3px solid var(--surface2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1.2s linear infinite' }} />
                    ) : (
                      <Download size={20} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {!isSearching && results.length === 0 && !query && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 80 }}>
            <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', opacity: 0.5 }}>
              <Search size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Start Searching</h3>
            <p style={{ fontSize: 14, maxWidth: 300, margin: '0 auto' }}>Find your favorite tracks and download them for offline listening.</p>
          </div>
        )}

        {!isSearching && results.length === 0 && query && !error && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 80 }}>
             <p style={{ fontSize: 16 }}>No results found for &quot;{query}&quot;</p>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .search-input-wrapper:focus-within {
          border-color: var(--accent) !important;
          box-shadow: 0 12px 48px rgba(0,0,0,0.15), 0 0 0 4px color-mix(in srgb, var(--accent) 15%, transparent) !important;
          transform: translateY(-2px);
        }
      `}} />
    </div>
  );
}
