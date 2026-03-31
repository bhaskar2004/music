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
  const { downloads } = useMusicStore();

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
    // We treat the current active playlist as "none" to mimic direct download 
    // unless they choose a folder globally. We'll default to 'none' here.
    processDownload(url, undefined);
  }

  return (
    <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: '-1px' }}>
          Search & Download
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', marginBottom: 24 }}>
          Find music directly from YouTube and add it to your library offline.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '0 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.2s',
          }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for songs, artists, or albums..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 16, padding: '16px 0', fontFamily: 'var(--font-sans)'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="tap-active"
            style={{
              padding: '0 24px', background: 'var(--brand-gradient)', color: '#000',
              border: 'none', borderRadius: 'var(--radius)', fontWeight: 800,
              fontSize: 15, cursor: isSearching || !query.trim() ? 'not-allowed' : 'pointer',
              opacity: isSearching || !query.trim() ? 0.6 : 1, fontFamily: 'var(--font-sans)'
            }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: 24, textAlign: 'center', background: 'rgba(255,59,48,0.1)', padding: 12, borderRadius: 8 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map((result) => {
            const isDownloading = downloads.some((d) => d.url === result.url && (d.status === 'pending' || d.status === 'downloading'));
            const isFinished = downloads.some((d) => d.url === result.url && d.status === 'done');
            
            return (
              <div
                key={result.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: 12,
                  background: 'var(--surface)', borderRadius: '12px',
                  border: '1px solid var(--border)',
                  transition: 'transform 0.2s, background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <div style={{ width: 64, height: 64, position: 'relative', borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--surface3)' }}>
                  {result.thumbnail ? (
                    <Image src={result.thumbnail} alt={result.title} fill style={{ objectFit: 'cover' }} unoptimized />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music2 size={24} color="var(--text-faint)" />
                    </div>
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-sans)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                    {result.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                      {result.artist}
                    </span>
                    <span>•</span>
                    <span>{result.durationFormatted}</span>
                  </div>
                </div>

                <div style={{ paddingRight: 8 }}>
                  <button
                    onClick={() => handleDownload(result.url)}
                    disabled={isDownloading || isFinished}
                    className="tap-active"
                    style={{
                      background: isFinished ? 'rgba(6, 193, 103, 0.1)' : 'var(--surface3)',
                      color: isFinished ? 'var(--accent)' : 'var(--text)',
                      border: 'none', borderRadius: '50%', width: 40, height: 40,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: (isDownloading || isFinished) ? 'default' : 'pointer',
                    }}
                  >
                    {isFinished ? (
                      <CheckCircle size={20} color="var(--accent)" />
                    ) : isDownloading ? (
                      <div className="spinner" style={{ width: 18, height: 18, border: '2px solid var(--text-faint)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Download size={18} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {!isSearching && results.length === 0 && query && !error && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
            No results found for &quot;{query}&quot;
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
