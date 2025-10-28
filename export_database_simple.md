# Export Database - Simple Method

## STEP 1: Export Using Command Line (Easiest)

### Open Command Prompt OC PowerShell
1. Press **Windows Key + R**
2. Type: `cmd` or `powershell`
3. Press Enter

### Navigate to your project folder
```cmd
cd "C:\Users\BuildWatch\Downloads\Build Watch"
```

### Run the export command
```cmd
mysqldump -u root -p buildwatch_lgu > buildwatch_lgu_local_export.sql
```

### Enter your MySQL password when prompted
- Type your password (you won't see it being typed)
- Press Enter

### Wait for it to finish
- It will take 1-2 minutes
- You'll get your prompt back when done

### Check if the file was created
```cmd
dir buildwatch_lgu_local_export.sql
```

You should see a file size (probably several MB)

---

## STEP 2: Or Use MySQL Workbench SQL Query

1. Open MySQL Workbench
2. Connect to your local database
3. Click on `buildwatch_lgu` database name (to select it)
4. Go to **File > Export > Export Table Data to SQL**
5. Select all tables
6. Choose export location
7. Click Export

---

## Quick Test: Is mysqldump available?

In your command prompt, run:
```cmd
where mysqldump
```

If you see a path (like `C:\Program Files\MySQL\...`), you're good to go!
If you see "Could not find", you need to install MySQL command line tools or add them to your PATH.

