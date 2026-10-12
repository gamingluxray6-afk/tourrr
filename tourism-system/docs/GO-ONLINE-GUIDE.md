# Tourgo: put it online 24/7 and install it as an app

Do this **tonight**. A new free address can take from a few minutes to a few hours to start working, so do not leave it until the morning.

## Part 1. Put Tourgo on free web hosting (always on, no PC needed)

Recommended free host: **InfinityFree** (infinityfree.com). It gives PHP, MySQL, free https and no ads. Limits to know: about 50,000 hits per day (plenty for a thesis test) and **no uptime guarantee**. If you can pay a little, a cheap paid host (for example Hostinger) is more reliable for a real test day. The steps below are the same for any host with PHP + MySQL.

### Step 1. Make the account and the website
1. Sign up at infinityfree.com and create a hosting account.
2. Choose a free address (example: `tourgo-naguilian`). Write down the full address it gives you, for example `https://tourgo-naguilian.infinityfreeapp.com`. This is your **permanent address**.
3. Wait until the account says **Active**.

### Step 2. Make the database
1. In the hosting control panel open **MySQL Databases** and create a database (example: `tourgo`).
2. Write down these four things exactly as shown. They are NOT `localhost` and `root`:
   - MySQL **host name** (looks like `sql123.infinityfree.com`)
   - **database name** (looks like `if0_12345678_tourgo`)
   - **username** (looks like `if0_12345678`)
   - **password** (your hosting account password or the one shown)

### Step 3. Copy your data from your PC to the host
1. On your PC open `http://localhost/phpmyadmin`, click database `tourgo_db`, then **Export**, choose **Quick** and **SQL**, press **Go**. A `.sql` file downloads. This contains your accounts, spots, products, tickets and check-ins.
2. On the host open **phpMyAdmin**, click your new database, then **Import**, choose that file, press **Go**.
   - If it says the file is too big, tell me the size and I will help you split it.

### Step 4. Edit api/config.php (on your PC, before uploading)
Open `api/config.php` and change only these lines at the top:
```php
$host = 'sql123.infinityfree.com';      // your MySQL host name
$dbname = 'if0_12345678_tourgo';         // your database name
$username = 'if0_12345678';              // your database username
$password = 'YOUR-DB-PASSWORD';          // your database password
define('APP_BASE_URL', 'https://tourgo-naguilian.infinityfreeapp.com');  // your permanent address, no slash at the end
```
`APP_BASE_URL` makes every QR code carry your permanent address, so printed QR codes never stop working.

### Step 5. Upload the files
Use **FileZilla** (free FTP program). The host's control panel shows the FTP host, username and password.
1. Connect, open the folder called **htdocs** on the host.
2. Upload everything from `C:\xampp\htdocs\tourism-system` **including the `uploads` folder** (your spot and product pictures).
3. The site is organized in folders. Upload **only these** (keep the folders): `index.html`, `manifest.json`, `service-worker.js`, the `api` folder (with your edited `config.php`), the `assets` folder and the `uploads` folder.
4. Upload `docs/htaccess.txt` next to `index.html`, then **rename it to `.htaccess`** on the host (with the dot).

**Do NOT upload:** the `database`, `docs`, `tools` and `archive` folders, `api/ai_chat.php`, `api/ai_config.php`, `api/php.ini`, any `.backup` file.

### Step 6. Test
1. Open your address on your phone with **mobile data**. Tourgo should load.
2. Log in as admin. **Change the admin password now** (profile > password).
3. Open a spot's QR window. The link under the QR must start with your permanent address.
4. Log in as a tourist on another phone, scan that QR, and check the points. Then check **Analytics** and **Users** as admin.
5. Create a test review as a tourist. Reply to it as admin.

If any step shows an error, send me a screenshot of it.

## Part 2. Install it as an app

### The easy way: install from the browser (works today)
Needs the https address from Part 1.
- **Android (Chrome):** open your address, tap the **three dots menu > Install app** (or "Add to Home screen"). Tourgo appears on the home screen with the compass icon and opens full screen with no browser bar.
- **iPhone (Safari):** open your address, tap **Share > Add to Home Screen**.

### A real APK file (optional, Android)
1. Go to **pwabuilder.com** on a computer and paste your permanent address.
2. Click **Package for stores > Android**, fill in the app name (Tourgo) and package id (example `com.naguilian.tourgo`), then **Generate**.
3. Download the zip. It contains an `.apk` you can send to phones. On the phone, allow "install unknown apps" for the app you opened it with.
4. **Keep the signing key file** it gives you. You need it for any future update.
This needs the permanent address, so do Part 1 first. Test the installed browser version before trying the APK.

## Part 3. Backup plan for tomorrow (if the host is not ready)
If the free host is not active in time, use the tunnel on your PC with a fixed address:
1. Make a free account at ngrok.com and claim the free static domain.
2. Keep XAMPP (Apache + MySQL) running and the PC awake and plugged in.
3. Run `ngrok http --domain=YOUR-NAME.ngrok-free.app 8080`
4. Set `APP_BASE_URL` in `api/config.php` to that address and make the QR codes again.

## Before real people use it (thesis data)
- You are collecting names and emails, so show a short **consent / privacy notice** before sign-up and tell participants what is collected and why. Your school or adviser may require this. In the Philippines this falls under the Data Privacy Act (RA 10173).
- Keep a **backup** of the database: phpMyAdmin > Export, once a day while testing.
- Keep the `uploads` folder backed up together with the database.
- Never share the admin password.
