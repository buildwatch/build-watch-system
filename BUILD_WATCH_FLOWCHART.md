# Build Watch - Santa Cruz, Laguna Project Monitoring System

## System Case Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Do you have an account?}
    B -->|No| C[Contact System Administrator]
    C --> D[(Database)]
    D --> E[Login]
    B -->|Yes| E
    E --> F{Are the credentials correct?}
    F -->|No| E
    F -->|Yes| G[Verify user role]
    
    G --> H{Is the user a System Administrator?}
    H -->|Yes| I[System Administrator Dashboard]
    I --> J[User Management<br/>Create, Edit, Delete Users]
    I --> K[System Configuration]
    I --> L[Database Backup & Maintenance]
    I --> M[System Health Monitoring]
    I --> N[Activity Logs Review]
    I --> O[Department & Group Management]
    
    H -->|No| P{Is the user an EIU?}
    P -->|Yes| Q[EIU Dashboard]
    Q --> R[View Assigned Projects]
    Q --> S[Submit Project Updates<br/>Timeline, Budget, Physical Progress]
    Q --> T[Monitor Project Progress]
    Q --> U[View EIU Activity Feed]
    Q --> V[Access Project Documents]
    Q --> W[Submit Compliance Reports]
    
    P -->|No| X{Is the user an LGU-IU?}
    X -->|Yes| Y[LGU-IU Dashboard]
    Y --> Z[Project & Program Management]
    Y --> AA[Progress Timeline Monitoring]
    Y --> BB[Submit Project Updates]
    Y --> CC[View Department Projects]
    Y --> DD[Access Project Documents]
    Y --> EE[Monitor Milestone Progress]
    
    X -->|No| FF{Is the user a Secretariat?}
    FF -->|Yes| GG[Secretariat Dashboard]
    GG --> HH[Review Project Submissions]
    GG --> II[Validate Project Reports]
    GG --> JJ[Compile Project Summaries]
    GG --> KK[Monitor Submission Tracker]
    GG --> LL[Coordinate with Implementing Offices]
    GG --> MM[Generate Compilation Reports]
    
    FF -->|No| NN{Is the user an MPMEC?}
    NN -->|Yes| OO[MPMEC Dashboard]
    OO --> PP[View Approved Projects]
    OO --> QQ[Monitor Project Progress & Timeline]
    OO --> RR[Review Committee Profiles]
    OO --> SS[Access Project Reports]
    OO --> TT[View Events & Schedules]
    OO --> UU[Generate Executive Reports]
    
    NN -->|No| VV[Access Denied]
    
    J --> WW[A]
    K --> WW
    L --> WW
    M --> WW
    N --> WW
    O --> WW
    
    R --> WW
    S --> WW
    T --> WW
    U --> WW
    V --> WW
    W --> WW
    
    Z --> WW
    AA --> WW
    BB --> WW
    CC --> WW
    DD --> WW
    EE --> WW
    
    HH --> WW
    II --> WW
    JJ --> WW
    KK --> WW
    LL --> WW
    MM --> WW
    
    PP --> WW
    QQ --> WW
    RR --> WW
    SS --> WW
    TT --> WW
    UU --> WW
    
    VV --> WW
    
    WW --> XX[Logout]
    XX --> A
```

## User Role Descriptions

### System Administrator
- **Primary Function**: System management and user administration
- **Key Responsibilities**:
  - User account creation and management
  - System configuration and maintenance
  - Database backup and recovery
  - System health monitoring
  - Activity log review and analysis

### EIU (External Implementing Unit)
- **Primary Function**: Project implementation and progress reporting
- **Key Responsibilities**:
  - Manage assigned projects
  - Submit regular progress updates
  - Monitor project milestones
  - Access project documentation
  - Submit compliance reports

### LGU-IU (Local Government Unit - Implementing Office)
- **Primary Function**: Local project management and oversight
- **Key Responsibilities**:
  - Manage department projects
  - Monitor project timelines
  - Submit project updates
  - Track milestone progress
  - Access project documents

### Secretariat
- **Primary Function**: Project review and validation
- **Key Responsibilities**:
  - Review project submissions
  - Validate project reports
  - Compile project summaries
  - Monitor submission tracking
  - Coordinate with implementing offices

### MPMEC (Municipal Project Monitoring and Evaluation Committee)
- **Primary Function**: Executive oversight and reporting
- **Key Responsibilities**:
  - Review approved projects
  - Monitor overall project progress
  - Access executive reports
  - View committee profiles
  - Track events and schedules

## System Flow Summary

1. **Authentication**: Users must have valid credentials to access the system
2. **Role Verification**: System determines user access level and available functions
3. **Dashboard Access**: Users are directed to role-specific dashboards
4. **Function Execution**: Users can perform authorized actions within their role
5. **Session Management**: Users can logout and return to the authentication process

This flowchart provides a comprehensive overview of the Build Watch system's user management and role-based access control structure. 