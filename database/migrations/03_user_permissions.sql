BEGIN;

-- Add metadata columns that are missing from the existing tables.
ALTER TABLE public.role
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.module
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.rights_catalogue
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.user_permission
    ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep the existing singular table name and app_user.role foreign key.
INSERT INTO public.role (role_name, description)
VALUES
    ('Super Admin', 'Full access to all system modules'),
    ('DB Admin', 'Database management and migration rights'),
    ('Standard User', 'Basic read and write access'),
    ('User', 'Default application user role')
ON CONFLICT (role_name) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO public.module (module_name, description)
VALUES
    ('User Management', 'Handles user onboarding and credentials'),
    ('System Audit', 'System log monitoring and reports')
ON CONFLICT (module_name) DO UPDATE
SET description = EXCLUDED.description;

-- Resolve module IDs by name rather than assuming they are 1 and 2.
INSERT INTO public.rights_catalogue
    (module_id, module_name, right_code, description)
SELECT
    m.module_id,
    m.module_name,
    v.right_code,
    v.description
FROM (
    VALUES
        ('User Management', 'USER_CREATE', 'Can create new users'),
        ('User Management', 'USER_BLOCK', 'Can block existing users'),
        ('System Audit', 'AUDIT_VIEW', 'Can view audit records')
) AS v(module_name, right_code, description)
JOIN public.module AS m
    ON m.module_name = v.module_name
ON CONFLICT (right_code) DO UPDATE
SET
    module_id = EXCLUDED.module_id,
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description;

COMMIT;