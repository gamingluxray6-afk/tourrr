@echo off
title Tourgo - remove auto start
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tourgo_online.ps1" -Mode remove-autostart
