# RackNerd Deployment

This project builds to a static Vite bundle and is intended to be served by Nginx.

Target deployment values:

- Domain: `siteplan.gomil.com`
- Origin server IP: `107.172.159.109`
- TLS: Let's Encrypt via Certbot

## Important DNS note

If you are using Cloudflare proxying, the DNS record for `siteplan.gomil.com` should point to the RackNerd origin IP `107.172.159.109`, and Cloudflare can stay proxied after the origin is reachable. Do not point the record at a Cloudflare edge IP manually.

## Files added

- `deploy/nginx/siteplan.gomil.com.bootstrap.conf`
- `deploy/nginx/siteplan.gomil.com.conf`
- `deploy/certbot/issue-siteplan-cert.sh`
- `deploy/certbot/install-renew-hook.sh`
- `scripts/deploy/bootstrap-server.sh`
- `scripts/deploy/build-release.sh`
- `scripts/deploy/upload-release.sh`
- `scripts/deploy/publish-release.sh`
- `scripts/deploy/activate-tls-config.sh`

## Assumptions

- Ubuntu or Debian-based RackNerd VM
- Nginx serves the static app
- Optional Regrid proxy runs locally on the same host at `127.0.0.1:8787`
- SSH access is available to the origin server

## 1. Build a release locally

```bash
bash scripts/deploy/build-release.sh
```

That produces a timestamped archive in `releases/`.

## 2. Upload the release

```bash
bash scripts/deploy/upload-release.sh releases/siteplan-YYYYMMDD-HHMMSS.tar.gz root@107.172.159.109
```

## 3. Bootstrap the server

Copy this repo to the server once, then run:

```bash
DOMAIN=siteplan.gomil.com bash scripts/deploy/bootstrap-server.sh
```

This installs Nginx and Certbot, creates `/var/www/siteplan.gomil.com`, and enables the HTTP bootstrap site.

## 4. Publish the uploaded build

On the server:

```bash
sudo bash scripts/deploy/publish-release.sh /tmp/siteplan-release/siteplan-YYYYMMDD-HHMMSS.tar.gz
```

This extracts the build into `/var/www/siteplan.gomil.com/releases/...`, updates the `current` symlink, validates Nginx, and reloads it.

## 5. Issue the certificate

On the server:

```bash
EMAIL=ops@gomil.com bash deploy/certbot/issue-siteplan-cert.sh
```

## 6. Install the renew hook

On the server:

```bash
bash deploy/certbot/install-renew-hook.sh
```

## 7. Enable the TLS vhost

On the server:

```bash
DOMAIN=siteplan.gomil.com bash scripts/deploy/activate-tls-config.sh
```

## 8. Production env

The app should be built with:

```env
VITE_REGRID_PROXY_BASE_URL=https://siteplan.gomil.com/regrid/
```

That keeps the browser talking to same-origin `/regrid/`, with Nginx forwarding requests to the local Regrid proxy service.

## Optional checks

```bash
curl -I http://siteplan.gomil.com
curl -I https://siteplan.gomil.com
sudo nginx -t
sudo certbot renew --dry-run
```
