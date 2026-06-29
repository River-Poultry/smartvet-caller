#!/usr/bin/env bash
# SmartVet AI Call Centre — VPS deployment script
# Run once on a fresh Ubuntu/Debian VPS as root (or with sudo)
#
# Usage:
#   chmod +x deploy.sh
#   sudo ./deploy.sh callcentre.smartvet.africa
#
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <domain>  e.g.  $0 callcentre.smartvet.africa"
  exit 1
fi

echo "==> Deploying SmartVet Call Centre → $DOMAIN"

# ── 1. Install dependencies ────────────────────────────────────────────────
apt-get update -y
apt-get install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx

# ── 2. Pull latest code ────────────────────────────────────────────────────
REPO_DIR="/opt/smartvet-callcentre"
if [[ -d "$REPO_DIR" ]]; then
  git -C "$REPO_DIR" pull
else
  git clone https://github.com/River-Poultry/smartvet-caller.git "$REPO_DIR"
fi

# ── 3. Create backend .env if it doesn't exist ────────────────────────────
ENV_FILE="$REPO_DIR/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "⚠  $ENV_FILE is missing — create it with your secrets before continuing."
  echo "   Required keys: DATABASE_URL, TWILIO_*, GEMINI_API_KEY, CARRIER_SMS_API_KEY, etc."
  exit 1
fi

# ── 4. Build + start Docker containers ────────────────────────────────────
cd "$REPO_DIR"

# Point frontend API at the domain (build-time env)
cat > frontend/.env.production <<EOF
VITE_API_BASE_URL=https://$DOMAIN/api
VITE_WS_URL=wss://$DOMAIN
EOF

docker compose build --no-cache
docker compose up -d

# ── 5. Install nginx host config ───────────────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/smartvet-callcentre"
sed "s/YOURDOMAIN/$DOMAIN/g" "$REPO_DIR/nginx-host.conf" > "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/smartvet-callcentre
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

# ── 6. Obtain SSL certificate ──────────────────────────────────────────────
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@smartvet.africa

echo ""
echo "✅  SmartVet Call Centre is live at https://$DOMAIN"
echo "    Frontend → http://127.0.0.1:5174 (Docker)"
echo "    Backend  → http://127.0.0.1:4600 (Docker)"
echo ""
echo "Useful commands:"
echo "  docker compose -f $REPO_DIR/docker-compose.yml logs -f"
echo "  docker compose -f $REPO_DIR/docker-compose.yml restart"
