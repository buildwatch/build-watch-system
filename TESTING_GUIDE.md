# Build Watch LGU - Complete System Testing Guide

## 🎯 Production Readiness Testing Checklist

### ✅ 1. Database & Backend Testing

#### Database Connection Test
```bash
cd backend
npm run test:db
```
**Expected Result:** Database connection successful, all tables created

#### Backend API Test
```bash
cd backend
npm start
# In another terminal:
npm run test:api
```
**Expected Result:** All API endpoints responding correctly

### ✅ 2. Authentication & Role Testing

#### Test Each User Role Login
1. **LGU-PMT User**
   - Login: `lgu-pmt@test.com` / `password123`
   - Should access LGU-PMT dashboard
   - Can edit Output Forms (5-11)
   - Can view Input Forms (1-4)

2. **LGU-IU User**
   - Login: `lgu-iu@test.com` / `password123`
   - Should access LGU-IU dashboard
   - Can edit Input Forms (1-4)
   - Can view Output Forms (5-11)

3. **EMS User**
   - Login: `ems@test.com` / `password123`
   - Should access EMS dashboard
   - Can view Output Forms only
   - No edit access to any forms

4. **SYS.AD User**
   - Login: `sysad@test.com` / `password123`
   - Should access SYS.AD dashboard
   - Can view all forms
   - Full system access

#### Test Session Management
1. **Copy Dashboard URL**
   - Login as any user type
   - Copy the dashboard URL from browser
   - Open incognito window or different browser
   - Paste the URL

2. **Expected Behavior**
   - **All user types** should redirect to home page (`/`)
   - Should NOT redirect to `/login/lgu-pmt`
   - Should show public home page with login options

3. **Cross-Browser Security**
   - Test with different browsers
   - Test with incognito/private mode
   - Verify session protection works consistently

### ✅ 3. RPMES Module Testing

#### Form Creation Testing
1. **Input Forms (LGU-IU Only)**
   - Login as LGU-IU
   - Select a project
   - Try to create RPMES Form 1-4
   - **Expected:** Success, form created
   - Try to create RPMES Form 5-11
   - **Expected:** Access denied

2. **Output Forms (LGU-PMT Only)**
   - Login as LGU-PMT
   - Select a project
   - Try to create RPMES Form 5-11
   - **Expected:** Success, form created
   - Try to create RPMES Form 1-4
   - **Expected:** Access denied

#### Form Validation Testing
1. **Required Fields**
   - Try to submit form with empty required fields
   - **Expected:** Validation errors displayed

2. **Data Types**
   - Enter text in number fields
   - **Expected:** Validation errors displayed

3. **Form Limits**
   - Try to create duplicate form for same project
   - **Expected:** Error message about existing form

#### Excel Export Testing
1. **Export Functionality**
   - Create/edit a form
   - Click Export button
   - **Expected:** Excel file downloads with proper filename format

2. **Filename Format**
   - **Expected:** `RPMES-Form-[formNo]-[projectName]-[fiscalYear].xlsx`

3. **Excel Content**
   - Open exported file
   - **Expected:** Proper formatting, headers, data structure

### ✅ 4. Dashboard Integration Testing

#### LGU-IU Dashboard
1. **RPMES Module Display**
   - Should show Input Forms section (editable)
   - Should show Output Forms section (view only)
   - Project selector should work

2. **Form Actions**
   - Create, Edit, View, Export buttons should work
   - Status indicators should display correctly

#### LGU-PMT Dashboard
1. **RPMES Module Display**
   - Should show Input Forms section (view only)
   - Should show Output Forms section (editable)
   - Project selector should work

2. **Form Actions**
   - Create, Edit, View, Export buttons should work
   - Status indicators should display correctly

### ✅ 5. Role-Based Access Control Testing

#### Form Access Matrix
| User Role | Input Forms (1-4) | Output Forms (5-11) |
|-----------|-------------------|---------------------|
| LGU-IU    | ✅ Edit/View      | 👁️ View Only       |
| LGU-PMT   | 👁️ View Only      | ✅ Edit/View        |
| EMS       | ❌ No Access      | 👁️ View Only       |
| SYS.AD    | 👁️ View Only      | 👁️ View Only       |

#### Testing Steps
1. Login as each user type
2. Navigate to RPMES module
3. Verify access permissions match matrix
4. Test form creation restrictions
5. Test form editing restrictions

### ✅ 6. Data Validation Testing

#### Form Data Validation
1. **Required Fields**
   - Submit forms with missing required fields
   - Verify error messages appear

2. **Data Types**
   - Enter invalid data types (text in number fields)
   - Verify validation errors

3. **Business Rules**
   - Try to create duplicate forms
   - Verify business rule enforcement

### ✅ 7. Export Functionality Testing

#### Excel Export Quality
1. **File Format**
   - Verify .xlsx extension
   - Verify file opens in Excel

2. **Content Accuracy**
   - Verify all form data is included
   - Verify proper formatting

3. **Filename Convention**
   - Verify filename follows LGU specification
   - Verify project name and fiscal year included

### ✅ 8. Performance Testing

#### Load Testing
1. **Multiple Users**
   - Test with multiple concurrent users
   - Verify system stability

2. **Large Datasets**
   - Test with many forms
   - Verify performance doesn't degrade

### ✅ 9. Security Testing

#### Authentication
1. **Session Management**
   - Test session timeout
   - Test logout functionality

2. **Authorization**
   - Test access to unauthorized resources
   - Verify proper error responses

### ✅ 10. User Experience Testing

#### Navigation
1. **Dashboard Integration**
   - Verify RPMES module integrates smoothly
   - Test navigation between sections

2. **Responsive Design**
   - Test on different screen sizes
   - Verify mobile compatibility

## 🚀 Deployment Readiness Checklist

### Backend
- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Error handling implemented
- [ ] Logging configured

### Frontend
- [ ] All components tested
- [ ] Responsive design verified
- [ ] Error boundaries implemented
- [ ] Loading states handled

### RPMES Module
- [ ] Form creation working
- [ ] Form editing working
- [ ] Excel export working
- [ ] Role-based access working
- [ ] Validation working

### Integration
- [ ] Frontend-backend communication working
- [ ] Authentication flow working
- [ ] Dashboard integration working

## 🐛 Common Issues & Solutions

### Database Connection Issues
```bash
# Check database status
npm run test:db

# Reset database if needed
npm run init:db
```

### API Connection Issues
```bash
# Check backend status
curl http://localhost:5000/api/health

# Check frontend API calls
# Open browser dev tools and check Network tab
```

### Excel Export Issues
```bash
# Check ExcelJS installation
npm list exceljs

# Verify file permissions
# Check browser download settings
```

### Role Access Issues
- Verify user role in database
- Check AuthContext implementation
- Verify route protection

## 📊 Testing Results Template

```
Test Date: _______________
Tester: _________________

✅ Database Connection: [ ] Pass [ ] Fail
✅ Backend API: [ ] Pass [ ] Fail
✅ Authentication: [ ] Pass [ ] Fail
✅ LGU-IU Dashboard: [ ] Pass [ ] Fail
✅ LGU-PMT Dashboard: [ ] Pass [ ] Fail
✅ RPMES Form Creation: [ ] Pass [ ] Fail
✅ RPMES Form Editing: [ ] Pass [ ] Fail
✅ Excel Export: [ ] Pass [ ] Fail
✅ Role-Based Access: [ ] Pass [ ] Fail
✅ Data Validation: [ ] Pass [ ] Fail

Issues Found:
1. _________________
2. _________________
3. _________________

Overall Status: [ ] Ready for Production [ ] Needs Fixes
```

## 🎯 Final Validation Steps

1. **Complete End-to-End Test**
   - Login as each user type
   - Create forms for each category
   - Export forms to Excel
   - Verify all functionality works

2. **Documentation Review**
   - Verify all features documented
   - Check user guides complete
   - Review API documentation

3. **Performance Validation**
   - Test with realistic data volumes
   - Verify response times acceptable
   - Check memory usage

4. **Security Review**
   - Verify all endpoints protected
   - Check data validation
   - Review access controls

## 🚀 Ready for Production!

Once all tests pass, the Build Watch LGU system is ready for:
- LGU Santa Cruz deployment
- User training sessions
- Capstone defense presentation
- Official handover to stakeholders

**System Status: PRODUCTION READY** ✅ 