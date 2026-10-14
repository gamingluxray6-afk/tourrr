# LakbayNaguilian

LakbayNaguilian is a tourism app for Naguilian, La Union. Tourists scan QR codes at tourist spots to earn points, trade points for tickets and rewards, browse local products and stores, and leave reviews. The admin manages spots, products, stores, categories, tickets and users, and sees visitor analytics with the daily weather.

It runs on your own Windows PC with XAMPP. Phones can open it on the same Wi-Fi, or from anywhere through a free Cloudflare link.

## What you need

- **Windows 10 or 11**
- **XAMPP** with PHP 8.2 and MariaDB (MySQL) from https://www.apachefriends.org. LakbayNaguilian was built on XAMPP 8.2.12.
- **Internet** for the map, the weather and the fonts. The rest of the app works offline.
- **cloudflared** only if you want an online link (see [Put it online](#6-put-it-online-optional)).

## 1. Put the files in place

Copy the whole `tourism-system` folder to:

```
C:\xampp\htdocs\tourism-system
```

## 2. Start XAMPP

Open the **XAMPP Control Panel** and press **Start** on **Apache** and **MySQL**. Both should turn green.

## 3. Create the database

Do this once, on a new PC.

1. Open http://localhost/phpmyadmin
2. Click **Import**, choose `database\tourgo_schema.sql`, and press **Import** (or **Go**) at the bottom.

This creates the `tourgo_db` database with all its tables and the starting list of tickets and rewards. It has no accounts in it. Running it again later is safe: it only adds what's missing and never deletes anything.

**Optional sample data:** to fill the app with real Naguilian spots and products, select `tourgo_db` on the left, then import `database\naguilian_data.sql`. This **replaces** all spots, products and reviews, so use it only on a new install.

The database login is in `api\config.php` (user `root`, no password, as XAMPP sets it up). Change it there if your MySQL is set up differently.

## 4. Open the app

Go to:

```
http://localhost/tourism-system/
```

### Make the first admin account

Every new sign-up is a tourist. To get an admin:

1. Sign up in the app with your own name, email and password.
2. In phpMyAdmin, select `tourgo_db`, open the **SQL** tab, and run this, using your email:

   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
   ```

3. Log out of LakbayNaguilian and log in again. You now have the admin pages: Analytics, Users, Place Reviews and the add/edit buttons.

## 5. Use it on phones (same Wi-Fi)

1. Find your PC's IP address: open Command Prompt, type `ipconfig`, and look for **IPv4 Address** (for example `192.168.1.20`).
2. On the phone, open `http://192.168.1.20/tourism-system/` (use your own IP).
3. If the phone can't connect, allow **Apache HTTP Server** through Windows Firewall when Windows asks, or under *Windows Security > Firewall > Allow an app*.

For QR codes to open the right address on the same Wi-Fi, set `APP_BASE_URL` in `api\config.php` to `''` (empty). LakbayNaguilian then finds the PC's address by itself.

On a phone you can also choose **Add to Home Screen** in the browser to install LakbayNaguilian like an app.

More detail: [docs/MOBILE-SETUP.md](docs/MOBILE-SETUP.md)

## 6. Put it online (optional)

This gives a public `https://….trycloudflare.com` link that works on any Wi-Fi or mobile data, as long as this PC is on.

### One-time setup

**a) Install cloudflared** from https://github.com/cloudflare/cloudflared/releases (the Windows `.msi`). It installs to `C:\Program Files (x86)\cloudflared\`.

**b) Open port 8080 for LakbayNaguilian only.** The online link only shares LakbayNaguilian, never phpMyAdmin. Open `C:\xampp\apache\conf\httpd.conf` in Notepad and add this at the end:

```apache
Listen 8080
<VirtualHost *:8080>
    DocumentRoot "C:/xampp/htdocs/tourism-system"
    DirectoryIndex index.html
    <Directory "C:/xampp/htdocs/tourism-system">
        Options -Indexes
        Require all granted
    </Directory>
    <LocationMatch "^/(phpmyadmin|phpMyAdmin|webalizer|licenses|server-status|server-info)">
        Require all denied
    </LocationMatch>
    <FilesMatch "\.(sql|md|ini|bak|backup|log)$">
        Require all denied
    </FilesMatch>
</VirtualHost>
```

Save the file, then **Stop** and **Start** Apache in the XAMPP Control Panel. Check that http://localhost:8080/ shows LakbayNaguilian.

### Go online and offline

Everything is in the `tools` folder:

| Double-click | What it does |
|---|---|
| `1_START_ONLINE.bat` | Starts XAMPP if needed and opens a Cloudflare link. The link is copied for you, saved on your Desktop in **Tourgo link.txt**, and put into `api\config.php` so new QR codes use it. Keep the window open; if the link drops it opens a new one by itself. After the first run, LakbayNaguilian also goes online by itself each time you log in to Windows. |
| `2_STOP_ONLINE.bat` | Takes LakbayNaguilian offline. |
| `3_REMOVE_AUTOSTART.bat` | Stops LakbayNaguilian from going online by itself when Windows starts. |

**The link changes** every time it restarts (PC restart, internet drop). Printed QR codes only work while the same link is running, so after a restart, print the spot QR codes again from the admin's **Spot QR** button. For an address that never changes, see [docs/ONLINE-CLOUDFLARE.md](docs/ONLINE-CLOUDFLARE.md) and [docs/GO-ONLINE-GUIDE.md](docs/GO-ONLINE-GUIDE.md).

## Settings

| File | What's in it |
|---|---|
| `api\config.php` | Database login, and `APP_BASE_URL`: the address QR codes open. Empty `''` = auto (same Wi-Fi). The online tools fill it in for you. |
| `api\ai_config.php` | Optional AI chat: put an Anthropic API key in `ANTHROPIC_API_KEY`. Leave it empty to keep the chat off. |
| `api\weather_api.php` | Weather comes from Open-Meteo (free, no key) for Naguilian. Change `WX_LAT` / `WX_LON` for another place. |

## Folders

```
tourism-system/
├─ index.html           the whole app (one page)
├─ manifest.json        lets phones install it like an app
├─ service-worker.js    fast loading and the app's saved copy on phones
├─ api/                 the server side (PHP): login, spots, products, QR, tickets, analytics, weather
├─ assets/              styles.css, script.js, qrgen.js and the app icons
├─ uploads/             every picture people upload (spots, products, stores, profiles)
├─ database/            tourgo_schema.sql (new install), naguilian_data.sql (sample data), fresh_start.sql
├─ docs/                extra guides
├─ tools/               go online / offline with Cloudflare
└─ archive/             old files that are no longer used
```

## Making changes

After you edit `assets\css\styles.css` or `assets\js\script.js`, raise the version numbers so phones download the new files:

- in `index.html`: `styles.css?v=…` and `script.js?v=…`
- in `service-worker.js`: the same two numbers, and the `CACHE` name (`tourgo-v…`)

## Backups

Back up both of these together:

- **The database:** phpMyAdmin > `tourgo_db` > **Export** > **Go**, or in Command Prompt:
  `C:\xampp\mysql\bin\mysqldump.exe -u root tourgo_db > tourgo_backup.sql`
- **The `uploads` folder:** the pictures. The database only stores their file names.

## If something goes wrong

| Problem | Fix |
|---|---|
| Apache won't start | Port 80 is taken, often by Skype, IIS or another web server. Close it, or change Apache's port in XAMPP. |
| MySQL won't start | Another MySQL is running, or MySQL wasn't shut down properly. Restart the PC and try again. |
| "Database connection failed" | MySQL is off, or the login in `api\config.php` is wrong. Did you import `tourgo_schema.sql`? |
| A phone shows the old version | Close the app or tab completely and open it again. |
| "Invalid QR code" | The QR code was made with an old link. Print it again from **Spot QR**. |
| The weather is empty | The PC needs internet. Weather is saved when the admin opens Analytics. |
| The online link gives error 530 | That link has stopped. Run `tools\1_START_ONLINE.bat` and use the new link in **Tourgo link.txt**. |
