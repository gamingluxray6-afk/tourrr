@echo off
title Tourgo - secure port 8080
set "XAMPP=C:\xampp"
set "FOLDER=tourism-system"
set "SITE=C:/xampp/htdocs/%FOLDER%"
set "CONF=%XAMPP%\apache\conf\httpd.conf"
set "BLOCK=%TEMP%\tourgo_block.txt"

echo.
echo === Tourgo: lock down port 8080 ===
echo.

if not exist "%CONF%" (
    echo ERROR: Could not find %CONF%
    echo.
    pause
    exit /b 1
)

findstr /C:"# Tourgo public port" "%CONF%" >nul 2>&1
if errorlevel 1 (
    echo ERROR: The Tourgo block was not found in httpd.conf. Run setup_port_8080.bat first.
    echo.
    pause
    exit /b 1
)

copy "%CONF%" "%CONF%.backup3" >nul
if errorlevel 1 (
    echo ERROR: Could not save a backup. Right-click this file and choose "Run as administrator".
    echo.
    pause
    exit /b 1
)

> "%BLOCK%" echo # Tourgo public port
>> "%BLOCK%" echo Listen 8080
>> "%BLOCK%" echo ^<VirtualHost *:8080^>
>> "%BLOCK%" echo     DocumentRoot "%SITE%"
>> "%BLOCK%" echo     DirectoryIndex index.html
>> "%BLOCK%" echo     ^<Directory "%SITE%"^>
>> "%BLOCK%" echo         Options -Indexes
>> "%BLOCK%" echo         Require all granted
>> "%BLOCK%" echo     ^</Directory^>
>> "%BLOCK%" echo     # XAMPP tools are never available on the public port
>> "%BLOCK%" echo     ^<Location "/phpmyadmin"^>
>> "%BLOCK%" echo         Require all denied
>> "%BLOCK%" echo     ^</Location^>
>> "%BLOCK%" echo     ^<Location "/phpMyAdmin"^>
>> "%BLOCK%" echo         Require all denied
>> "%BLOCK%" echo     ^</Location^>
>> "%BLOCK%" echo     ^<Location "/webalizer"^>
>> "%BLOCK%" echo         Require all denied
>> "%BLOCK%" echo     ^</Location^>
>> "%BLOCK%" echo     ^<Location "/licenses"^>
>> "%BLOCK%" echo         Require all denied
>> "%BLOCK%" echo     ^</Location^>
>> "%BLOCK%" echo     ^<Location "/server-status"^>
>> "%BLOCK%" echo         Require all denied
>> "%BLOCK%" echo     ^</Location^>
>> "%BLOCK%" echo     ^<Location "/server-info"^>
>> "%BLOCK%" echo         Require all denied
>> "%BLOCK%" echo     ^</Location^>
>> "%BLOCK%" echo     # database dumps, notes and settings files cannot be downloaded
>> "%BLOCK%" echo     ^<FilesMatch "\.(sql^|md^|ini^|bak^|backup^|log)$"^>
>> "%BLOCK%" echo         Require all denied
>> "%BLOCK%" echo     ^</FilesMatch^>
>> "%BLOCK%" echo     # speed: compress text files and let phones keep files they already downloaded
>> "%BLOCK%" echo     ^<IfModule mod_deflate.c^>
>> "%BLOCK%" echo         AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json image/svg+xml
>> "%BLOCK%" echo     ^</IfModule^>
>> "%BLOCK%" echo     ^<IfModule mod_expires.c^>
>> "%BLOCK%" echo         ExpiresActive On
>> "%BLOCK%" echo         ExpiresByType text/css "access plus 1 day"
>> "%BLOCK%" echo         ExpiresByType text/javascript "access plus 1 day"
>> "%BLOCK%" echo         ExpiresByType application/javascript "access plus 1 day"
>> "%BLOCK%" echo         ExpiresByType image/jpeg "access plus 30 days"
>> "%BLOCK%" echo         ExpiresByType image/png "access plus 30 days"
>> "%BLOCK%" echo         ExpiresByType image/webp "access plus 30 days"
>> "%BLOCK%" echo         ExpiresByType image/gif "access plus 30 days"
>> "%BLOCK%" echo     ^</IfModule^>
>> "%BLOCK%" echo ^</VirtualHost^>

powershell -NoProfile -Command "$p='%CONF%'; $t=[IO.File]::ReadAllText($p); $n=([IO.File]::ReadAllText('%BLOCK%')).Trim(); $r=[regex]::new('(?s)# Tourgo public port.*?</VirtualHost>'); if(-not $r.IsMatch($t)){exit 2}; [IO.File]::WriteAllText($p, $r.Replace($t,[System.Text.RegularExpressions.MatchEvaluator]{param($m) $n}))"
if errorlevel 1 (
    echo ERROR: Could not update httpd.conf. Right-click this file and choose "Run as administrator".
    echo Your old file is safe: %CONF%.backup3
    echo.
    pause
    exit /b 1
)

findstr /B /C:"LoadModule deflate_module" "%CONF%" >nul 2>&1 || echo NOTE: mod_deflate is switched off in httpd.conf, so compression will not work.
findstr /B /C:"LoadModule expires_module" "%CONF%" >nul 2>&1 || echo NOTE: mod_expires is switched off in httpd.conf, so caching will not work.
echo Checking the new settings...
"%XAMPP%\apache\bin\httpd.exe" -t
echo.
echo If the line above says "Syntax OK", the lock is in place.
echo If it shows an error, copy httpd.conf.backup3 over httpd.conf to undo, and send me the message.
echo.
echo NEXT: in the XAMPP Control Panel click Stop on Apache, wait a few seconds, then Start.
echo Then test:
echo   http://localhost:8080/            -  should show Tourgo
echo   http://localhost:8080/phpmyadmin  -  should say "Forbidden"
echo.
pause
