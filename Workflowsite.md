# 🚀 SYSTEM CONCEPT & OPERATIONAL WORKFLOW GUIDE
**Website:** `https://topusanewsstory.com` | **CMS:** `https://topusanewsstory.com/admin`  
**Server IP:** `2.25.237.28` | **Tech Stack:** Bun Runtime • Hono Framework • SQLite (WAL Mode) • Cloudflare CDN  

---

## 📌 មាតិកា (Table of Contents)
1. [ទិដ្ឋភាពទូទៅនៃស្ថាបត្យកម្មប្រព័ន្ធ (Architecture Overview)](#1-architecture-overview)
2. [គណនី និងសុវត្ថិភាព Admin CMS (Authentication & Security)](#2-authentication--security)
3. [ប្រព័ន្ធ Editor និង Visual Sync (Dual-Mode Editor)](#3-dual-mode-editor)
4. [ម៉ាស៊ីនជំនួយការ TK Summary AI (Editorial AI Engine)](#4-tk-summary-ai-engine)
5. [TK Link (៦ ខ្ទង់) - Pretty Links Alternative](#5-tk-link-system)
6. [ប្រព័ន្ធរាប់ចំនួនអ្នកមើល Real-Time (Whos.amung.us RAM Engine)](#6-real-time-visitor-tracking)
7. [ដំណើរការ Auto-Deploy និងសុវត្ថិភាពទិន្នន័យ (Deployment Workflow)](#7-automated-deployment--backups)
8. [ការណែនាំផ្លាស់ប្តូរ VPS ទៅកាន់ Server ថ្មី (VPS Migration Guide)](#8-vps-migration-guide)

---

## 1. Architecture Overview
ប្រព័ន្ធនេះត្រូវបានបង្កើតឡើងដើម្បីល្បឿនលឿនបំផុត (Sub-millisecond latency) ដោយមិនប្រើប្រាស់ WordPress ឬ Plugins ធ្ងន់ៗដែលងាយនឹងគាំង ឬស៊ី RAM ឡើយ៖
* **Runtime:** [Bun](https://bun.sh) (លឿនជាង Node.js ពី ៣ ទៅ ៤ ដង)
* **Framework:** [Hono v4](https://hono.dev) (Ultra-fast, lightweight web framework)
* **Database:** SQLite ដំណើរការក្នុងទម្រង់ WAL (Write-Ahead Logging) ស្ថិតនៅ `/var/www/data/news.sqlite` (ដាច់ដោយឡែកពី Git directory ដើម្បីការពារកុំឱ្យបាត់ទិន្នន័យពេល deploy)
* **Edge Acceleration:** Cloudflare CDN (Full Page Cache ជាមួយ `stale-while-revalidate` និង Global Invalidation <30ms)

---

## 2. Authentication & Security
* **ផ្លូវចូល Login:** `https://topusanewsstory.com/admin/login`
* **Default Credentials:**
  * **Username:** `admin`
  * **Password:** `admin@12345`
* **Session Persistence:** ប្រព័ន្ធរក្សា Token នៅក្នុង Browser Cookie និង Memory ធ្វើឱ្យពេលបិទ Browser ហើយបើកឡើងវិញ មិនចាំបាច់ Login ម្តងទៀតឡើយ។

---

## 3. Dual-Mode Editor
ផ្ទាំងសរសេរអត្ថបទ (Article Editor) ត្រូវបានរចនាឡើងយ៉ាងងាយស្រួល ទាំងលើ Computer និងទូរស័ព្ទដៃ៖
* **Visual Editor (WYSIWYG):** ផ្ទាំងសរសេរផ្ទាល់ភ្នែក ងាយស្រួល format អក្សរដិត ទ្រេត ចំណងជើង H2, H3 និង callout boxes។
* **HTML Editor:** ផ្ទាំងកូដ HTML ផ្ទាល់សម្រាប់អ្នកជំនាញកែសម្រួល tags និង styling លម្អិត។
* **Split View:** បង្ហាញអេក្រង់ចែកជាពីរ (ខាងឆ្វេង HTML, ខាងស្តាំ Visual) ជាមួយប្រព័ន្ធ Two-Way Live Sync ភ្លាមៗ។
* **Mobile Optimized:** គម្លាតកថាខណ្ឌ (Paragraph Spacing) ត្រឹមត្រូវតាមស្ដង់ដារ UI/UX ទូរស័ព្ទដៃ មិនវែងជ្រុល។

---

## 4. TK Summary AI Engine
ផ្ទាំងជំនួយការឆ្លាតវៃ TK Summary Classic v2.5 AI បំពាក់ដោយមុខងារសំខាន់ៗ៖

### ក. 15 Editorial Newsroom Styles
លោកអ្នកអាចជ្រើសរើស Style កាសែតអន្តរជាតិល្បីៗចំនួន ១៥ (CNN, Daily Mail, Fox News, AP Wire, People Magazine, TMZ, BuzzFeed, Breaking Express, Tabloid, News Analysis, Axios Express, USA Viral Hook, NYT Explainer, Substack Newsletter, Investigative):
* **Visual Selection:** ចុចលើ Card វានឹងលោតស៊ុមពណ៌ទឹកក្រូចដិត `#C25E3E`, Background ពណ៌ក្រែមស្រាល `#FFF5F0` និងសញ្ញាធីក `✓` (Checkmark badge) ភ្លាមៗ។
* **Quick Apply Bar:** មានប៊ូតុង `⚡ Apply [Style] Style` នៅផ្ទាល់លើ Step 2 មិនបាច់ scroll ចុះក្រោម។
* **Double Click:** ចុច ២ ដងលើ Card ណាមួយ វានឹង Format ចូល Editor ភ្លាមមួយរំពេច។

### ខ. Article & Image Fetcher
* អាចបិទភ្ជាប់ (Paste) Link ពីកាសែតណាក៏បាន (CNN, Top Story USA, លោកអ្នកមិនបាច់វាយ `https://` ក៏ប្រព័ន្ធ auto-complete ឱ្យដែរ)។
* បំពាក់ប្រព័ន្ធ **Googlebot Fallback Header** ដែលអាចឆ្លងកាត់ការបិទខ្ទប់របស់ Cloudflare/Anti-Bot ដើម្បីទាញយក Headline, Summary, Content និង Featured Image ដោយស្វ័យប្រវត្តិ។

### គ. Google Gemini AI & Rule-based Formatter
* **✨ Only Format (រក្សាពាក្យដើម):** រៀបចំរចនាសម្ព័ន្ធអត្ថបទ និងប្រអប់ Highlight តាម Style នីមួយៗដោយរក្សាពាក្យ សម្រង់សម្តី និងការពិត ១០០% មិនកែប្រែ (មិនត្រូវការ Gemini API Key ឡើយ)។
* **⚡ AI Rewrite:** សរសេរអត្ថបទឡើងវិញតាមសំនៀង និងវេយ្យាករណ៍របស់ Brand កាសែតនីមួយៗតាមរយៈ Google Gemini Flash។
* **🇰🇭 AI Khmer Translation:** បកប្រែអត្ថបទទាំងមូលជាភាសាខ្មែរបែបសារព័ត៌មានយ៉ាងរលូន។
* **WebP Image Studio:** បម្លែងរូបភាពទៅជា WebP និងសម្អាត Link ដើមដើម្បីកុំឱ្យជាប់ footprint។

---

## 5. TK Link System (៦ ខ្ទង់ - Pretty Links Alternative)
ប្រព័ន្ធជំនួស Pretty Links ដោយផ្ទាល់លើ Server មិនបាច់ប្រើ Plugin WordPress៖
* **ទម្រង់ Link:** បង្កើត Link ៦ ខ្ទង់ស្អាត (ឧ. `https://topusanewsstory.com/asdfef`)។
* **Batch Generator:** អាចជ្រើសរើសចំនួន Link ដែលចង់បង្កើត (ឧ. 2, 5, 10, 50, 100 links) សម្រាប់អត្ថបទតែមួយ។
* **Clean Redirect (គ្មានកន្ទុយរញេរញៃ):** ពេល Visitor ចុចលើ TK Link វានឹងបញ្ជូន (302 Redirect) ទៅកាន់ Post ដើមស្អាត (Clean Canonical URL) ដោយគ្មានកន្ទុយ tracking ឬ affiliate parameter ដែលធ្វើឱ្យប៉ះពាល់ដល់ការផុស ឬ Comment លើ Facebook ឡើយ។
* **Click Tracking:** រាប់ចំនួន Click ជាក់ស្ដែងលើ link នីមួយៗរក្សាទុកក្នុង SQLite។
* **Quick Tools:** ប៊ូតុង Copy មួយៗ និងប៊ូតុង **📋 Copy All Links** ងាយស្រួលយកទៅប្រើប្រាស់។

---

## 6. Real-Time Visitor Tracking (Whos.amung.us RAM Engine)
* **High Performance:** ដំណើរការលើ Memory RAM ផ្ទាល់ឆ្លើយតបក្រោម `<0.001ms` មិនធ្វើឱ្យ Database ធ្លាក់ល្បឿនឡើយ។
* **Metrics:** បង្ហាញចំនួនអ្នកកំពុង Online ជាក់ស្ដែង, ទំព័រដែលកំពុងមើល (Active Pages) និងស្ថិតិប្រទេស (Country Distribution)។
* **Anti-Snooping:** ការពារកូដ Tracking មិនឱ្យ Developer ឬគូប្រជែងអាចចូលទៅ inspect មើលកូដ tracker ដោយងាយស្រួលឡើយ។

---

## 7. Automated Deployment & Backups
រាល់ការកែប្រែកូដត្រូវបានការពារ និង Deploy ទៅកាន់ Production យ៉ាងមានសុវត្ថិភាពតាមរយៈ Script ស្វ័យប្រវត្តិ៖

### បញ្ជា Deploy:
```bash
./scripts/auto-deploy.sh "សារពិពណ៌នាការកែប្រែ"
```

### ដំណើរការស្វ័យប្រវត្តិនៃ Script:
1. **Git Commit & Push:** រុញកូដទៅកាន់ GitHub Repository (`main` branch)។
2. **Safe Database Protection:** Database នៅលើ VPS ស្ថិតនៅ `/var/www/data/news.sqlite` (ក្រៅ Git Tree) ធានាថាការ Pull កូដថ្មីមិនប៉ះពាល់ដល់អត្ថបទដែលបានផុសឡើយ។
3. **Automatic SQLite Backup:** រាល់ពេល Deploy ប្រព័ន្ធនឹង Copy Database បម្រុងទុកទៅក្នុង `/var/www/data/backups/news_backup_YYYYMMDD_HHMMSS.sqlite` ដោយស្វ័យប្រវត្តិ (រក្សាទុក ២០ file ចុងក្រោយ)។
4. **Zero-Downtime Reload:** Systemd restart សេវាកម្ម Bun ឡើងវិញក្នុងរយៈពេល <1 វិនាទី។
5. **Edge Cache Purge:** Cloudflare CDN ធ្វើបច្ចុប្បន្នភាពទំព័រថ្មីទូទាំងពិភពលោក។

---

## 8. VPS Migration Guide (ការប្ដូរ VPS ដោយមិនបាត់ទិន្នន័យ)
នៅពេលអនាគត ប្រសិនបើលោកអ្នកចង់ប្តូរទៅកាន់ Server ឬ VPS ថ្មី អ្នកគ្រាន់តែអនុវត្តតាម ៤ ជំហានខាងក្រោម នោះភ្ញៀវដែលចុច Link ចាស់ៗ (រួមទាំង TK Links ៦ ខ្ទង់) នឹងនៅតែចូលអានបាន ១០០%៖

### ជំហានទី ១៖ ដំឡើងបរិស្ថានលើ VPS ថ្មី
```bash
# 1. ដំឡើង Bun Runtime
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 2. Clone កូដពី GitHub
mkdir -p /var/www/news
git clone https://github.com/ponpao2022-collab/main-website-usa.git /var/www/news
cd /var/www/news
bun install
```

### ជំហានទី ២៖ ផ្ទេរ Database SQLite ទៅ VPS ថ្មី
លោកអ្នកគ្រាន់តែ Copy ហ្វាល `/var/www/data/news.sqlite` ពី Server ចាស់ មកកាន់ Server ថ្មី៖
```bash
# នៅលើ VPS ថ្មី៖
mkdir -p /var/www/data/backups
# Copy file តាមរយៈ SCP (ឧទាហរណ៍):
# scp root@2.25.237.28:/var/www/data/news.sqlite /var/www/data/news.sqlite
```

### ជំហានទី ៣៖ បង្កើត Systemd Service លើ VPS ថ្មី
បង្កើតហ្វាល `/etc/systemd/system/news.service`:
```ini
[Unit]
Description=Top USA News Story Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/news
ExecStart=/root/.bun/bin/bun run src/index.ts
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```
បើកដំណើរការសេវាកម្ម៖
```bash
sudo systemctl daemon-reload
sudo systemctl enable news
sudo systemctl start news
```

### ជំហានទី ៤៖ ប្តូរ IP នៅលើ Cloudflare DNS
* ចូលទៅកាន់គណនី Cloudflare របស់អ្នក
* ចូលទៅកាន់ **DNS Records** នៃ domain `topusanewsstory.com`
* ប្តូរ **A Record** ពី IP ចាស់ (`2.25.237.28`) ទៅកាន់ **IP នៃ VPS ថ្មី** របស់អ្នក
* រក្សាទុក (Save) ជាការស្រេច! 
* ត្រឹមតែ ២ ទៅ ៥ នាទី Cloudflare នឹងបញ្ជូន Traffic ទាំងអស់ទៅ VPS ថ្មីដោយស្វ័យប្រវត្តិ ដោយរាល់ TK Links, អត្ថបទ និងស្ថិតិទាំងអស់ដំណើរការបន្តឥតមានចន្លោះប្រហោងឡើយ។

---
*ឯកសារនេះត្រូវបានបង្កើតឡើងសម្រាប់ជាស្តង់ដារប្រតិបត្តិការនៃគម្រោង `topusanewsstory.com`។*
