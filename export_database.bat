@echo off
echo Exporting Build Watch database...
echo.

REM Export the entire database to SQL file
mysqldump -u root -p buildwatch_lgu > buildwatch_lgu_export.sql

echo.
echo Database exported to: buildwatch_lgu_export.sql
echo.
pause

