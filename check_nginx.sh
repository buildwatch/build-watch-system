#!/bin/bash
# Script to check current Nginx configuration

echo "=== Checking Nginx Installation ==="
echo ""
nginx -v 2>&1
echo ""
echo "=== Checking Nginx Status ==="
systemctl status nginx --no-pager || service nginx status
echo ""
echo "=== Available Nginx Sites ==="
echo "sites-available:"
ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "Directory not found"
echo ""
echo "sites-enabled:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "Directory not found"
echo ""
echo "=== Checking for build-watch configs ==="
find /etc/nginx -name "*build*" -o -name "*watch*" 2>/dev/null | head -5
echo ""
echo "=== Checking if sites-enabled is included ==="
grep -i "sites-enabled\|include.*conf" /etc/nginx/nginx.conf | head -5
echo ""
echo "=== Checking running processes ==="
ps aux | grep nginx | grep -v grep
echo ""
echo "=== Checking which port frontend is running on ==="
pm2 status | grep frontend
netstat -tlnp | grep :4321 || ss -tlnp | grep :4321
echo ""
echo "=== Checking which port backend is running on ==="
pm2 status | grep backend
netstat -tlnp | grep :3000 || ss -tlnp | grep :3000

