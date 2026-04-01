import { NextRequest, NextResponse } from 'next/server';

// ─── Constants ────────────────────────────────────────────────────────────────

const LRCLIB_BASE = 'https://lrclib.net/api';
const UA_HEADER   = { 'User-Agent': 'WavelengthMusicApp/1.0 (https://github.com/bhaskar2004/music-app)' };

// Noise words to strip when cleaning strings for matching
const NOISE_RE = /\b(official|video|audio|full|song|lyrics|hd|4k|high\s?res|track|vevo|records|series|music|original|remaster(?:ed)?|explicit|clean|version|edit|feat\.?|ft\.?|with)\b/gi;
// Bracketed/parenthesised annotations
const BRACKET_RE = /[\(\[].*?[\)\]]/g;

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Normalise a string for fuzzy comparison. */
function normalise(s: string): string {
  return s
    .replace(BRACKET_RE, '')
    .replace(NOISE_RE, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Extract the primary artist (before "feat" / "ft" / "&" / ","). */
function primaryArtist(artist: string): string {
  return artist
    .split(/\s*(?:feat\.?|ft\.?|&|,)\s*/i)[0]
    .replace(BRACKET_RE, '')
    .trim();
}

/**
 * Rough token-overlap similarity — fast, no dependencies.
 * Returns 0–1: 1 = identical token sets after normalisation.
 */
function tokenSimilarity(a: string, b: string): number {
  const tokA = new Set(normalise(a).split(' ').filter(Boolean));
  const tokB = new Set(normalise(b).split(' ').filter(Boolean));
  if (tokA.size === 0 && tokB.size === 0) return 1;
  if (tokA.size === 0 || tokB.size === 0) return 0;
  let overlap = 0;
  tokA.forEach(t => { if (tokB.has(t)) overlap++; });
  return (overlap * 2) / (tokA.size + tokB.size);
}

/** True if the text contains Indic scripts (Devanagari, Kannada, Telugu, etc.). */
function containsNativeScript(text: string | null | undefined): boolean {
  if (!text) return false;
  return /[\u0900-\u097F\u0C80-\u0CFF\u0C00-\u0C7F\u0B80-\u0BFF\u0980-\u09FF\u0D00-\u0D7F]/.test(text);
}

// ─── Query builder ────────────────────────────────────────────────────────────

interface QuerySpec {
  artistHint: string;
  titleHint:  string;
  searchQ:    string;
}

function buildQueries(rawTitle: string, rawArtist: string): QuerySpec[] {
  const cTitle  = normalise(rawTitle);
  const cArtist = normalise(rawArtist);
  const pArtist = normalise(primaryArtist(rawArtist));

  // Derive extra title variants from "Title - Subtitle | Source" patterns
  const segments       = rawTitle.split(/\s*[\|:]\s*|\s+-\s+/);
  const segZero        = normalise(segments[0]);
  const firstTwoSegs   = segments.length > 1 ? normalise(`${segments[0]} ${segments[1]}`) : '';

  const specs: QuerySpec[] = [];

  const add = (titleHint: string, artistHint: string, searchQ: string) => {
    if (searchQ.length > 2) specs.push({ titleHint, artistHint, searchQ });
  };

  // Best: primary artist + cleaned title
  add(cTitle, pArtist, `${pArtist} ${cTitle}`.trim());
  // Full artist + cleaned title
  if (cArtist !== pArtist) add(cTitle, cArtist, `${cArtist} ${cTitle}`.trim());
  // Reversed order
  add(cTitle, cArtist, `${cTitle} ${pArtist}`.trim());
  // Title-only
  add(cTitle, '', cTitle);
  // Segment variants
  if (firstTwoSegs)              add(firstTwoSegs, pArtist, `${pArtist} ${firstTwoSegs}`.trim());
  if (segZero && segZero !== cTitle) add(segZero, pArtist, `${pArtist} ${segZero}`.trim());
  // Raw-ish (strip brackets only — last resort)
  const semiRaw = rawTitle.replace(BRACKET_RE, '').trim().toLowerCase();
  if (semiRaw !== cTitle)        add(semiRaw, rawArtist, `${rawArtist} ${semiRaw}`.trim());

  // Deduplicate by searchQ
  const seen = new Set<string>();
  return specs.filter(s => {
    const key = s.searchQ;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Result scoring ───────────────────────────────────────────────────────────

interface LrclibResult {
  id:           number;
  trackName:    string;
  artistName:   string;
  albumName:    string;
  duration:     number;
  syncedLyrics: string | null;
  plainLyrics:  string | null;
}

/**
 * Score a candidate result 0–100:
 *   - Title similarity    0–40
 *   - Artist similarity   0–30
 *   - Duration proximity  0–10  (bonus if duration provided)
 *   - Has synced lyrics   +15
 *   - Has plain lyrics    +5
 *   - Native script match +5   (only if query hint is also native)
 */
function scoreResult(
  result:          LrclibResult,
  titleHint:       string,
  artistHint:      string,
  durationSecs?:   number,
): number {
  let score = 0;

  score += tokenSimilarity(result.trackName  || '', titleHint)  * 40;
  score += tokenSimilarity(result.artistName || '', artistHint) * 30;

  if (durationSecs && result.duration) {
    const diff = Math.abs(result.duration - durationSecs);
    // Full 10 pts if within 2 s, linear decay to 0 at 15 s
    score += Math.max(0, 10 - (diff / 15) * 10);
  }

  if (result.syncedLyrics) score += 15;
  else if (result.plainLyrics) score += 5;

  const queryIsNative = containsNativeScript(titleHint) || containsNativeScript(artistHint);
  const resultIsNative = containsNativeScript(result.syncedLyrics) || containsNativeScript(result.plainLyrics);
  if (queryIsNative && resultIsNative) score += 5;

  return score;
}

// ─── lrclib fetchers ──────────────────────────────────────────────────────────

/** Direct lookup: most accurate, returns null on miss. */
async function directGet(
  artist: string,
  title:  string,
  album   = '',
): Promise<LrclibResult | null> {
  try {
    const params = new URLSearchParams({ artist_name: artist, track_name: title });
    if (album) params.set('album_name', album);
    const res = await fetch(`${LRCLIB_BASE}/get?${params}`, { headers: UA_HEADER });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = await res.json();
    // lrclib returns an object with a 200; treat "no lyrics" body gracefully
    return (data && (data.syncedLyrics || data.plainLyrics)) ? data : null;
  } catch {
    return null;
  }
}

/** Search endpoint: returns best-scored result or null. */
async function searchGet(
  spec:         QuerySpec,
  durationSecs: number | undefined,
): Promise<{ result: LrclibResult; score: number } | null> {
  try {
    const url = `${LRCLIB_BASE}/search?q=${encodeURIComponent(spec.searchQ)}`;
    const res = await fetch(url, { headers: UA_HEADER });
    if (!res.ok) return null;
    const results: LrclibResult[] = await res.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    let best: LrclibResult = results[0];
    let bestScore = -Infinity;

    for (const r of results) {
      const s = scoreResult(r, spec.titleHint, spec.artistHint, durationSecs);
      if (s > bestScore) { bestScore = s; best = r; }
      // Short-circuit: near-perfect score, no need to keep scanning
      if (bestScore >= 88) break;
    }

    return { result: best, score: bestScore };
  } catch {
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawArtist  = searchParams.get('artist')   || '';
  const rawTitle   = searchParams.get('title')    || '';
  const rawAlbum   = searchParams.get('album')    || '';
  const rawDuration = searchParams.get('duration') || '';
  const durationSecs = rawDuration ? parseFloat(rawDuration) : undefined;

  if (!rawArtist && !rawTitle) {
    return NextResponse.json({ error: 'artist or title is required' }, { status: 400 });
  }

  // ── 1. Direct lookup — fastest, most precise ──────────────────────────────
  // Try with full artist, then primary artist
  const directCandidates = [
    [rawArtist,              rawTitle, rawAlbum],
    [primaryArtist(rawArtist), rawTitle, rawAlbum],
    [rawArtist,              rawTitle, ''],
  ] as const;

  for (const [a, t, al] of directCandidates) {
    if (!a) continue;
    const hit = await directGet(a, t, al);
    if (hit) {
      console.log(`[LYRICS] Direct hit: "${hit.trackName}" by "${hit.artistName}"`);
      return lyricResponse(hit);
    }
  }

  // ── 2. Search with scored ranking ────────────────────────────────────────
  const queries = buildQueries(rawTitle, rawArtist);
  console.log(`[LYRICS] Direct miss — running ${queries.length} search queries`);

  // SCORE_THRESHOLD: if a query returns a result scoring this high, accept it
  // immediately without trying remaining queries.
  const ACCEPT_THRESHOLD = 72;

  let globalBest:  LrclibResult | null = null;
  let globalScore  = -Infinity;

  for (const spec of queries) {
    console.log(`[LYRICS] Search: "${spec.searchQ}"`);
    const hit = await searchGet(spec, durationSecs);
    if (!hit) continue;

    if (hit.score > globalScore) {
      globalScore = hit.score;
      globalBest  = hit.result;
      console.log(`[LYRICS] New best (score ${hit.score.toFixed(1)}): "${hit.result.trackName}" by "${hit.result.artistName}"`);
    }

    if (globalScore >= ACCEPT_THRESHOLD) {
      console.log(`[LYRICS] Accepting result above threshold (${globalScore.toFixed(1)})`);
      break;
    }
  }

  if (globalBest) return lyricResponse(globalBest);

  return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
}

// ─── Response helper ──────────────────────────────────────────────────────────

function lyricResponse(data: LrclibResult) {
  return NextResponse.json(data, {
    headers: {
      // Cache for 24 h in CDN / 7 days stale-while-revalidate — lyrics don't change
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
