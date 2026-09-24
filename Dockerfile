# Production Dockerfile for Wavelength Music Player
FROM node:22-bookworm-slim

# Install system runtime dependencies:
# - ffmpeg: Required by yt-dlp to convert downloaded streams to high-quality MP3
# - python3, curl, ca-certificates: Required by yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pre-install latest yt-dlp binary directly into system path
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install npm packages
RUN npm ci

# Copy project source files (including initial data/library.json & playlists.json)
COPY . .

# Ensure storage directories exist and copy yt-dlp to local bin directory
RUN mkdir -p /app/data /app/public/audio /app/bin && \
    cp /usr/local/bin/yt-dlp /app/bin/yt-dlp && \
    chmod a+rx /app/bin/yt-dlp

# Build Next.js for production
ENV NODE_ENV=production
RUN npm run build

# Render provides the PORT variable at runtime (defaults to 10000)
ENV PORT=10000
EXPOSE 10000

# Launch server.mjs (boots both Next.js and Socket.IO for Listen Together)
CMD ["node", "server.mjs"]
