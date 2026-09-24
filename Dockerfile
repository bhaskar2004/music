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

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install npm packages
RUN npm ci

# Copy project source files
COPY . .

# Ensure storage directories exist
RUN mkdir -p /app/data /app/public/audio /app/bin

# Build Next.js for production
ENV NODE_ENV=production
RUN npm run build

# Render provides the PORT variable at runtime (defaults to 10000)
ENV PORT=10000
EXPOSE 10000

# Launch server.mjs (boots both Next.js and Socket.IO for Listen Together)
CMD ["node", "server.mjs"]
