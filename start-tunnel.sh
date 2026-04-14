#!/bin/bash

# start-tunnel.sh
# Starts cloudflared tunnel and auto-detects the assigned URL.
# Writes TUNNEL_URL to .env.local for use by the app.

CLOUDFLARED="./cloudflared"
if [ ! -f "$CLOUDFLARED" ]; then
  CLOUDFLARED="cloudflared"
fi

PORT=${1:-3000}
LOG_FILE="/tmp/cloudflared-tunnel.log"

echo "🌐 Starting Cloudflare Tunnel on port $PORT..."
echo "   Waiting for tunnel URL..."

# Kill any previous cloudflared processes
pkill -f "cloudflared.*tunnel" 2>/dev/null || true
sleep 1

# Start cloudflared in background, capture output
"$CLOUDFLARED" tunnel --url "http://localhost:$PORT" > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

# Wait for the tunnel URL to appear in the log (up to 30 seconds)
TUNNEL_URL=""
for i in $(seq 1 30); do
  sleep 1
  TUNNEL_URL=$(grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' "$LOG_FILE" | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
done

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Failed to detect tunnel URL. Check $LOG_FILE for details."
  kill $TUNNEL_PID 2>/dev/null
  exit 1
fi

TUNNEL_HOSTNAME=$(echo "$TUNNEL_URL" | sed 's|https://||')

echo ""
echo "✅ Tunnel is live!"
echo "   URL:  $TUNNEL_URL"
echo "   Host: $TUNNEL_HOSTNAME"
echo ""

# Write to .env.local
ENV_FILE=".env.local"
if grep -q "NEXT_PUBLIC_TUNNEL_URL" "$ENV_FILE" 2>/dev/null; then
  sed -i "s|NEXT_PUBLIC_TUNNEL_URL=.*|NEXT_PUBLIC_TUNNEL_URL=$TUNNEL_URL|" "$ENV_FILE"
  sed -i "s|NEXT_PUBLIC_TUNNEL_HOST=.*|NEXT_PUBLIC_TUNNEL_HOST=$TUNNEL_HOSTNAME|" "$ENV_FILE"
else
  echo "" >> "$ENV_FILE"
  echo "NEXT_PUBLIC_TUNNEL_URL=$TUNNEL_URL" >> "$ENV_FILE"
  echo "NEXT_PUBLIC_TUNNEL_HOST=$TUNNEL_HOSTNAME" >> "$ENV_FILE"
fi

echo "📝 Wrote tunnel URL to $ENV_FILE"
echo ""
echo "📱 Share this URL with your mobile device:"
echo "   $TUNNEL_URL"
echo ""
echo "💡 Press Ctrl+C to stop the tunnel."
echo ""

# Show the QR code if qrencode is available
if command -v qrencode &> /dev/null; then
  echo "📷 QR Code:"
  qrencode -t ansiutf8 "$TUNNEL_URL"
  echo ""
fi

# Trap Ctrl+C to clean up
trap "echo ''; echo '🛑 Stopping tunnel...'; kill $TUNNEL_PID 2>/dev/null; exit 0" INT

# Wait for tunnel process
wait $TUNNEL_PID
