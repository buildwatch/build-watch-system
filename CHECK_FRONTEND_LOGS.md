# Check Frontend Logs with PM2

## View Frontend Logs

```bash
# Check PM2 status to see all processes
pm2 list

# View frontend logs (last 50 lines)
pm2 logs buildwatch-frontend --lines 50

# Or view all logs
pm2 logs --lines 100

# To stop following logs, press Ctrl+C
```

## Find the Hardcoded IP

The console shows the frontend is still trying to access `http://148.230.96.155:3000/api/auth/verify`. We need to find where this is coming from.

```bash
cd /root/build-watch-system/frontend

# Search for the old IP address
grep -r "148.230.96.155" src/

# Search for localhost:3000 (which might also be wrong)
grep -r "localhost:3000" src/
```

This will show us which files still have the old IP address.

