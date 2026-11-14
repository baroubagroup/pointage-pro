@echo off
title Serveur PointagePro API & Dashboard
echo ==========================================================
echo  DEMARRAGE DU SERVEUR DE POINTAGE (100%% LOGICIEL)
echo ==========================================================
echo.
cd /d "%~dp0backend_api"
python server.py
pause
