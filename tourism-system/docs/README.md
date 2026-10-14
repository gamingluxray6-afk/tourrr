# Tourgo – folder layout

```
tourism-system/
├─ index.html            the app (the only page; QR codes open index.html?scan=…)
├─ manifest.json         makes it installable as a phone app
├─ service-worker.js     offline/fast loading – must stay next to index.html
│
├─ api/                  everything that runs on the server (PHP)
│  ├─ config.php         database login + APP_BASE_URL  ← edit this when going online
│  ├─ image_helper.php   saves pictures into /uploads, extra photos, admin check
│  ├─ get_data.php       spots, products, records, reviews, stats
│  ├─ login_process.php  sign in / sign up      me.php, logout.php, update_profile.php
│  ├─ add_/edit_ spot & product, add_review.php, add_admin_reply.php
│  ├─ scan_qr.php, qr_api.php            QR check-ins and spot QR codes
│  ├─ analytics_api.php, weather_api.php, users_api.php, records_api.php, redeem_points.php
│  └─ ai_chat.php, ai_config.php, auto_seed.php, php.ini   (optional / not used online)
│
├─ assets/
│  ├─ css/styles.css     all styling
│  ├─ js/script.js       all app logic
│  ├─ js/qrgen.js        QR code image generator
│  └─ icons/             app icons (home screen, browser tab)
│
├─ uploads/              spot, product and profile pictures (back this up with the database!)
├─ database/             naguilian_data.sql (sample data), fresh_start.sql (wipe sample data)
├─ docs/                 guides: GO-ONLINE-GUIDE.md, MOBILE-SETUP.md, INSTALL.txt, htaccess.txt
├─ tools/                1_START_ONLINE / 2_STOP_ONLINE / 3_REMOVE_AUTOSTART (Cloudflare, see docs/ONLINE-CLOUDFLARE.md), secure_port_8080.bat
└─ archive/              old files that are no longer used (safe to delete)
```

## Notes
- After changing `assets/css/styles.css` or `assets/js/script.js`, raise the `?v=` number in `index.html`
  and in `service-worker.js` (and the `CACHE` name) so phones download the new version.
- Picture paths saved in the database look like `uploads/abc123.jpg` (relative to `index.html`).
- Online, rename `docs/htaccess.txt` to `.htaccess` and put it next to `index.html`.
  It blocks the `database`, `docs`, `tools` and `archive` folders and the settings files in `api/`.
