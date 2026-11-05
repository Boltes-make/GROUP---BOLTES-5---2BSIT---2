-- ==========================================
-- 1. DROP EXISTING TABLES (Para malinis ang slate)
-- ==========================================
DROP TABLE IF EXISTS user_permission CASCADE;
DROP TABLE IF EXISTS rights_catalogue CASCADE;
DROP TABLE IF EXISTS module CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ==========================================
-- 2. CREATE TABLES (SCHEMA)
-- ==========================================

CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_user (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT DEFAULT NULL,
    role_id INT REFERENCES roles(role_id) ON DELETE SET NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_password_set BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE module (
    module_id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rights_catalogue (
    right_id SERIAL PRIMARY KEY,
    module_id INT REFERENCES module(module_id) ON DELETE CASCADE,
    right_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_permission (
    permission_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES app_user(user_id) ON DELETE CASCADE,
    right_id INT REFERENCES rights_catalogue(right_id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ==========================================
-- 3. SEED DATA (INSERTS)
-- ==========================================

-- Seed Default Roles
INSERT INTO roles (role_name, description) VALUES 
('Super Admin', 'Full system access for team members'),
('Admin', 'Standard administrative rights'),
('Staff', 'Regular operational user')
ON CONFLICT (role_name) DO NOTHING;

-- Seed Team Member Superadmin Accounts
INSERT INTO app_user (username, email, password_hash, role_id, is_password_set) VALUES 
('admin_member1', 'member1@hope.system', NULL, (SELECT role_id FROM roles WHERE role_name = 'Super Admin'), FALSE),
('admin_member2', 'member2@hope.system', NULL, (SELECT role_id FROM roles WHERE role_name = 'Super Admin'), FALSE),
('admin_member3', 'member3@hope.system', NULL, (SELECT role_id FROM roles WHERE role_name = 'Super Admin'), FALSE)
ON CONFLICT (username) DO NOTHING;

-- Seed the 5 Required Modules
INSERT INTO module (module_name, description) VALUES 
('Customer', 'Customer relationship and data management'),
('Product', 'Product inventory and catalogue management'),
('Human Resources', 'Employee records and personnel management'),
('Sales', 'Transactions, orders, and sales reporting'),
('Reports', 'System-wide analytics and data reports')
ON CONFLICT (module_name) DO NOTHING;

-- Seed Rights Catalogue (36 Rights Total across the 5 modules)
INSERT INTO rights_catalogue (module_id, right_code, description) VALUES 
-- Customer Module Rights (7 rights)
((SELECT module_id FROM module WHERE module_name = 'Customer'), 'CUST_VIEW', 'View customer list'),
((SELECT module_id FROM module WHERE module_name = 'Customer'), 'CUST_CREATE', 'Create customer record'),
((SELECT module_id FROM module WHERE module_name = 'Customer'), 'CUST_EDIT', 'Edit customer record'),
((SELECT module_id FROM module WHERE module_name = 'Customer'), 'CUST_DELETE', 'Delete customer record'),
((SELECT module_id FROM module WHERE module_name = 'Customer'), 'CUST_EXPORT', 'Export customer data'),
((SELECT module_id FROM module WHERE module_name = 'Customer'), 'CUST_ARCHIVE', 'Archive customer account'),
((SELECT module_id FROM module WHERE module_name = 'Customer'), 'CUST_RESTORE', 'Restore archived customer'),

-- Product Module Rights (7 rights)
((SELECT module_id FROM module WHERE module_name = 'Product'), 'PROD_VIEW', 'View product inventory'),
((SELECT module_id FROM module WHERE module_name = 'Product'), 'PROD_CREATE', 'Add new product'),
((SELECT module_id FROM module WHERE module_name = 'Product'), 'PROD_EDIT', 'Update product details'),
((SELECT module_id FROM module WHERE module_name = 'Product'), 'PROD_DELETE', 'Remove product'),
((SELECT module_id FROM module WHERE module_name = 'Product'), 'PROD_PRICE_UPDATE', 'Modify product pricing'),
((SELECT module_id FROM module WHERE module_name = 'Product'), 'PROD_STOCK_ADJUST', 'Adjust inventory stock'),
((SELECT module_id FROM module WHERE module_name = 'Product'), 'PROD_EXPORT', 'Export product catalogue'),

-- Human Resources Module Rights (7 rights)
((SELECT module_id FROM module WHERE module_name = 'Human Resources'), 'HR_VIEW', 'View employee directory'),
((SELECT module_id FROM module WHERE module_name = 'Human Resources'), 'HR_CREATE', 'Onboard new employee'),
((SELECT module_id FROM module WHERE module_name = 'Human Resources'), 'HR_EDIT', 'Update employee details'),
((SELECT module_id FROM module WHERE module_name = 'Human Resources'), 'HR_DELETE', 'Terminate employee record'),
((SELECT module_id FROM module WHERE module_name = 'Human Resources'), 'HR_SALARY_VIEW', 'View salary information'),
((SELECT module_id FROM module WHERE module_name = 'Human Resources'), 'HR_SALARY_EDIT', 'Modify salary structure'),
((SELECT module_id FROM module WHERE module_name = 'Human Resources'), 'HR_EXPORT', 'Export HR records'),

-- Sales Module Rights (8 rights)
((SELECT module_id FROM module WHERE module_name = 'Sales'), 'SALE_VIEW', 'View sales transactions'),
((SELECT module_id FROM module WHERE module_name = 'Sales'), 'SALE_CREATE', 'Process new sale'),
((SELECT module_id FROM module WHERE module_name = 'Sales'), 'SALE_VOID', 'Void transaction'),
((SELECT module_id FROM module WHERE module_name = 'Sales'), 'SALE_REFUND', 'Process customer refund'),
((SELECT module_id FROM module WHERE module_name = 'Sales'), 'SALE_DISCOUNT', 'Apply custom discount'),
((SELECT module_id FROM module WHERE module_name = 'Sales'), 'SALE_APPROVE', 'Approve high-value sale'),
((SELECT module_id FROM module WHERE module_name = 'Sales'), 'SALE_PRINT_RECEIPT', 'Print receipt copy'),
((SELECT module_id FROM module WHERE module_name = 'Sales'), 'SALE_EXPORT', 'Export sales report'),

-- Reports Module Rights (7 rights)
((SELECT module_id FROM module WHERE module_name = 'Reports'), 'REP_VIEW_SUMMARY', 'View dashboard summary'),
((SELECT module_id FROM module WHERE module_name = 'Reports'), 'REP_VIEW_FINANCIAL', 'View financial reports'),
((SELECT module_id FROM module WHERE module_name = 'Reports'), 'REP_VIEW_AUDIT', 'View system audit logs'),
((SELECT module_id FROM module WHERE module_name = 'Reports'), 'REP_GENERATE', 'Generate custom report'),
((SELECT module_id FROM module WHERE module_name = 'Reports'), 'REP_EXPORT_PDF', 'Export report as PDF'),
((SELECT module_id FROM module WHERE module_name = 'Reports'), 'REP_EXPORT_EXCEL', 'Export report as Excel'),
((SELECT module_id FROM module WHERE module_name = 'Reports'), 'REP_SCHEDULE', 'Schedule automated reports')
ON CONFLICT (right_code) DO NOTHING;