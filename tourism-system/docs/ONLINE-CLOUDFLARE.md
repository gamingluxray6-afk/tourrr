# Tourgo online with Cloudflare (any Wi-Fi or mobile data)

- **Go online:** double-click `tools\1_START_ONLINE.bat`. It starts XAMPP if needed, opens a Cloudflare link,
  copies the link, saves it on the Desktop in **Tourgo link.txt**, and puts it in `api/config.php`
  so QR codes made from then on open that link. If the link drops, it opens a new one by itself.
- **Starts with Windows:** after the first start it goes online by itself when you log in (hidden).
  Look in **Tourgo link.txt** on the Desktop for the current address.
- **Go offline:** `tools\2_STOP_ONLINE.bat`. **Stop the auto start:** `tools\3_REMOVE_AUTOSTART.bat`.
- Only the locked Tourgo site (port 8080) is shared; phpMyAdmin and the settings files are blocked.

## The address changes
A free Cloudflare quick link gets a **new random address every time it starts** (PC restart, internet drop).
Printed QR codes only keep working while that same link is running. After a restart, print the QR codes again
from the admin "Spot QR code" window.

For an address that never changes: buy a domain (about $10/year, e.g. on Cloudflare) and use a named
Cloudflare tunnel with it. Then the QR codes never need reprinting.
