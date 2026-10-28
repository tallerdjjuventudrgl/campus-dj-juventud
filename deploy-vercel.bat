@echo off
chcp 65001 >nul
echo.
echo ========================================================
echo  DESPLIEGUE A VERCEL PRO · SISTEMAS DesarrollAR
echo  Dominio: cursodj.desarrollar.online
echo  Hecho con orgullo en Río Gallegos, Santa Cruz, Argentina 🇦🇷
echo ========================================================
echo.
vercel --prod --scope partido-justicialista --yes
echo.
pause
