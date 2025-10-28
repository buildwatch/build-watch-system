# Export Database via MySQL Workbench - COMPLETE GUIDE

## METHOD: Use MySQL Workbench Menu

### STEP-BY-STEP:

1. **Open MySQL Workbench**
   - Already open

2. **Make sure you're connected to localhost**
   - You should see "SQL File 4*" tab

3. **Click on the Menu Bar at the top:**
   - Look for **"Server"** menu (top menu bar)
   - Click **"Server"**

4. **Select "Data Export"**
   - You'll see a list of menu items
   - Click **"Data Export"**

5. **In the Export Options Window:**
   - You'll see your databases listed on the left
   - SELECT **"buildwatch_lgu"** (check the checkbox next to it)
   - This will select all tables inside

6. **Export Settings:**
   - Under "Export Options" on the right
   - Select **"Export to Self-Contained File"**
   - Click the **"..."** button to choose location
   - Navigate to: `C:\Users\BuildWatch\Downloads\Build Watch\`
   - Type filename: `buildwatch_lgu_local_export.sql`
   - Click "Save"

7. **Start Export:**
   - Click **"Start Export"** button at the bottom right
   - Wait for export to complete (may take 1-2 minutes)
   - You'll see progress and then "Successfully exported" message

8. **Done!**
   - File will be saved at: `C:\Users\BuildWatch\Downloads\Build Watch\buildwatch_lgu_local_export.sql`

---

## ALTERNATIVE: If "Server > Data Export" doesn't work

### Try: File Menu
1. Click **"File"** menu (top menu)
2. Look for **"Export"** or **"Utilities"**
3. You might find export options there

### Or: Manage Connections
1. Click **"Server"** menu
2. Click **"Manage Connections"**
3. Try export options from there

---

## FALLBACK: Use SQL Query

Run this SQL query in your Workbench:

```sql
-- Select the database
USE buildwatch_lgu;

-- Show all tables
SHOW TABLES;
```

Then manually export each table if needed.

---

**Just try clicking "Server" menu at the top and look for "Data Export". Let me know what you see!**

