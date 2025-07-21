-- Build Watch LGU Database Schema
-- Manual SQL schema for MySQL

USE buildwatch_lgu;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('LGU-PMT', 'EIU', 'LGU-IU', 'EMS', 'SYS.AD') NOT NULL,
  sub_role VARCHAR(100) NOT NULL,
  status ENUM('active', 'blocked', 'deactivated') NOT NULL DEFAULT 'active',
  id_type VARCHAR(50),
  id_number VARCHAR(50),
  `group` VARCHAR(100),
  department VARCHAR(100),
  position VARCHAR(100),
  contact_number VARCHAR(20),
  address TEXT,
  last_login_at DATETIME,
  password_changed_at DATETIME,
  reset_password_token VARCHAR(255),
  reset_password_expires DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status),
  INDEX idx_users_department (department),
  INDEX idx_users_username (username),
  INDEX idx_users_email (email)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  budget DECIMAL(15,2) NOT NULL,
  cost_spent DECIMAL(15,2) DEFAULT 0,
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  actual_start_date DATE,
  actual_end_date DATE,
  implementing_unit ENUM('EIU', 'LGU-IU') NOT NULL,
  implementing_unit_id CHAR(36) BINARY,
  category VARCHAR(100) NOT NULL,
  priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
  status ENUM('Planning', 'Ongoing', 'On Hold', 'Delayed', 'Near Completion', 'Completed', 'Cancelled') DEFAULT 'Planning',
  progress DECIMAL(5,2) DEFAULT 0,
  physical_progress DECIMAL(5,2) DEFAULT 0,
  financial_progress DECIMAL(5,2) DEFAULT 0,
  objectives TEXT,
  expected_outputs TEXT,
  target_beneficiaries TEXT,
  risks TEXT,
  mitigation_measures TEXT,
  remarks TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (implementing_unit_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_projects_status (status),
  INDEX idx_projects_category (category),
  INDEX idx_projects_priority (priority),
  INDEX idx_projects_implementing_unit (implementing_unit),
  INDEX idx_projects_start_date (start_date),
  INDEX idx_projects_target_date (target_date),
  INDEX idx_projects_status_category (status, category),
  INDEX idx_projects_implementing_unit_status (implementing_unit, status)
);

-- Project Updates table
CREATE TABLE IF NOT EXISTS project_updates (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  project_id CHAR(36) BINARY NOT NULL,
  submitted_by_id CHAR(36) BINARY NOT NULL,
  progress DECIMAL(5,2) NOT NULL,
  cost_spent DECIMAL(15,2) NOT NULL,
  physical_progress DECIMAL(5,2),
  financial_progress DECIMAL(5,2),
  accomplishments TEXT NOT NULL,
  challenges TEXT,
  next_steps TEXT,
  remarks TEXT NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected', 'Under Review') DEFAULT 'Pending',
  validated_by_id CHAR(36) BINARY,
  validated_at DATETIME,
  validation_feedback TEXT,
  report_period VARCHAR(50),
  report_date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (validated_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_project_updates_project_id (project_id),
  INDEX idx_project_updates_submitted_by (submitted_by_id),
  INDEX idx_project_updates_status (status),
  INDEX idx_project_updates_report_date (report_date),
  INDEX idx_project_updates_project_status (project_id, status),
  INDEX idx_project_updates_submitted_date (submitted_by_id, created_at)
);

-- RPMES Forms table
CREATE TABLE IF NOT EXISTS rpmes_forms (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  project_id CHAR(36) BINARY NOT NULL,
  submitted_by_id CHAR(36) BINARY NOT NULL,
  form_type ENUM('RPMES Form 1', 'RPMES Form 2', 'RPMES Form 3', 'RPMES Form 4') NOT NULL,
  version INT DEFAULT 1 NOT NULL,
  content JSON NOT NULL,
  status ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Pending') DEFAULT 'Draft',
  validated_by_id CHAR(36) BINARY,
  validated_at DATETIME,
  feedback TEXT,
  submission_date DATETIME,
  reporting_period VARCHAR(50),
  is_latest BOOLEAN DEFAULT TRUE,
  previous_version_id CHAR(36) BINARY,
  remarks TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (validated_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (previous_version_id) REFERENCES rpmes_forms(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_rpmes_forms_project_id (project_id),
  INDEX idx_rpmes_forms_submitted_by (submitted_by_id),
  INDEX idx_rpmes_forms_form_type (form_type),
  INDEX idx_rpmes_forms_status (status),
  INDEX idx_rpmes_forms_submission_date (submission_date),
  INDEX idx_rpmes_forms_is_latest (is_latest),
  INDEX idx_rpmes_forms_project_type (project_id, form_type),
  INDEX idx_rpmes_forms_project_status (project_id, status)
);

-- Monitoring Reports table
CREATE TABLE IF NOT EXISTS monitoring_reports (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  project_id CHAR(36) BINARY NOT NULL,
  submitted_by_id CHAR(36) BINARY NOT NULL,
  report_type ENUM('Progress', 'Validation', 'Completion', 'Issue', 'Compliance') NOT NULL,
  report_date DATE NOT NULL,
  findings TEXT NOT NULL,
  recommendations TEXT,
  status ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected') DEFAULT 'Draft',
  validated_by_id CHAR(36) BINARY,
  validated_at DATETIME,
  feedback TEXT,
  priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  category VARCHAR(100),
  attachments_count INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (validated_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_monitoring_reports_project_id (project_id),
  INDEX idx_monitoring_reports_submitted_by (submitted_by_id),
  INDEX idx_monitoring_reports_report_type (report_type),
  INDEX idx_monitoring_reports_status (status),
  INDEX idx_monitoring_reports_report_date (report_date),
  INDEX idx_monitoring_reports_priority (priority),
  INDEX idx_monitoring_reports_project_type (project_id, report_type)
);

-- Site Visits table
CREATE TABLE IF NOT EXISTS site_visits (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  project_id CHAR(36) BINARY NOT NULL,
  scheduled_by_id CHAR(36) BINARY NOT NULL,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  duration_hours DECIMAL(4,2) DEFAULT 2.0,
  visit_type ENUM('Initial', 'Progress', 'Validation', 'Completion', 'Follow-up') NOT NULL,
  purpose TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled') DEFAULT 'Scheduled',
  findings TEXT,
  recommendations TEXT,
  photos_count INT DEFAULT 0,
  participants_count INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (scheduled_by_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_site_visits_project_id (project_id),
  INDEX idx_site_visits_scheduled_by (scheduled_by_id),
  INDEX idx_site_visits_visit_date (visit_date),
  INDEX idx_site_visits_status (status),
  INDEX idx_site_visits_visit_type (visit_type),
  INDEX idx_site_visits_project_date (project_id, visit_date)
);

-- Site Visit Participants table (Junction table)
CREATE TABLE IF NOT EXISTS site_visit_participants (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  site_visit_id CHAR(36) BINARY NOT NULL,
  user_id CHAR(36) BINARY NOT NULL,
  role VARCHAR(100),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (site_visit_id) REFERENCES site_visits(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY unique_visit_participant (site_visit_id, user_id),
  INDEX idx_site_visit_participants_visit_id (site_visit_id),
  INDEX idx_site_visit_participants_user_id (user_id)
);

-- Uploads table
CREATE TABLE IF NOT EXISTS uploads (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_type ENUM('image', 'document', 'video', 'audio', 'archive', 'other') NOT NULL,
  uploaded_by_id CHAR(36) BINARY NOT NULL,
  entity_type VARCHAR(50),
  entity_id CHAR(36) BINARY,
  project_id CHAR(36) BINARY,
  project_update_id CHAR(36) BINARY,
  rpmes_form_id CHAR(36) BINARY,
  monitoring_report_id CHAR(36) BINARY,
  site_visit_id CHAR(36) BINARY,
  description TEXT,
  tags JSON,
  is_public BOOLEAN DEFAULT FALSE,
  download_count INT DEFAULT 0,
  status ENUM('Active', 'Archived', 'Deleted') DEFAULT 'Active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (project_update_id) REFERENCES project_updates(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (rpmes_form_id) REFERENCES rpmes_forms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (monitoring_report_id) REFERENCES monitoring_reports(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (site_visit_id) REFERENCES site_visits(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_uploads_uploaded_by (uploaded_by_id),
  INDEX idx_uploads_entity_type_id (entity_type, entity_id),
  INDEX idx_uploads_project_id (project_id),
  INDEX idx_uploads_file_type (file_type),
  INDEX idx_uploads_status (status),
  INDEX idx_uploads_created_at (created_at),
  INDEX idx_uploads_project_file_type (project_id, file_type),
  INDEX idx_uploads_uploaded_date (uploaded_by_id, created_at)
);

-- Project Issues table
CREATE TABLE IF NOT EXISTS project_issues (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  project_id CHAR(36) BINARY NOT NULL,
  reported_by_id CHAR(36) BINARY NOT NULL,
  issue_type ENUM('Technical', 'Financial', 'Schedule', 'Quality', 'Safety', 'Compliance', 'Other') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
  status ENUM('Open', 'In Progress', 'Resolved', 'Closed', 'Escalated') DEFAULT 'Open',
  assigned_to_id CHAR(36) BINARY,
  due_date DATE,
  resolution TEXT,
  resolved_at DATETIME,
  resolved_by_id CHAR(36) BINARY,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (reported_by_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (resolved_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_project_issues_project_id (project_id),
  INDEX idx_project_issues_reported_by (reported_by_id),
  INDEX idx_project_issues_issue_type (issue_type),
  INDEX idx_project_issues_severity (severity),
  INDEX idx_project_issues_status (status),
  INDEX idx_project_issues_assigned_to (assigned_to_id),
  INDEX idx_project_issues_due_date (due_date),
  INDEX idx_project_issues_project_status (project_id, status)
);

-- Project Feedback table
CREATE TABLE IF NOT EXISTS project_feedback (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  project_id CHAR(36) BINARY NOT NULL,
  submitted_by_id CHAR(36) BINARY NOT NULL,
  feedback_type ENUM('Stakeholder', 'Community', 'Technical', 'Financial', 'General') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  rating INT,
  status ENUM('Submitted', 'Under Review', 'Addressed', 'Closed') DEFAULT 'Submitted',
  reviewed_by_id CHAR(36) BINARY,
  reviewed_at DATETIME,
  response TEXT,
  response_by_id CHAR(36) BINARY,
  response_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (response_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_project_feedback_project_id (project_id),
  INDEX idx_project_feedback_submitted_by (submitted_by_id),
  INDEX idx_project_feedback_feedback_type (feedback_type),
  INDEX idx_project_feedback_status (status),
  INDEX idx_project_feedback_rating (rating),
  INDEX idx_project_feedback_created_at (created_at)
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  user_id CHAR(36) BINARY,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id CHAR(36) BINARY,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  level ENUM('Info', 'Warning', 'Error', 'Critical') DEFAULT 'Info' NOT NULL,
  module VARCHAR(50),
  status ENUM('Success', 'Failed', 'Pending') DEFAULT 'Success' NOT NULL,
  metadata JSON,
  session_id VARCHAR(255),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_activity_logs_user_id (user_id),
  INDEX idx_activity_logs_action (action),
  INDEX idx_activity_logs_entity_type_id (entity_type, entity_id),
  INDEX idx_activity_logs_level (level),
  INDEX idx_activity_logs_module (module),
  INDEX idx_activity_logs_created_at (created_at),
  INDEX idx_activity_logs_user_action (user_id, action),
  INDEX idx_activity_logs_user_date (user_id, created_at)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  user_id CHAR(36) BINARY NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('Info', 'Success', 'Warning', 'Error', 'Alert') DEFAULT 'Info' NOT NULL,
  category ENUM('Project', 'Update', 'Validation', 'System', 'Reminder', 'Alert') NOT NULL,
  entity_type VARCHAR(50),
  entity_id CHAR(36) BINARY,
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME,
  priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium' NOT NULL,
  action_url VARCHAR(500),
  action_text VARCHAR(100),
  expires_at DATETIME,
  metadata JSON,
  status ENUM('Active', 'Archived', 'Deleted') DEFAULT 'Active' NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_category (category),
  INDEX idx_notifications_is_read (is_read),
  INDEX idx_notifications_priority (priority),
  INDEX idx_notifications_created_at (created_at),
  INDEX idx_notifications_user_read (user_id, is_read),
  INDEX idx_notifications_user_category (user_id, category),
  INDEX idx_notifications_entity_type_id (entity_type, entity_id)
);

-- Insert default system admin user
INSERT INTO users (id, name, username, email, password, role, sub_role, status, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'System Administrator', 'sysadmin', 'admin@buildwatch.lgu.gov.ph', '$2b$10$rQZ9K8mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'SYS.AD', 'System Administrator', 'active', NOW(), NOW());

-- Insert sample LGU-PMT user
INSERT INTO users (id, name, username, email, password, role, sub_role, status, department, position, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Juan Dela Cruz', 'juan.pmt', 'juan.pmt@buildwatch.lgu.gov.ph', '$2b$10$rQZ9K8mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'LGU-PMT', 'Project Manager', 'active', 'Project Management Team', 'Senior Project Manager', NOW(), NOW());

-- Insert sample EIU user
INSERT INTO users (id, name, username, email, password, role, sub_role, status, department, position, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440002', 'Maria Santos', 'maria.eiu', 'maria.eiu@buildwatch.lgu.gov.ph', '$2b$10$rQZ9K8mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'EIU', 'Engineer', 'active', 'Engineering and Infrastructure Unit', 'Civil Engineer', NOW(), NOW());

-- Insert sample LGU-IU user
INSERT INTO users (id, name, username, email, password, role, sub_role, status, department, position, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440003', 'Pedro Reyes', 'pedro.iu', 'pedro.iu@buildwatch.lgu.gov.ph', '$2b$10$rQZ9K8mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'LGU-IU', 'Implementing Officer', 'active', 'Local Government Implementing Unit', 'Project Officer', NOW(), NOW());

-- Insert sample EMS user
INSERT INTO users (id, name, username, email, password, role, sub_role, status, department, position, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440004', 'Ana Martinez', 'ana.ems', 'ana.ems@buildwatch.lgu.gov.ph', '$2b$10$rQZ9K8mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'EMS', 'Monitoring Specialist', 'active', 'Environmental Management Services', 'Environmental Specialist', NOW(), NOW());

-- Insert sample project
INSERT INTO projects (id, name, description, location, budget, cost_spent, start_date, target_date, implementing_unit, implementing_unit_id, category, priority, status, progress, physical_progress, financial_progress, objectives, expected_outputs, target_beneficiaries, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440010', 'Municipal Road Rehabilitation Project', 'Rehabilitation of main municipal roads including drainage system improvement', 'Santa Cruz Municipality', 5000000.00, 1250000.00, '2024-01-15', '2024-12-31', 'EIU', '550e8400-e29b-41d4-a716-446655440002', 'Infrastructure', 'High', 'Ongoing', 25.00, 30.00, 20.00, 'Improve road connectivity and drainage system', 'Rehabilitated roads with proper drainage', 'Local residents and motorists', NOW(), NOW());

-- Insert sample project update
INSERT INTO project_updates (id, project_id, submitted_by_id, progress, cost_spent, physical_progress, financial_progress, accomplishments, challenges, next_steps, remarks, status, report_date, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', 25.00, 1250000.00, 30.00, 20.00, 'Completed site clearing and initial excavation work', 'Heavy rainfall delayed some activities', 'Continue with road base preparation', 'Project progressing well despite weather challenges', 'Approved', '2024-03-15', NOW(), NOW());

-- Insert sample activity log
INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, level, module, status, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440001', 'LOGIN', 'User', '550e8400-e29b-41d4-a716-446655440001', 'User logged in successfully', '192.168.1.100', 'Info', 'Authentication', 'Success', NOW(), NOW());

-- Insert sample notification
INSERT INTO notifications (id, user_id, title, message, type, category, entity_type, entity_id, priority, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440001', 'Project Update Submitted', 'A new project update has been submitted for Municipal Road Rehabilitation Project', 'Info', 'Project', 'ProjectUpdate', '550e8400-e29b-41d4-a716-446655440020', 'Medium', NOW(), NOW()); 