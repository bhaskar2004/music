# Wavelength v2.1 — Migration Guide

## Root cause of the DNS/streaming error

The app was trying to stream audio directly from YouTube CDN URLs like
`rr4---sn-ci5gup-pmxs.googlevideo.com`. These URLs expire in ~6 hours and fail
DNS resolution on mobile networks. The fix: **the app never streams from YouTube
CDN**. Every track must be downloaded first. Playback always reads the local file.

---

## What changed in v2.1

| Change | Details |
|---|---|
| **No SQLite** | Library + playlists stored as two JSON files in app's documents dir |
| **No CDN streaming** | `AudioService` only plays local `.mp3` files |
| **Tap undownloaded card** | Instantly starts download and opens Downloads tab |
| **Visual cues** | Green ↓ icon = not downloaded; green ✓ = on device |
| **Context menu** | "Download to Device" shown first; queue actions only when downloaded |

---

## Storage locations (no special permissions needed)

| What | Where |
|---|---|
| Library metadata | `<appDocDir>/wavelength_library.json` |
| Playlists | `<appDocDir>/wavelength_playlists.json` |
| Audio files | `<extStorageDir>/Wavelength/<videoId>.mp3` |

---

## Migration Steps

```bash
# 1. Replace lib folder
cp -r wavelength/lib/  your_project/lib/

# 2. Replace pubspec (sqflite removed)
cp wavelength/pubspec.yaml  your_project/pubspec.yaml

# 3. Install & build
flutter pub get
flutter build apk --release
```

---

## Data flow

```
Tap undownloaded track
  → DownloadManager.processJob(url)
      → ApiService.getTrackFromUrl()       # metadata only
      → ApiService.getAudioManifest()      # stream bytes
      → write to local .mp3 file
      → StorageService.insertTrack()       # JSON, not SQLite
      → AppState.addTrack()                # updates UI

Tap downloaded track
  → AudioService.playAll(tracks)
      → DownloadService.getLocalFilePath() # returns local path
      → AudioSource.uri(Uri.file(path))   # local file only
      → just_audio plays ✓
```