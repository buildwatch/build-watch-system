# Build Watch LGU - Testing Checklist

## 🔐 Authentication & Login Testing

### Login Flow Tests
- [ ] **LGU-PMT Login**
  - [ ] Form validation (empty fields)
  - [ ] Invalid credentials (401 error)
  - [ ] Valid credentials → JWT storage
  - [ ] Redirect to `/dashboard/lgu-pmt`
  - [ ] Error message display
  - [ ] Loading state during login

- [ ] **EIU Login**
  - [ ] Form validation (empty fields)
  - [ ] Invalid credentials (401 error)
  - [ ] Valid credentials → JWT storage
  - [ ] Redirect to `/dashboard/eiu`
  - [ ] Error message display
  - [ ] Loading state during login

- [ ] **EMS Login**
  - [ ] Form validation (empty fields)
  - [ ] Invalid credentials (401 error)
  - [ ] Valid credentials → JWT storage
  - [ ] Redirect to `/dashboard/ems`
  - [ ] Error message display
  - [ ] Loading state during login

- [ ] **IU Login**
  - [ ] Form validation (empty fields)
  - [ ] Invalid credentials (401 error)
  - [ ] Valid credentials → JWT storage
  - [ ] Redirect to `/dashboard/iu`
  - [ ] Error message display
  - [ ] Loading state during login

- [ ] **SYS.AD Login**
  - [ ] Form validation (empty fields)
  - [ ] Invalid credentials (401 error)
  - [ ] Valid credentials → JWT storage
  - [ ] Redirect to `/dashboard/sysadmin`
  - [ ] Error message display
  - [ ] Loading state during login

### JWT & Security Tests
- [ ] **Token Storage**
  - [ ] JWT stored in localStorage after login
  - [ ] User data stored in localStorage
  - [ ] Token included in API requests

- [ ] **Token Validation**
  - [ ] Valid token → access granted
  - [ ] Invalid token → redirect to login
  - [ ] Expired token → redirect to login
  - [ ] Missing token → redirect to login

- [ ] **Role-Based Access**
  - [ ] LGU-PMT user can only access LGU-PMT dashboard
  - [ ] EIU user can only access EIU dashboard
  - [ ] EMS user can only access EMS dashboard
  - [ ] IU user can only access IU dashboard
  - [ ] SYS.AD user can only access SYS.AD dashboard

## 📊 Dashboard Integration Testing

### LGU-PMT Dashboard
- [ ] **Authentication Check**
  - [ ] Redirects to login if not authenticated
  - [ ] Redirects to correct dashboard if wrong role

- [ ] **Data Loading**
  - [ ] Stats cards load with real data
  - [ ] Recent activity loads from backend
  - [ ] Projects table loads from backend
  - [ ] Charts render with backend data

- [ ] **User Interface**
  - [ ] User name displays correctly
  - [ ] User role displays correctly
  - [ ] User initials show in avatar
  - [ ] Logout button works

- [ ] **Error Handling**
  - [ ] Loading state shows during data fetch
  - [ ] Error state shows if API fails
  - [ ] Retry functionality works

### EIU Dashboard
- [ ] **Authentication Check**
  - [ ] Redirects to login if not authenticated
  - [ ] Redirects to correct dashboard if wrong role

- [ ] **Data Loading**
  - [ ] Stats cards load with real data
  - [ ] Recent activity loads from backend
  - [ ] Projects table loads from backend
  - [ ] Economic trends chart renders

- [ ] **User Interface**
  - [ ] User name displays correctly
  - [ ] User role displays correctly
  - [ ] User initials show in avatar
  - [ ] Logout button works

### EMS Dashboard
- [ ] **Authentication Check**
  - [ ] Redirects to login if not authenticated
  - [ ] Redirects to correct dashboard if wrong role

- [ ] **Data Loading**
  - [ ] Monitoring stats load with real data
  - [ ] Recent activity loads from backend
  - [ ] Monitoring reports table loads
  - [ ] Compliance chart renders

- [ ] **User Interface**
  - [ ] User name displays correctly
  - [ ] User role displays correctly
  - [ ] User initials show in avatar
  - [ ] Logout button works

### IU Dashboard
- [ ] **Authentication Check**
  - [ ] Redirects to login if not authenticated
  - [ ] Redirects to correct dashboard if wrong role

- [ ] **Data Loading**
  - [ ] Project stats load with real data
  - [ ] Recent activity loads from backend
  - [ ] My projects table loads
  - [ ] Progress chart renders

- [ ] **User Interface**
  - [ ] User name displays correctly
  - [ ] User role displays correctly
  - [ ] User initials show in avatar
  - [ ] Logout button works

### SYS.AD Dashboard
- [ ] **Authentication Check**
  - [ ] Redirects to login if not authenticated
  - [ ] Redirects to correct dashboard if wrong role

- [ ] **Data Loading**
  - [ ] System stats load with real data
  - [ ] System logs load from backend
  - [ ] Users table loads from backend
  - [ ] User activity chart renders

- [ ] **User Interface**
  - [ ] User name displays correctly
  - [ ] User role displays correctly
  - [ ] User initials show in avatar
  - [ ] Logout button works

## 🔄 API Integration Testing

### Backend Connectivity
- [ ] **Server Status**
  - [ ] Backend server is running on port 5000
  - [ ] `/api/health` endpoint responds
  - [ ] Database connection is active

- [ ] **API Endpoints**
  - [ ] `/api/auth/login` - authentication
  - [ ] `/api/auth/profile` - user profile
  - [ ] `/api/projects` - project data
  - [ ] `/api/users` - user management
  - [ ] `/api/monitoring` - monitoring data
  - [ ] `/api/reports` - report data

### Data Flow
- [ ] **Real-time Data**
  - [ ] Dashboard stats update with live data
  - [ ] Tables show actual project information
  - [ ] Charts reflect current metrics
  - [ ] Activity feeds show recent actions

## 🎨 UI/UX Testing

### Visual Consistency
- [ ] **Design System**
  - [ ] Montserrat font used throughout
  - [ ] Tailwind CSS classes consistent
  - [ ] Color schemes match role themes
  - [ ] Spacing and alignment consistent

- [ ] **Responsive Design**
  - [ ] Mobile layout works correctly
  - [ ] Tablet layout works correctly
  - [ ] Desktop layout works correctly
  - [ ] Sidebar collapses on mobile

### User Experience
- [ ] **Navigation**
  - [ ] Sidebar links work correctly
  - [ ] Active page highlighted
  - [ ] Breadcrumbs show current location
  - [ ] Back button functionality

- [ ] **Interactions**
  - [ ] Hover states work
  - [ ] Loading states show
  - [ ] Error states display clearly
  - [ ] Success feedback provided

## 🛡️ Security Testing

### Access Control
- [ ] **Route Protection**
  - [ ] Unauthenticated users redirected to login
  - [ ] Wrong role users redirected to correct dashboard
  - [ ] Direct URL access blocked for unauthorized users

- [ ] **Data Security**
  - [ ] Sensitive data not exposed in client-side code
  - [ ] API keys not hardcoded
  - [ ] JWT tokens properly secured

### Error Handling
- [ ] **Network Errors**
  - [ ] Backend offline → graceful error handling
  - [ ] API timeout → retry mechanism
  - [ ] Invalid responses → user-friendly messages

## 🧪 Test Scenarios

### Scenario 1: New User Login
1. Navigate to any login page
2. Enter valid credentials
3. Verify JWT storage
4. Verify dashboard redirect
5. Verify data loading

### Scenario 2: Token Expiry
1. Login successfully
2. Wait for token expiry (or manually expire)
3. Try to access dashboard
4. Verify redirect to login

### Scenario 3: Wrong Role Access
1. Login with one role
2. Try to access another role's dashboard
3. Verify redirect to correct dashboard

### Scenario 4: Backend Failure
1. Stop backend server
2. Try to login
3. Verify error handling
4. Restart server
5. Verify recovery

## 📋 Pre-Launch Checklist

### Technical Requirements
- [ ] All login flows working
- [ ] All dashboards loading data
- [ ] JWT authentication working
- [ ] Role-based access enforced
- [ ] Error handling implemented
- [ ] Loading states implemented

### User Experience
- [ ] Clear error messages
- [ ] Intuitive navigation
- [ ] Responsive design
- [ ] Consistent styling
- [ ] Fast loading times

### Security
- [ ] Authentication required
- [ ] Role-based access
- [ ] Secure token handling
- [ ] No sensitive data exposure

## 🚀 Ready for Production

Once all tests pass:
- [ ] Deploy to staging environment
- [ ] Perform end-to-end testing
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Production deployment

---

**Test Status:** 🔄 In Progress  
**Last Updated:** [Current Date]  
**Tester:** [Your Name] 