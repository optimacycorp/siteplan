## LandPortal V3 deployment

This deployment target publishes the current web app to:

- https://landportalv3.frcell.com

It is designed to coexist with `landportal.frcell.com` and `landportalv2.frcell.com` on the same RackNerd server.

### Target layout

- repo checkout: `/home/deploy/apps/landportalv3`
- deployed web root: `/var/www/landportalv3/current`
- nginx site: `/etc/nginx/sites-available/landportalv3.frcell.com.conf`

### 1. DNS

Point `landportalv3.frcell.com` at the RackNerd server public IP before enabling nginx.

### 2. Install pnpm for deploy user

```bash
mkdir -p /home/deploy/.local/bin
npm install -g pnpm@9.15.0 --prefix /home/deploy/.local
export PATH="/home/deploy/.local/bin:$PATH"
echo 'export PATH="/home/deploy/.local/bin:$PATH"' >> /home/deploy/.bashrc
```

### 3. Clone the repo

```bash
mkdir -p /home/deploy/apps
cd /home/deploy/apps

git clone <YOUR_REPO_URL> landportalv3 || true
cd /home/deploy/apps/landportalv3
git pull --ff-only
```

### 4. Configure frontend env

Create `/home/deploy/apps/landportalv3/apps/web/.env.production`:

```bash
VITE_SUPABASE_URL=https://gnvdiklymbsbtcdbrybj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_zBfeg_kByIBQbn0qB54u9w_TEHavXxx
```

### 5. Configure server-only Supabase env

Create `/home/deploy/apps/landportalv3/.env`:

```bash
SUPABASE_URL=https://gnvdiklymbsbtcdbrybj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
REGRID_API_TOKEN=<YOUR_REGRID_API_TOKEN>
REGRID_PARCEL_API_BASE=https://app.regrid.com
REGRID_TILE_API_BASE=https://tiles.regrid.com
```

Do not place the service-role key in any `VITE_*` file.
Do not place the Regrid token in any `VITE_*` file either. The web app now calls the `regrid-proxy` Supabase Edge Function instead of talking to Regrid directly.

### 5b. Deploy the Regrid proxy function

Set the Regrid secrets in Supabase, then deploy the edge function without JWT verification so map tiles can be fetched directly by the browser:

```bash
supabase secrets set REGRID_API_TOKEN=<YOUR_REGRID_API_TOKEN>
supabase secrets set REGRID_PARCEL_API_BASE=https://app.regrid.com
supabase secrets set REGRID_TILE_API_BASE=https://tiles.regrid.com
supabase functions deploy regrid-proxy --no-verify-jwt
```

### 6. Install dependencies and seed admin users

```bash
cd /home/deploy/apps/landportalv3
export PATH="/home/deploy/.local/bin:$PATH"
pnpm install
bash scripts/seed-supabase-admins.sh
```

### 7. Build and publish

```bash
cd /home/deploy/apps/landportalv3
export PATH="/home/deploy/.local/bin:$PATH"
NODE_OPTIONS="--max-old-space-size=1024" pnpm --filter @landportal/web build

sudo mkdir -p /var/www/landportalv3/current
sudo chown -R deploy:deploy /var/www/landportalv3
find /var/www/landportalv3/current -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
cp -r apps/web/dist/* /var/www/landportalv3/current/
```

If the server is low on RAM, add swap before building:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 8. Install nginx config

```bash
sudo cp /home/deploy/apps/landportalv3/ops/nginx/landportalv3.frcell.com.conf /etc/nginx/sites-available/landportalv3.frcell.com.conf
sudo ln -sf /etc/nginx/sites-available/landportalv3.frcell.com.conf /etc/nginx/sites-enabled/landportalv3.frcell.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Add HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d landportalv3.frcell.com
```

### 10a. Optional script to set Supabase Auth URLs

This repo now includes a helper script that uses the Supabase Management API to update `site_url` and merge the redirect allow-list without removing your existing entries.

Requirements:

- a Supabase personal access token
- `curl`
- `python3`

Example:

```bash
cd /home/deploy/apps/landportalv3
chmod +x scripts/set-supabase-auth-urls.sh
export SUPABASE_PROJECT_REF=gnvdiklymbsbtcdbrybj
export SUPABASE_MANAGEMENT_TOKEN=<your-supabase-pat>
bash scripts/set-supabase-auth-urls.sh https://landportalv3.frcell.com
```

The script will set:

- Site URL: `https://landportalv3.frcell.com`
- Redirect URL: `https://landportalv3.frcell.com/auth/reset-password`
- Redirect URL: `https://landportalv3.frcell.com/auth/update-password`

You can override the reset and update URLs by passing them as the second and third arguments.
### 10. Supabase Auth URL configuration

In Supabase `Authentication` -> `URL Configuration`, add:

- Site URL: `https://landportalv3.frcell.com`
- Redirect URL: `https://landportalv3.frcell.com/auth/update-password`
- Redirect URL: `https://landportalv3.frcell.com/auth/reset-password`

You can keep the existing V2 URLs too.

### Daily update flow on server

```bash
cd /home/deploy/apps/landportalv3
bash scripts/update-landportalv3.sh
```

### Local push deployment option

If you prefer to build locally and push `dist` over SSH instead of building on the VPS, use:

```bash
./scripts/deploy-landportalv3.sh deploy@YOUR_SERVER /var/www/landportalv3/current
```

On Windows PowerShell:

```powershell
./scripts/deploy-landportalv3.ps1 -RemoteTarget deploy@YOUR_SERVER -RemoteRoot /var/www/landportalv3/current
```

