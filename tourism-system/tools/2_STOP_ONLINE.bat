@echo off
title Tourgo - stop
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tourgo_online.ps1" -Mode stop
