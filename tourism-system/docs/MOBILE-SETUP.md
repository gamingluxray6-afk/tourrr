> **Folder layout (October 2026):** the PHP files are in `api/`, styles and scripts in `assets/`, the SQL files in `database/`. See `docs/README.md`. File names in the older notes below are now inside those folders.

# Open Tourgo on your phone (XAMPP)

1. Phone and PC on the same Wi-Fi.
2. PC: `cmd` -> `ipconfig` -> note the IPv4 Address (example `192.168.1.15`).
3. Start Apache + MySQL in XAMPP. Allow Apache (port 80) through Windows Firewall (Private network).
   "Access forbidden"? In `xampp/apache/conf/extra/httpd-xampp.conf` use `Require all granted`, restart Apache.
4. Phone: open `http://192.168.1.15/tourism-system/` and log in as a **tourist** (admin accounts do not earn points).

## How scanning works now
Each spot's QR holds a link (`http://YOUR-IP/tourism-system/index.html?scan=ID-TOKEN`).
1. Tourist opens the phone's normal **Camera** app and points it at the QR.
2. Taps the link. The site opens and the **points are added automatically** (no photo, no extra button).
3. If not logged in yet, the site asks to log in, then adds the points right after. The phone stays logged in afterwards.
No https needed. (Scanning inside the app's own Scan QR button works too when the site is opened with https.)

## Scan inside the app (live camera, no photo)
The **Scan QR** button opens the live camera and reads the QR by itself. No photo is taken or saved. The moment a Tourgo QR is read, the points are added and the visit is saved with its date and time (see **My visits**).
Browsers only allow a live camera on **https**, so on plain `http://192.168.x.x/...` the button shows the Camera-app instructions instead. To make the in-app scanner work, pick one:
- **XAMPP https (easiest):** on the phone open `https://192.168.1.15/tourism-system/` (XAMPP already serves https on port 443). The browser warns about the certificate: tap **Advanced > Proceed**. Then the Scan QR button works. Open the admin QR window from the https address too, so printed QR links are https.
- **Android Chrome test shortcut:** open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://192.168.1.15`, set to Enabled, relaunch Chrome.
- **Public https link:** a free tunnel such as Cloudflare Tunnel or ngrok pointing at your XAMPP gives a real https address (then set `APP_BASE_URL` in `api/config.php` to it).

The phone **Camera app** route needs none of this and always works over http.

## Important: the link inside the QR
- It uses your PC's Wi-Fi IP, detected automatically. The admin QR window shows the exact link under the QR.
- If it shows the wrong address, set `APP_BASE_URL` in `api/config.php` (example: `'http://192.168.1.15/tourism-system'`).
- If your PC's IP changes, printed QR codes stop opening. Give the PC a fixed IP (router DHCP reservation) before printing.

## QR codes are one-to-one
- One permanent QR per spot (`spot_qr` table). Opening "Spot QR code" again shows the same QR.
- Admin can press **Generate new QR**; the old printed one stops working.
- QR codes printed before this update are plain text, so a phone camera will not open them. Open each spot's QR as admin and reprint.

## Files
Changed: index.html, script.js, styles.css, config.php, qr_api.php, scan_qr.php, login_process.php, update_profile.php
New: me.php (keeps you logged in), logout.php
Also from before: redeem_points.php, manifest.json, service-worker.js

## Private QR codes (made on your PC)
- Each spot gets its own secret random code, created by the server (`qr_api.php`) and stored in the `spot_qr` table. Nobody can guess it.
- The QR picture is now drawn inside the browser by `qrgen.js`. It is no longer sent to an outside website, so the private link stays on your PC and works with no internet for QR making.
- `qrgen.js` is in `assets/js/`.

## Open to any network (any Wi-Fi, mobile data, anywhere)
Your PC address (192.168.x.x) only works on your own Wi-Fi. To let ANY phone reach Tourgo, put it behind a public https address. This also makes the in-app live camera scanner work (it needs https).
**Your PC must stay on, with Apache + MySQL running, while people use the site.**

### Step 1: share ONLY the Tourgo folder (keeps phpMyAdmin private)
A tunnel exposes everything on the port it points to, including `/phpmyadmin` and the XAMPP dashboard. So give Tourgo its own port:
1. Open `xampp/apache/conf/httpd.conf`, add this line near the other `Listen` lines: `Listen 8080`
2. Open `xampp/apache/conf/extra/httpd-vhosts.conf` and add at the bottom (change the path to your folder):
```
<VirtualHost *:8080>
    DocumentRoot "C:/xampp/htdocs/tourism-system"
    <Directory "C:/xampp/htdocs/tourism-system">
        Require all granted
    </Directory>
</VirtualHost>
```
3. Restart Apache. Check `http://localhost:8080/` shows Tourgo.

### Step 2: make it public with a free tunnel
Cloudflare Tunnel (no account needed for a test link):
1. PC: open `cmd` and run `winget install Cloudflare.cloudflared`
2. Run `cloudflared tunnel --url http://localhost:8080`
3. It prints an address like `https://something-random.trycloudflare.com`. Open that on any phone, on any network.
The address changes every time you restart the tunnel, so QR codes printed with an old address stop working.

### Step 3: for printed QR codes, use a fixed address
- Free fixed address: ngrok gives one free static domain (`ngrok http --domain=YOUR-NAME.ngrok-free.app 8080`).
- Your own domain: a named Cloudflare Tunnel with a domain (about the price of the domain).
- Then set it in `api/config.php`: `define('APP_BASE_URL', 'https://YOUR-FIXED-ADDRESS');` and reprint the QR codes from the admin window.
- Without `APP_BASE_URL` it still works: the QR link is taken from whatever address the admin opened the site with (open the admin page from the public https address, not from localhost).

### Better long term: real web hosting
For a real tourism system, put the files and the database on web hosting (PHP + MySQL, e.g. Hostinger, InfinityFree). Then it is always on and has a permanent address. Upload the folder, import the database with phpMyAdmin, edit the database details at the top of `api/config.php`.

### Security changes made for going public
- Passwords are now stored hashed. Existing accounts keep working and are upgraded the first time they log in.
- `update_profile.php` only edits the logged-in user. `edit_spot.php` and `edit_product.php` are admin only.
- Login cookies are marked secure on https.
- Not covered: files I was not given (for example the add/delete spot and product files, review and ticket files). Add the same admin check at the top of each: `if (($_SESSION['user_role'] ?? '') !== 'admin') { echo json_encode(['success'=>false]); exit; }`
- Before going public, give MySQL `root` a password (phpMyAdmin > User accounts > root > Change password) and put the same password in `api/config.php`.
- Change the default admin password.

## Fresh start (empty system, you add everything)
1. Copy ALL the new files into your `tourism-system` folder (replace the old ones): index.html, script.js, styles.css, get_data.php, add_spot.php, add_product.php, edit_spot.php, edit_product.php, image_helper.php, analytics_api.php, auto_seed.php (now does nothing), qrgen.js, and the `uploads` folder.
2. Open phpMyAdmin > database `tourgo_db` > **SQL** tab, paste the contents of `fresh_start.sql` and press **Go**. This deletes all sample spots, products, reviews, visitor records, QR codes and check-ins. Accounts are kept.
3. Delete `ai_chat.php` and `naguilian_data.sql` from the folder (the AI is gone, and the sample data must not come back).
4. Log in as admin, then add your spots (pin them on the map) and products (pin where to buy).

## Pictures
Pictures are shrunk on the phone/PC and saved as files in the `uploads` folder; the database keeps only the file name. Do not delete the `uploads` folder or you lose the pictures. Back it up together with the database.

## Where to buy
Open a product, tap **Where to buy**. The map opens with an orange shopping pin on the exact place the admin pinned, plus a Navigate button.

## Analytics (admin)
Open it from the top menu or from the **Analytics** button under your profile. Pick Today, Last 7/30 days, This month, This year, All time, a **month**, or your own **From / To** dates. You can also choose one place, and switch between **Recorded visitors** (from Records) and **QR check-ins**. Export CSV saves what you are looking at.
