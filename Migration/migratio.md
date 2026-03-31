# Wavelength v2 — Flutter Migration Guide

## What's new (full web feature parity)

| Feature | Status |
|---|---|
| Downloads screen with real-time progress + retry | ✅ |
| Download bottom sheet (multi-URL, playlist target) | ✅ |
| Play All / Shuffle on every screen | ✅ |
| Library search (inline, toggled via 🔍 icon) | ✅ |
| Sort by: Recent · Title · Artist · Duration | ✅ |
| Selection mode + bulk actions | ✅ |
| Playlist (folder) management via side drawer | ✅ |
| Move tracks to playlists, individually or in bulk | ✅ |
| Track context menu: Play Next, Add to Queue, Move to Playlist, Favorite, Delete | ✅ |
| Favorites screen with Play All / Shuffle | ✅ |
| Queue screen with Clear Queue + Play All from Library | ✅ |
| Full-screen player with seek bar, shuffle, repeat, favorite | ✅ |
| Now Playing bar with inline seek strip + favorite toggle | ✅ |
| Search screen (YouTube search + direct URL tab) | ✅ |
| 5-tab bottom nav: Library, Favorites, Queue, Downloads, Search | ✅ |
| Download badge count on nav icon | ✅ |
| Grid card layout with EQ animation, selection checkbox, cover art | ✅ |

---

## How to apply

### 1. Replace `lib/` entirely
Copy the entire `lib/` folder from this zip over your existing `flutter_app_source/lib/`.

### 2. Update `pubspec.yaml`
Replace your `pubspec.yaml` with the one in the zip, then run:
```bash
flutter pub get
```

### 3. Database migration
The DB version bumped from `1 → 2`. The `_onUpgrade` handler in `database_service.dart`
automatically adds the `playlistId` column and creates the `playlists` table on first launch.
Existing library data is preserved.

### 4. Build & run
```bash
# Debug
flutter run

# Release APK
flutter build apk --release

# Release AAB (Play Store)
flutter build appbundle --release
```

---

## Architecture overview

```
lib/
├── main.dart                       # App entry, providers wired here
├── models/
│   ├── track.dart                  # + playlistId, copyWith()
│   ├── playlist.dart               # NEW — mirrors web "folders"
│   └── download_job.dart           # NEW — mirrors DownloadJob type
├── providers/
│   └── app_state.dart              # NEW — central store (mirrors musicStore.ts)
├── services/
│   ├── api_service.dart            # YouTube metadata + streams
│   ├── audio_service.dart          # + playAll(startIndex), playNextTrack()
│   ├── database_service.dart       # + playlists table, v2 migration
│   ├── download_manager.dart       # NEW — processes download jobs
│   ├── download_service.dart       # Path helpers only (no yt-dlp)
│   └── permission_service.dart     # Unchanged
└── ui/
    ├── screens/
    │   ├── main_wrapper.dart       # 5-tab nav + playlist drawer
    │   ├── home_screen.dart        # Full rewrite — search, sort, grid, bulk
    │   ├── favorites_screen.dart   # Grid + Play All / Shuffle
    │   ├── queue_view.dart         # Clear queue, Play All from Library
    │   ├── downloads_screen.dart   # NEW — active/history rows + retry
    │   ├── search_screen.dart      # Uses AppState for downloads
    │   └── player_screen.dart      # Full-screen player, AppState favorites
    └── widgets/
        ├── track_tile.dart         # Grid card + context menu
        ├── now_playing_bar.dart    # Seek strip + favorite + prev/next
        └── download_bottom_sheet.dart  # NEW — URL input modal
```

---

## Key design decisions

**AppState provider** replaces scattered local `setState` calls. Every screen
reads from `AppState` via `context.watch<AppState>()`, and writes go through
its async methods that also persist to SQLite.

**DownloadManager** is a singleton that queues jobs sequentially. It wires
itself to `AppState` on startup and drives `DownloadJob` status updates,
which the Downloads screen reacts to in real time.

**Playlists = Folders**. The web version calls them "folders" internally
(`folderId`). The mobile version calls them playlists. The SQLite schema
column is `playlistId` on the `tracks` table.