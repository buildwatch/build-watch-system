# UPDATED REVISED BUILD WATCH DOCUMENTATION

## Flowchart of Build Watch - Santa Cruz, Laguna Project Monitoring System

### System Overview
**Flowchart Title:** Flowchart of Build Watch - Santa Cruz, Laguna Project Monitoring System

### Overall Flow Structure

#### 1. START
- **Shape:** Oval
- **Content:** "Start"
- **Position:** Top of flowchart

#### 2. ACCOUNT VERIFICATION
- **Shape:** Diamond (Decision Point)
- **Content:** "Do you have an account?"
- **Branches:**
  - **If "No":** → "Contact System Administrator" (Rectangle)
  - **If "Yes":** → "Login" (Rectangle)

#### 3. ACCOUNT CREATION PROCESS
- **Shape:** Rectangle
- **Content:** "Contact System Administrator"
- **Connects to:** Database (Cylinder)
- **Database:** "Database" (Cylinder shape)
- **Flow:** Database → "Login"

#### 4. LOGIN PROCESS
- **Shape:** Rectangle
- **Content:** "Login"
- **Connects to:** Database (Cylinder)
- **Next:** Credential verification

#### 5. CREDENTIAL VERIFICATION
- **Shape:** Diamond (Decision Point)
- **Content:** "Are the credentials correct?"
- **Branches:**
  - **If "No":** → Loop back to "Login"
  - **If "Yes":** → "Verify user role" (Rectangle)

#### 6. ROLE VERIFICATION
- **Shape:** Rectangle
- **Content:** "Verify user role"
- **Next:** Series of role decision points

### USER ROLE BRANCHES AND FUNCTIONALITIES

#### BRANCH 1: SYSTEM ADMINISTRATOR
- **Shape:** Diamond (Decision Point)
- **Content:** "Is the user a System Administrator?"
- **If "Yes":** → System Administrator Dashboard (Rectangle)

**System Administrator Functionalities:**
- **Shape:** Rectangle
- **Content:**
  - User Management (Create, Edit, Delete Users)
  - System Configuration
  - Database Backup & Maintenance
  - System Health Monitoring
  - Activity Logs Review
  - Department & Group Management
- **Connects to:** "A" Connector (Circle)

#### BRANCH 2: EIU (EXTERNAL IMPLEMENTING UNIT)
- **Shape:** Diamond (Decision Point)
- **Content:** "Is the user an EIU?"
- **Condition:** If not System Administrator
- **If "Yes":** → EIU Dashboard (Rectangle)

**EIU Functionalities:**
- **Shape:** Rectangle
- **Content:**
  - View Assigned Projects
  - Submit Project Updates (Timeline, Budget, Physical Progress)
  - Monitor Project Progress
  - View EIU Activity Feed
  - Access Project Documents
  - Submit Compliance Reports
- **Connects to:** "A" Connector (Circle)

#### BRANCH 3: LGU-IU (LOCAL GOVERNMENT UNIT - IMPLEMENTING OFFICE)
- **Shape:** Diamond (Decision Point)
- **Content:** "Is the user an LGU-IU?"
- **Condition:** If not System Administrator and not EIU
- **If "Yes":** → LGU-IU Dashboard (Rectangle)

**LGU-IU Functionalities:**
- **Shape:** Rectangle
- **Content:**
  - Project & Program Management
  - Progress Timeline Monitoring
  - Submit Project Updates
  - View Department Projects
  - Access Project Documents
  - Monitor Milestone Progress
- **Connects to:** "A" Connector (Circle)

#### BRANCH 4: SECRETARIAT
- **Shape:** Diamond (Decision Point)
- **Content:** "Is the user a Secretariat?"
- **Condition:** If not System Administrator, not EIU, and not LGU-IU
- **If "Yes":** → Secretariat Dashboard (Rectangle)

**Secretariat Functionalities:**
- **Shape:** Rectangle
- **Content:**
  - Review Project Submissions
  - Validate Project Reports
  - Compile Project Summaries
  - Monitor Submission Tracker
  - Coordinate with Implementing Offices
  - Generate Compilation Reports
- **Connects to:** "A" Connector (Circle)

#### BRANCH 5: MPMEC (MUNICIPAL PROJECT MONITORING AND EVALUATION COMMITTEE)
- **Shape:** Diamond (Decision Point)
- **Content:** "Is the user an MPMEC?"
- **Condition:** If not System Administrator, not EIU, not LGU-IU, and not Secretariat
- **If "Yes":** → MPMEC Dashboard (Rectangle)

**MPMEC Functionalities:**
- **Shape:** Rectangle
- **Content:**
  - View Approved Projects
  - Monitor Project Progress & Timeline
  - Review Committee Profiles
  - Access Project Reports
  - View Events & Schedules
  - Generate Executive Reports
- **Connects to:** "A" Connector (Circle)

#### ACCESS DENIED
- **Shape:** Rectangle
- **Content:** "Access Denied"
- **Condition:** If user doesn't match any role
- **Connects to:** "A" Connector (Circle)

### CONVERGENCE AND LOGOUT
- **Shape:** Circle
- **Content:** "A" (Connector)
- **Purpose:** Convergence point for all user role paths
- **Next:** "Logout" (Rectangle)

#### LOGOUT PROCESS
- **Shape:** Rectangle
- **Content:** "Logout"
- **Connects to:** "A" Connector at top (Circle)
- **Flow:** Returns to Start

### FLOWCHART SHAPES AND SYMBOLS

#### Standard Shapes Used:
1. **Oval:** Start/End points
2. **Rectangle:** Process boxes (actions, functionalities)
3. **Diamond:** Decision points (Yes/No questions)
4. **Cylinder:** Database/Data storage
5. **Circle:** Connectors (A, B, C, etc.)

#### Flow Direction:
- **Top to Bottom:** Main flow direction
- **Left to Right:** Decision branches
- **Arrows:** Show flow direction between elements

### SYSTEM ARCHITECTURE NOTES

#### Database Integration:
- All user authentication connects to Database
- User roles and permissions stored in Database
- Project data and progress tracking in Database

#### Security Features:
- Credential verification before role assignment
- Role-based access control
- Session management through logout process

#### User Experience Flow:
1. **Entry Point:** Start → Account verification
2. **Authentication:** Login → Credential check
3. **Authorization:** Role verification → Dashboard access
4. **Functionality:** Role-specific actions and features
5. **Exit Point:** Logout → Return to start

### DOCUMENTATION METADATA
- **Document Title:** UPDATED REVISED BUILD WATCH DOCUMENTATION
- **System Name:** Build Watch - Santa Cruz, Laguna Project Monitoring System
- **Version:** Updated Revised
- **Total User Roles:** 5 (System Administrator, EIU, LGU-IU, Secretariat, MPMEC)
- **Total Decision Points:** 6
- **Total Process Boxes:** 15+
- **Connectors Used:** A (convergence point)

This flowchart provides a comprehensive visual representation of the Build Watch system's user authentication, role-based access control, and functionality distribution across all user types in the Santa Cruz, Laguna Project Monitoring System. 