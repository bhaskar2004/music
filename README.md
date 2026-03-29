# Wavelength Music

Wavelength is a premium music ecosystem featuring a modern Next.js web application and a completely independent, standalone Flutter mobile player.

## Project Structure

- **[Web Application](file:///c:/Users/chandan.m/OneDrive/Documents/bhaskar/music/music/README.md)**: A high-performance music platform built with Next.js, React, and Tailwind CSS.
- **[Mobile Application (flutter_app_source)](file:///c:/Users/chandan.m/OneDrive/Documents/bhaskar/music/music/flutter_app_source/README.md)**: A truly standalone Flutter mobile player for Android and iOS.

## Why Standalone?

The mobile application is designed to function as a 100% independent entity. It removes all dependencies on a central server or backend for its core functionality:

1.  **Direct Discovery**: Search and discovery happen on-device via `youtube_explode_dart`.
2.  **Native Downloads**: High-quality audio streams are downloaded directly to the device's native storage.
3.  **Local Library**: A dedicated SQLite database manages all metadata and offline playback status.
4.  **Foreground Audio**: Uses native Android services for high-fidelity background playback.

For more details on the mobile architecture, see the **[Mobile README](file:///c:/Users/chandan.m/OneDrive/Documents/bhaskar/music/music/flutter_app_source/README.md)**.

## Getting Started (Web)

First, run the development server:
```bash
npm run dev
```

## Getting Started (Mobile)
Mobile builds are handled automatically via GitHub Actions. You can find the latest APK in the **Actions** tab of the repository.
