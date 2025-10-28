# Create MySQL User for Backend

## The Problem

MySQL root user is using unix_socket authentication, which Node.js can't use. We need to create a regular MySQL user with password authentication.

## Solution: Create a MySQL User

While you're logged into MySQL, run these commands:

```sql
-- Create a new user for the application
CREATE USER 'buildwatch'@'localhost' IDENTIFIED BY 'buildwatch_123';

-- Grant all privileges on the buildwatch_lgu database
GRANT ALL PRIVILEGES ON buildwatch_lgu.* TO 'buildwatch'@'localhost';

-- Apply the changes
FLUSH PRIVILEGES;

-- Verify it worked
SELECT user, host, plugin FROM mysql.user WHERE user='buildwatch';

-- Exit MySQL
exit;
```

## Update the .env File

Now update the .env file to use this new user:

```bash
cd /root/build-watch-system/backend

nano .env
```

Change these lines:
```
DB_USER=root
DB_PASS=buildwatch_123
```

To:
```
DB_USER=buildwatch
DB_PASS=buildwatch_123
```

Save: Ctrl+O, Enter, Ctrl+X

## Restart Backend

```bash
pm2 restart buildwatch-backend

# Check if it works
pm2 logs buildwatch-backend --lines 20
```

You should now see:
```
✅ Database connection established successfully.
🚀 Build Watch LGU Server running on port 3000
```

