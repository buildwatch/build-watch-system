# Phase 1 & Phase 2 Features Usage Guide

## Overview
This guide explains how to use the Phase 1 and Phase 2 features integrated into the `project-management.astro` module (LGU-IU).

---

## Phase 1 Features

### 1. Bulk Operations — `ProjectBulkActionsCenter.jsx`

**Purpose:** Perform actions on multiple projects at once.

**How to Use:**
1. **Select Projects:**
   - In Card View: Check the checkbox on each project card
   - In Table View: Check the checkbox in the first column of each row
   - Use "Select All" to select all visible projects

2. **Bulk Actions Available:**
   - **Change Status:** Update status for all selected projects (e.g., Ongoing → Complete)
   - **Assign EIU:** Assign the same EIU contractor to multiple projects
   - **Archive Projects:** Archive multiple projects at once (only Pending/Complete)

3. **Access:**
   - The bulk actions menu appears automatically when projects are selected
   - Look for the bulk actions toolbar at the top or bottom of the project list

**Note:** Selected projects are tracked across both Card View and Table View.

---

### 2. Advanced Filtering — Enhanced `ProjectFilterCenter.jsx`

**Purpose:** Filter projects using advanced criteria beyond basic search.

**How to Use:**
1. **Basic Filters:**
   - Search by project name
   - Filter by status (Ongoing, Pending, Complete, Delayed)
   - Filter by priority (High, Medium, Low)
   - Filter by category
   - Filter by department

2. **Advanced Filters (Click "Show Advanced Filters"):**
   - **Date Range:**
     - Start Date From: Filter projects starting from this date
     - Start Date To: Filter projects starting up to this date
   
   - **Budget Range:**
     - Budget Min: Minimum budget amount
     - Budget Max: Maximum budget amount
   
   - **Progress Range:**
     - Progress Min: Minimum progress percentage (0-100)
     - Progress Max: Maximum progress percentage (0-100)

3. **Apply Filters:**
   - Click "Apply Filters" to apply all selected filters
   - Click "Clear Filters" to reset all filters

**Note:** Advanced filters work in combination with basic filters for precise project searches.

---

### 3. Project Assignment Management (Reassign EIU) — `ProjectAssignmentCenter.jsx`

**Purpose:** Reassign an EIU contractor to an existing project when there's an issue with the current contractor.

**How to Use:**
1. **Access:**
   - Click the "Assign EIU" button in the project card (Card View) or action buttons (Table View)

2. **Current EIU Display:**
   - If the project already has an EIU assigned, you'll see:
     - Current EIU name and email
     - Current EIU Personnel ID
   - The input field will be pre-filled with the current EIU's User ID (e.g., "EIU-0001")

3. **Reassign EIU:**
   - **Option 1: Enter EIU User ID**
     - Type the new EIU's User ID (e.g., "EIU-0002") in the input field
     - Click "Validate" to verify the account
     - If valid, you'll see a green confirmation with the EIU's name and email
   
   - **Option 2: Enter EIU UUID**
     - You can also enter the EIU's UUID (database ID) if you have it
     - The system will automatically detect and validate it

4. **Complete Reassignment:**
   - Once validated, click "Reassign EIU" button
   - The system will update the project and notify the new EIU contractor
   - The page will refresh to show the updated assignment

5. **Remove EIU:**
   - If you need to remove the EIU assignment entirely, click "Remove EIU"
   - Confirm the removal in the popup

**Important Notes:**
- The feature automatically loads and validates existing EIU assignments when you open the modal
- You can only reassign to active EIU accounts
- The system supports both User ID format (e.g., "EIU-0001") and UUID format
- Reassignment will notify the new EIU contractor about the project

---

## Phase 2 Features

### 1. Project Organization (Folders, Tags, Bookmarks) — `ProjectOrganizationCenter.jsx`

**Purpose:** Organize projects using folders, tags, and bookmarks for better project management.

**How to Use:**

#### **Access:**
- Click the "Organize" button (pink button) in the project card (Card View) or action buttons (Table View)

#### **Bookmarks:**
1. **Add/Remove Bookmark:**
   - Click "Add to Bookmarks" to bookmark the project
   - Click "Bookmarked" to remove the bookmark
   - Bookmarked projects are saved in your browser's localStorage

2. **Purpose:**
   - Quickly identify important or frequently accessed projects
   - Visual indicator (bookmark icon) appears on bookmarked projects

#### **Folders:**
1. **Create Folder:**
   - Type a folder name in the "New folder name" input field
   - Click "Create" or press Enter
   - Folders are saved in localStorage

2. **Assign Project to Folder:**
   - Click on a folder name to assign the current project to that folder
   - Click "No Folder" to remove the project from any folder
   - The selected folder will be highlighted

3. **Delete Folder:**
   - Click the "Delete" button next to any folder
   - Note: Deleting a folder does not delete the projects, just removes the folder organization

4. **Purpose:**
   - Group related projects together (e.g., "Infrastructure Projects", "2025 Projects")
   - Organize projects by department, priority, or any custom category

#### **Tags:**
1. **Create Tag:**
   - Type a tag name in the "New tag name" input field
   - Click "Create" or press Enter
   - Tags are saved in localStorage

2. **Assign Tags to Project:**
   - Click on tag buttons to select/deselect tags for the current project
   - Selected tags appear in blue, unselected tags appear in gray
   - You can assign multiple tags to a single project

3. **Delete Tag:**
   - Click the "Delete" button next to any tag
   - Note: Deleting a tag removes it from all projects that had it assigned

4. **Purpose:**
   - Add multiple labels to projects (e.g., "Urgent", "High Priority", "External Partner")
   - Filter and search projects by tags (if filtering is implemented)

**Important Notes:**
- All organization data (folders, tags, bookmarks) is stored in your browser's localStorage
- This means the organization is per-browser and per-user
- If you clear your browser data, you'll lose your organization settings
- The organization data is not synced across different browsers or devices

---

### 2. Advanced Table Features (Column Visibility) — `ProjectTableView.jsx`

**Purpose:** Customize which columns are visible in the table view for a personalized experience.

**How to Use:**
1. **Access:**
   - In Table View, click the "Columns" button in the footer (bottom left)

2. **Column Visibility Modal:**
   - A modern modal will open showing all available columns
   - Each column has a card with:
     - Column name/description
     - Checkbox to show/hide
     - Visual indicator (amber for visible, gray for hidden)

3. **Toggle Columns:**
   - Click on a column card to toggle its visibility
   - Visible columns have an amber background
   - Hidden columns have a gray background

4. **Quick Actions:**
   - "Show All" button: Makes all columns visible
   - "Cancel" button: Closes modal without saving changes
   - "Apply" button: Saves your column preferences

5. **Saved Preferences:**
   - Your column visibility preferences are saved in localStorage
   - They persist across page refreshes
   - Each user has their own preferences

**Available Columns:**
- Project Code
- Project Name
- Category
- Location
- Priority
- Status
- Progress
- Budget
- Start Date
- End Date
- EIU Personnel
- Actions

---

### 3. Project Comparison Tool — `ProjectComparisonCenter.jsx`

**Purpose:** Compare multiple projects side-by-side to analyze differences and similarities.

**How to Use:**
1. **Select Projects for Comparison:**
   - In Card View: Check the checkbox on 2-4 project cards
   - In Table View: Check the checkbox in the first column of 2-4 project rows
   - You can compare up to 4 projects at a time

2. **Open Comparison:**
   - Click the "Compare" button in the Project List header
   - Or use the "Compare Selected Projects" action button
   - If you haven't selected at least 2 projects, you'll see an alert

3. **Comparison View:**
   - A modal opens showing all selected projects side-by-side
   - Each project displays:
     - Project Code
     - Project Name
     - Category
     - Status
     - Priority
     - Progress (Overall, Timeline, Budget, Physical)
     - Budget Information
     - Dates (Start, End, Target Completion)
     - EIU Personnel
     - Location

4. **Analyze:**
   - Scroll through the comparison to see all project details
   - Compare progress percentages, budgets, and timelines
   - Identify projects that need attention

5. **Close:**
   - Click "Close" or the X button to exit the comparison view

**Note:** The comparison tool loads full project details from the API, so it may take a moment if you're comparing many projects.

---

## Summary

### Phase 1 Features:
- ✅ **Bulk Operations:** Select multiple projects and perform actions on them
- ✅ **Advanced Filtering:** Filter by date ranges, budget ranges, and progress ranges
- ✅ **EIU Reassignment:** Reassign EIU contractors to existing projects

### Phase 2 Features:
- ✅ **Project Organization:** Use folders, tags, and bookmarks to organize projects
- ✅ **Column Visibility:** Customize which columns appear in the table view
- ✅ **Project Comparison:** Compare 2-4 projects side-by-side

### Removed Features:
- ❌ **Project Templates & Duplication** (removed as unnecessary)

---

## Tips & Best Practices

1. **Bulk Operations:**
   - Use "Select All" carefully - it selects all visible projects (after filters are applied)
   - Always verify your selection before performing bulk actions

2. **Advanced Filtering:**
   - Combine multiple filters for precise searches
   - Use date ranges to find projects within specific time periods
   - Use budget ranges to identify high-value or low-budget projects

3. **EIU Reassignment:**
   - Always validate the EIU account before reassigning
   - The system shows the current EIU automatically - use this as a reference
   - Reassignment notifies the new contractor automatically

4. **Project Organization:**
   - Create meaningful folder names that help you find projects quickly
   - Use tags for multiple categorizations (e.g., "Urgent" + "Infrastructure")
   - Bookmark frequently accessed projects

5. **Column Visibility:**
   - Hide columns you don't need to see for a cleaner table view
   - Show only the most important columns for your workflow

6. **Project Comparison:**
   - Compare projects with similar characteristics to identify patterns
   - Use comparison to prioritize which projects need attention

---

## Troubleshooting

### EIU Reassignment shows "Validation failed"
- **Solution:** Make sure you're entering the correct EIU User ID (e.g., "EIU-0001") or UUID
- The EIU account must be active and have the "EIU" role
- Try validating again after checking the User ID

### Project Organization data is lost
- **Solution:** Organization data is stored in localStorage
- If you clear browser data, you'll lose your folders, tags, and bookmarks
- This is expected behavior - the data is stored locally per browser

### Column Visibility modal doesn't open
- **Solution:** Make sure you're in Table View (not Card View)
- Click the "Columns" button in the footer (bottom left)
- If it still doesn't work, refresh the page

### Can't compare projects
- **Solution:** Make sure you've selected at least 2 projects (checkboxes)
- You can compare up to 4 projects maximum
- Make sure the projects are visible (not filtered out)

---

## Need Help?

If you encounter any issues or have questions about these features, please refer to the system documentation or contact your system administrator.

