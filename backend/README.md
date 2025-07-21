# Build Watch Backend - Node.js API Server

This is the backend API server for Build Watch LGU Project Monitoring and Evaluation System, built with Node.js, Express.js, and MySQL.

## Technology Stack

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MySQL**: Relational database
- **Sequelize ORM**: Database object-relational mapping
- **JWT**: JSON Web Token authentication
- **bcryptjs**: Password hashing
- **CORS**: Cross-origin resource sharing

## Project Structure

```
backend/
├── config/              # Database and application configuration
├── models/              # Sequelize database models
├── routes/              # API route handlers
├── services/            # Business logic services
├── middleware/          # Express middleware
├── scripts/             # Database and utility scripts
├── migrations/          # Database migrations
├── seeders/             # Database seeders
├── logs/                # Application logs
└── server.js           # Main application entry point
```

## Available Scripts

### Development
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
```

### Database Management
```bash
npm run migrate      # Run database migrations
npm run seed         # Seed database with initial data
npm run reset        # Reset database (development only)
```

### Testing
```bash
npm test             # Run test suite
npm run test:uat     # Run UAT tests
```

## Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_username
DB_PASS=your_password
DB_NAME=build_watch
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:4321

# Logging
LOG_LEVEL=info
```

## API Endpoints

### Authentication
```
POST   /api/auth/login          # User login
POST   /api/auth/logout         # User logout
GET    /api/auth/verify         # Token verification
GET    /api/auth/profile        # Get user profile
```

### User Management
```
GET    /api/users               # Get all users (SYS.AD only)
GET    /api/users/:id           # Get specific user
PUT    /api/users/:id           # Update user
DELETE /api/users/:id           # Delete user (SYS.AD only)
```

### Projects
```
GET    /api/projects            # Get all projects
GET    /api/projects/:id        # Get specific project
POST   /api/projects            # Create new project
PUT    /api/projects/:id        # Update project
DELETE /api/projects/:id        # Delete project
GET    /api/projects/progress/:id # Get project progress
```

### RPMES Forms
```
GET    /api/rpmes/forms         # Get available forms
GET    /api/rpmes/forms/:id     # Get specific form
POST   /api/rpmes/forms         # Create new form
PUT    /api/rpmes/forms/:id     # Update form
DELETE /api/rpmes/forms/:id     # Delete form
POST   /api/rpmes/export        # Export forms to Excel
```

### Activity Logs
```
GET    /api/activity-logs       # Get activity logs
GET    /api/activity-logs/summary # Get activity summary
POST   /api/activity-logs       # Create activity log
```

## Authentication System

### Session Management
- **JWT Tokens**: Secure token-based authentication
- **Session Validation**: Automatic token verification on API calls
- **Cross-Browser Protection**: Session management prevents unauthorized access
- **Role-Based Access**: Granular permissions per user group

### User Roles
- **SYS.AD**: System Administrator (full access)
- **LGU-PMT**: Project Monitoring Team (Forms 5-11 edit access)
- **EIU**: External Implementation Unit (Forms 1-4 edit access)
- **LGU-IU**: Internal Implementation Unit (Forms 1-4 edit access)
- **EMS**: External Monitoring System (view-only access)

### Security Features
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Comprehensive data validation and sanitization
- **SQL Injection Prevention**: Parameterized queries with Sequelize
- **CORS Protection**: Configured for frontend domain
- **Rate Limiting**: API rate limiting for security

## Database Schema

### Core Tables
- `users`: User accounts and authentication
- `projects`: Project information and metadata
- `project_milestones`: Project milestone tracking
- `project_updates`: Progress updates and submissions
- `activity_logs`: System activity tracking
- `rpmes_forms`: RPMES form data

### Relationships
- Users belong to implementing offices
- Projects have multiple milestones
- Milestones have multiple updates
- All actions are logged in activity_logs

## Services

### ProgressCalculationService
- Calculates project progress based on milestones
- Handles budget utilization calculations
- Provides comprehensive project statistics

### ExcelExportService
- Generates pixel-perfect Excel exports
- Matches official government templates
- Supports grouped form exports

### AuthenticationService
- Handles user authentication and authorization
- Manages JWT token lifecycle
- Provides role-based access control

## Error Handling

The API uses standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error

## Logging

The application uses structured logging with different levels:
- **ERROR**: Application errors and exceptions
- **WARN**: Warning conditions
- **INFO**: General information
- **DEBUG**: Detailed debugging information

Logs are stored in the `logs/` directory with daily rotation.

## Development Guidelines

### Code Style
- Use ES6+ features
- Follow Express.js best practices
- Use async/await for asynchronous operations
- Implement proper error handling

### Database
- Use migrations for schema changes
- Write seeders for test data
- Use transactions for data integrity
- Implement proper indexing

### Security
- Validate all inputs
- Sanitize user data
- Use parameterized queries
- Implement proper authentication checks

## Testing

### Unit Tests
```bash
npm test
```

### UAT Tests
```bash
npm run test:uat
```

### Manual Testing
Use the provided test scripts in the `scripts/` directory for manual testing of specific features.

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secret
4. Configure CORS for production domain
5. Set up SSL/TLS certificates
6. Configure reverse proxy (nginx)

### Environment Variables
```env
NODE_ENV=production
DB_HOST=production_db_host
DB_USER=production_db_user
DB_PASS=production_db_password
DB_NAME=production_db_name
JWT_SECRET=secure_production_jwt_secret
CORS_ORIGIN=https://your-production-domain.com
```

## Support

For backend-specific issues:
- Check the logs in `logs/` directory
- Review API documentation
- Test with provided scripts
- Contact the development team

---

**Build Watch Backend API Server**

*Built with Node.js and Express.js for robust API functionality* 