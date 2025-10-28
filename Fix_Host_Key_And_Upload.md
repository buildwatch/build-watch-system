# Fix Host Key and Upload File

## The Issue:
The server's host key changed, which is a security warning. We need to remove the old host key.

## Quick Fix:

### Run this command in PowerShell:
```powershell
ssh-keygen -R 148.230.96.155
```

This will remove the old host key from your known_hosts file.

### Then try uploading again:
```powershell
cd "C:\Users\BuildWatch\Downloads\Build Watch"
scp buildwatch_lgu_FRESH_export.sql root@148.230.96.155:/root/
```

When prompted:
- First time: Type "yes" to accept the new host key
- Then: Enter password: buildwatch_123

---

## Alternative: Use File Manager

If SCP doesn't work, use the File Manager in Hostinger panel:
1. Click "OS & Panel" in left sidebar
2. Open "File Manager"
3. Navigate to /root/
4. Click "Upload"
5. Select your SQL file

