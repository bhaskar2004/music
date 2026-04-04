'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <span className="landing-logo-text">Wavelength</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#how" className="landing-nav-link">How it works</a>
            <Link href="/player" className="landing-cta-nav">
              Open App →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div
          className="landing-hero-bg"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
        <div className="landing-hero-content" style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            Free &amp; Open Source
          </div>
          <h1 className="landing-h1">
            Your music.<br />
            <span className="landing-h1-accent">Your rules.</span>
          </h1>
          <p className="landing-subtitle">
            Download from YouTube, SoundCloud &amp; more. Build your personal library.
            No ads, no subscriptions, no compromises.
          </p>
          <div className="landing-hero-actions">
            <Link href="/player" className="landing-cta-primary">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Launch Wavelength
            </Link>
            <a
              href="https://github.com/bhaskar2004/music/actions/runs/23938991850/artifacts/6256729553"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-cta-secondary"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 2v2" /><path d="M7 22v-3" /><path d="M17 22v-3" /><path d="M12 12v4" /><path d="M11 2v2" /><path d="M5 10a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V10Z" /><path d="M9 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /><path d="M15 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
              </svg>
              Download APK
            </a>
            <a href="#features" className="landing-cta-secondary">
              Explore Features
            </a>
          </div>
          <div className="landing-stats">
            <div className="landing-stat">
              <div className="landing-stat-value">100%</div>
              <div className="landing-stat-label">Free forever</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value">Local</div>
              <div className="landing-stat-label">Files on your device</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value">Zero</div>
              <div className="landing-stat-label">Ads &amp; tracking</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="landing-section">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-label">FEATURES</span>
            <h2 className="landing-h2">
              Everything you need.<br />Nothing you don&apos;t.
            </h2>
          </div>
          <div className="landing-features-grid">
            <FeatureCard
              icon={<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
              title="Instant Download"
              description="Paste any YouTube or SoundCloud URL. Audio downloads in seconds to your local library."
              accent="#06C167"
            />
            <FeatureCard
              icon={<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" fill="currentColor" /></svg>}
              title="Premium Player"
              description="Full-screen mode, crossfade, sleep timer, and a silky-smooth playback experience."
              accent="#6366f1"
            />
            <FeatureCard
              icon={<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>}
              title="Smart Library"
              description="Folders, favorites, sorting, search — organize your collection the way you want."
              accent="#f59e0b"
            />
            <FeatureCard
              icon={<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>}
              title="Listening Stats"
              description="Track your listening habits with beautiful analytics and play count charts."
              accent="#ec4899"
            />
            <FeatureCard
              icon={<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>}
              title="Customizable"
              description="Light mode, dark mode, crossfade settings, keyboard shortcuts — make it yours."
              accent="#14b8a6"
            />
            <FeatureCard
              icon={<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>}
              title="Private & Secure"
              description="No cloud, no accounts, no data collection. Your music stays on your device."
              accent="#8b5cf6"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="landing-section landing-section-dark">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-label">HOW IT WORKS</span>
            <h2 className="landing-h2">Three steps. That&apos;s it.</h2>
          </div>
          <div className="landing-steps">
            <StepCard num="01" title="Paste a URL" description="Drop any YouTube, SoundCloud, or Bandcamp link into the app." />
            <div className="landing-step-arrow">→</div>
            <StepCard num="02" title="Download" description="Audio is extracted and saved locally in high quality." />
            <div className="landing-step-arrow">→</div>
            <StepCard num="03" title="Enjoy" description="Play, organize, and listen — offline, forever." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-section landing-cta-section">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="landing-h2" style={{ marginBottom: 16 }}>
            Ready to own<br />your music?
          </h2>
          <p className="landing-subtitle" style={{ maxWidth: 440, margin: '0 auto 40px' }}>
            Stop renting. Start building a library that&apos;s truly yours.
          </p>
          <Link href="/player" className="landing-cta-primary landing-cta-large">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Get Started — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo" style={{ opacity: 0.6 }}>
            <div className="landing-logo-icon" style={{ width: 28, height: 28 }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <span style={{ fontSize: 14 }}>Wavelength</span>
          </div>
          <p className="landing-footer-text">
            Built with Next.js — v2.5 Web Edition
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, accent }: {
  icon: React.ReactNode; title: string; description: string; accent: string;
}) {
  return (
    <div className="landing-feature-card">
      <div className="landing-feature-icon" style={{ background: `${accent}15`, color: accent }}>
        {icon}
      </div>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="landing-feature-desc">{description}</p>
    </div>
  );
}

function StepCard({ num, title, description }: { num: string; title: string; description: string }) {
  return (
    <div className="landing-step-card">
      <div className="landing-step-num">{num}</div>
      <h3 className="landing-step-title">{title}</h3>
      <p className="landing-step-desc">{description}</p>
    </div>
  );
}
