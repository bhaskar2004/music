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
            Real-Time Sync Ready
          </div>
          <h1 className="landing-h1">
            Music is better<br />
            <span className="landing-h1-accent">Together.</span>
          </h1>
          <p className="landing-subtitle">
            Create a room, invite your friends, and listen in perfect sync. 
            Anyone can add to the queue, chat, and control playback in real-time.
          </p>
          <div className="landing-hero-actions" style={{ flexDirection: 'column', gap: 24, alignItems: 'center' }}>
            <Link href="/player" className="landing-cta-primary" style={{ padding: '20px 48px', fontSize: 18 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Start a Session
            </Link>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link href="/player" className="landing-cta-secondary">
                Solo Library
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
            </div>
          </div>
          <div className="landing-stats">
            <div className="landing-stat">
              <div className="landing-stat-value">Sync</div>
              <div className="landing-stat-label">Ultra-low latency</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value">Queue</div>
              <div className="landing-stat-label">Collaborative lists</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value">Chat</div>
              <div className="landing-stat-label">Real-time interaction</div>
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
            <div className="landing-feature-card">
              <div className="landing-feature-icon" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Perfect Sync</h3>
              <p className="landing-feature-desc">Everyone in the party hears the exact same beat at the exact same moment.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Shared Queue</h3>
              <p className="landing-feature-desc">Anyone can search and add tracks to the party queue. Build the perfect playlist together.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Live Chat</h3>
              <p className="landing-feature-desc">React to tracks and talk with your friends without ever leaving the player.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Instant Download</h3>
              <p className="landing-feature-desc">Paste a link and the audio is ready in seconds. Build your library while you listen.</p>
            </div>
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
            <div className="landing-step-card">
              <div className="landing-step-num">1</div>
              <h3 className="landing-step-title">Create a room</h3>
              <p className="landing-step-desc">Click &quot;Start a Session&quot; to instantly get a 6-digit room code.</p>
            </div>
            <div className="landing-step-arrow">→</div>
            <div className="landing-step-card">
              <div className="landing-step-num">2</div>
              <h3 className="landing-step-title">Share the code</h3>
              <p className="landing-step-desc">Friends enter your code to join from any browser, no account needed.</p>
            </div>
            <div className="landing-step-arrow">→</div>
            <div className="landing-step-card">
              <div className="landing-step-num">3</div>
              <h3 className="landing-step-title">Listen together</h3>
              <p className="landing-step-desc">Search for music, build a shared queue, chat, and vibe in sync.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-section landing-cta-section">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="landing-h2" style={{ marginBottom: 24 }}>Ready to start a session?</h2>
          <p className="landing-subtitle" style={{ margin: '0 auto 40px' }}>
            No sign-ups. No subscriptions. Just pure, synchronized music with your friends.
          </p>
          <Link href="/player" className="landing-cta-primary" style={{ margin: '0 auto', display: 'inline-flex', padding: '20px 48px', fontSize: 18 }}>
            Start a Session
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
