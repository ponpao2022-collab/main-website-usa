#!/bin/bash
# ========================================================
# 🚀 AUTOMATIC DEPLOYMENT SCRIPT FOR NEXT-GEN NEWS CMS ON VPS
# ========================================================

set -e

echo ">>> 1. Stopping old services (Apache, old WordPress, etc.)..."
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true

echo ">>> 2. Updating packages and installing Nginx, curl, unzip..."
apt update -y
apt install -y curl unzip nginx

echo ">>> 3. Installing Bun runtime (Ultra-Fast JS/TS)..."
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

# Ensure bun is in system PATH
ln -sf /root/.bun/bin/bun /usr/local/bin/bun || true

echo ">>> 4. Setting up app directory in /var/www/news..."
CURRENT_DIR="$(pwd)"
if [ "$CURRENT_DIR" != "/var/www/news" ]; then
  if [ -f "news-production.tar.gz" ]; then
    mkdir -p /var/www/news
    tar -xzf news-production.tar.gz -C /var/www/news
  elif [ -f "/root/news-production.tar.gz" ]; then
    mkdir -p /var/www/news
    tar -xzf /root/news-production.tar.gz -C /var/www/news
  elif [ -f "$CURRENT_DIR/package.json" ]; then
    mkdir -p /var/www/news
    cp -r "$CURRENT_DIR"/* /var/www/news/ 2>/dev/null || true
  else
    echo ">>> Cloning latest code from GitHub..."
    rm -rf /var/www/news
    git clone https://github.com/ponpao2022-collab/main-website-usa.git /var/www/news
  fi
fi

cd /var/www/news
export PATH="$HOME/.bun/bin:/usr/local/bin:$PATH"
bun install

echo ">>> 5. Creating Systemd Service (Runs 24/7 in background)..."
cat << 'EOF' > /etc/systemd/system/news-app.service
[Unit]
Description=Next-Gen News Website & CMS
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/news
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable news-app
systemctl restart news-app

echo ">>> 6. Configuring Nginx Reverse Proxy with Cloudflare Real-IP support..."
cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Cloudflare Real IP restoration
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

nginx -t
systemctl restart nginx

echo ""
echo "========================================================"
echo "✅ DEPLOYMENT COMPLETE! YOUR NEW SITE IS LIVE ON VPS!"
echo "   IP: http://$(curl -s ifconfig.me)"
echo "   CMS: http://$(curl -s ifconfig.me)/admin"
echo "========================================================"
