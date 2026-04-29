#!/usr/bin/env bash
set -euo pipefail

HOOK_PATH="/etc/letsencrypt/renewal-hooks/post/siteplan-gomil-reload-nginx.sh"

sudo install -d /etc/letsencrypt/renewal-hooks/post
sudo tee "$HOOK_PATH" >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
systemctl reload nginx
EOF
sudo chmod +x "$HOOK_PATH"

echo "Installed renew hook at $HOOK_PATH"
