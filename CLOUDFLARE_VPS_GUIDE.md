# 🚀 មគ្គុទ្ទេសក៍ដំឡើង VPS និងកំណត់ Cloudflare Edge Caching

ឯកសារនេះណែនាំពីរបៀបយកគម្រោង **NextGen News Website & CMS** ទៅដាក់លើ VPS និងភ្ជាប់ Domain ជាមួយ Cloudflare ដើម្បីឱ្យ Web ដើរលឿនដូចផ្លេកបន្ទោរ (Response 10-30ms)។

---

## ជំហានទី ១៖ ដាក់គម្រោងដំណើរការលើ VPS (VPS Deployment)

### វិធីទី ១៖ ប្រើ Docker (ងាយស្រួល និងសុវត្ថិភាពបំផុត)
នៅលើ VPS របស់អ្នក គ្រាន់តែ Copy ថតគម្រោងនេះទៅ ហើយដំណើរការ៖
```bash
docker compose up -d --build
```
វេបសាយនឹងដំណើរការលើ Port `3000` ដោយស្វ័យប្រវត្តិ។

### វិធីទី ២៖ ដំណើរការផ្ទាល់ជាមួយ Bun (លឿនខ្លាំងបំផុត)
1. ដំឡើង Bun លើ VPS៖
   ```bash
   curl -fsSL https://bun.sh/install | bash
   source ~/.bashrc
   ```
2. ដំឡើង Dependencies និងដំណើរការ៖
   ```bash
   bun install
   bun run src/index.ts
   ```
3. ដំណើរការជា Background Service ជាមួយ PM2 ឬ Systemd៖
   ```bash
   bun add -g pm2
   pm2 start "bun run src/index.ts" --name "news-app"
   pm2 save
   pm2 startup
   ```

---

## ជំហានទី ២៖ កំណត់ Domain និង DNS លើ Cloudflare

1. ចូលទៅកាន់ **Cloudflare Dashboard** -> ជ្រើសរើស Domain របស់អ្នក។
2. ចូលទៅ **DNS** -> **Records**៖
   * **Type:** `A`
   * **Name:** `@` (ឬ subdomain ដូចជា `news`)
   * **IPv4 address:** `IP នៃ VPS របស់អ្នក` (ឧ. 159.89.x.x)
   * **Proxy status:** **Proxied (🟠 ពណ៌ទឹកក្រូច)** <- ចាំបាច់ត្រូវបើកដើម្បីទទួលបាន CDN & DDoS Protection។
3. ចូលទៅ **SSL/TLS** -> ជ្រើសរើស **Full** ឬ **Full (strict)**។

---

## ជំហានទី ៣៖ កំណត់ Cloudflare Edge Cache Rules (ធ្វើឱ្យ Web លឿន 10-30ms)

ចូលទៅកាន់ **Caching** -> **Cache Rules** -> **Create rule**:

### Rule ១៖ កុំ Cache ផ្ទាំង Admin និង API (Bypass Cache for Admin & API)
* **Rule name:** `Bypass Admin & API`
* **When incoming requests match:**
  * `URI Path` contains `/admin` OR
  * `URI Path` contains `/api`
* **Cache eligibility:** **Bypass cache**

### Rule ២៖ Cache ទំព័រព័ត៌មានទាំងអស់ (Edge Cache Everything)
* **Rule name:** `Cache News Articles`
* **When incoming requests match:**
  * `URI Path` starts with `/article/` OR
  * `URI Path` starts with `/category/` OR
  * `URI Path` equals `/`
* **Cache eligibility:** **Eligible for cache**
* **Edge Cache TTL:** Override origin -> `Respect origin` ឬ `1 day`
* **Browser Cache TTL:** `4 hours`

> 💡 **លទ្ធផល:** នៅពេលអ្នកអានចូលមើលព័ត៌មាន Cloudflare នឹងបញ្ជូនទំព័រនោះចេញពី Data Center ជិតបំផុត (ដូចជា Cloudflare Phnom Penh ឬ Singapore PoP) ក្នុងរយៈពេលត្រឹមតែ **15ms - 30ms** ប៉ុណ្ណោះ ដោយមិនចាំបាច់រត់ទៅកាន់ VPS របស់អ្នកឡើយ!

---

## ជំហានទី ៤៖ Nginx Reverse Proxy (លើ VPS)

ដាក់ Nginx នៅពីមុខ Node/Bun ដើម្បីទទួល SSL ពី Cloudflare៖

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
