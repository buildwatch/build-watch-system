# Verify JWT_SECRET in Backend

Run this command to check the JWT_SECRET in your backend:

```bash
cd /root/build-watch-system/backend

# Check what JWT_SECRET is configured
node -e "require('dotenv').config(); console.log('JWT_SECRET:', process.env.JWT_SECRET || 'NOT SET')"

# Check the .env file
cat .env | grep JWT_SECRET
```

Make sure it shows:
```
JWT_SECRET=buildwatch_lgu_secret_key_2024
```

If it's different or missing, edit the file:

```bash
nano .env
```

Add/update:
```
JWT_SECRET=buildwatch_lgu_secret_key_2024
```

Save and restart:
```bash
pm2 restart buildwatch-backend --update-env
```

## But the Real Solution is Simple:

Just **log out and log back in** from `https://build-watch.com`. This will create a new token with the correct JWT_SECRET!

1. Click Logout in the top right
2. Go to login page
3. Log in with temadm@gmail.com / BuildWatch2025!
4. The token will now be valid

