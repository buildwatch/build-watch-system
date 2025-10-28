# Upload Using WinSCP (EASIEST!)

## Download WinSCP:
1. Go to: https://winscp.net/eng/download.php
2. Download and install WinSCP

## Upload File:

### Step 1: Open WinSCP
1. Launch WinSCP application

### Step 2: Connect to Server
- **Host name:** 148.230.96.155
- **User name:** root
- **Password:** buildwatch_123
- **Protocol:** SFTP or SCP
- Click **"Login"**

### Step 3: Upload File
1. On the **left side:** Navigate to your local folder:
   `C:\Users\BuildWatch\Downloads\Build Watch\`

2. Find: `buildwatch_lgu_FRESH_export.sql`

3. On the **right side:** Navigate to server folder:
   `/root/`

4. **Drag the file** from left to right, OR
   Right-click the file → Select "Upload"

5. Wait for upload to complete

### Step 4: Done!
The file is now at `/root/buildwatch_lgu_FRESH_export.sql` on your server.

---

## Alternative: Fix SSH and Use Terminal

If you prefer command line, here's the safe fix:

### Run in PowerShell:
```powershell
# Remove old host key
ssh-keygen -R 148.230.96.155

# Upload file
cd "C:\Users\BuildWatch\Downloads\Build Watch"
scp buildwatch_lgu_FRESH_export.sql root@148.230.96.155:/root/
```

**This is 100% safe!** It only fixes the SSH connection and uploads a file.

