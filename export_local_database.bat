@echo off
echo ============================================
echo Exporting Build Watch LOCAL Database
echo ============================================
echo.
echo This will export your local database to: buildwatch_lgu_local_export.sql
echo.
pause

REM Export the entire database to SQL file
mysqldump -u root -p buildwatch_lgu > buildwatch_lgu_local_export.sql

echo.
echo ============================================
echo Export Complete!
echo ============================================
echo.
echo File created: buildwatch_lgu_local_export.sql
echo.
echo Next steps:
echo 1. Upload this file to your server
echo 2. Import it into the server database
echo.
pause

