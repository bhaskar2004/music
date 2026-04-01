# Wavelength Mobile: Standalone Music Player

Wavelength Mobile is a completely independent, standalone music player built with Flutter. Unlike the web version, it does not require a backend server or a Next.js environment to search, download, or play music.

## How it Works Independently

The application architecture is designed for full device autonomy:

### 1. Direct Discovery (No Backend Search)
The app uses the `youtube_explode_dart` package to search for music directly from the device. It scrapes and parses search results and retrieves direct audio stream URLs without any intermediary Node.js or Next.js API.
- **Service**: `lib/services/api_service.dart`

### 2. Direct Search Playback
You can now play any song directly from the YouTube search results in the mobile app without needing to download it first. This uses direct YouTube streaming for the fastest possible experience.

### 3. Standalone Downloads
Instead of relying on a server to process downloads, the app uses `dio` to fetch high-quality audio streams directly from YouTube's servers to the Android `/Music/Wavelength` directory.
- **Service**: `lib/services/download_service.dart`

### 3. Local Library & Metadata
Library management is handled by a local SQLite database (`sqflite`). This stores all track metadata (title, artist, album art URL, download status) on-device, ensuring your library is always accessible offline.
- **Service**: `lib/services/database_service.dart`
- **Database**: `wavelength_library.db`

### 4. Background Audio & Persistence
Playback continues even when the app is closed or the screen is off, thanks to the `audio_service` and `just_audio_background` plugins. This implements a native Android foreground service and handles persistent media notifications.
- **Service**: `lib/services/audio_service.dart`

## Key Features
- **True Standalone**: No account or server required.
- **Offline First**: All downloads are stored in standard Android Media folders.
- **Modern UI**: High-contrast, premium design inspired by Spotify and Uber.
- **Low Latency**: Direct-to-stream architecture for instant playback.
