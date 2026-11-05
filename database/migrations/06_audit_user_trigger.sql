-- ==========================================
-- TASK 6: AUDIT USER TRIGGER & FUNCTION (MAPPED ACTION FIX)
-- ==========================================

-- 1. I-drop ang lumang function para maiwasan ang conflict
DROP FUNCTION IF EXISTS audit_user() CASCADE;

-- 2. Lumikha muli ng audit_user() function na may tamang action mapping
CREATE OR REPLACE FUNCTION audit_user()
RETURNS TRIGGER AS $$
DECLARE
    current_app_user_id INT;
    mapped_action VARCHAR(50);
BEGIN
    -- Kunin ang kasalukuyang user_id mula sa session settings
    BEGIN
        current_app_user_id := NULLIF(current_setting('app.current_user_id', true), '')::INT;
    EXCEPTION WHEN OTHERS THEN
        current_app_user_id := NULL;
    END;

    -- I-map ang TG_OP sa mga katanggap-tanggap na halaga ng audit_log_action_check ('ADD', 'EDIT', 'DELETE', 'RESTORE')
    IF TG_OP = 'INSERT' THEN
        mapped_action := 'ADD';
    ELSIF TG_OP = 'UPDATE' THEN
        mapped_action := 'EDIT';
    ELSIF TG_OP = 'DELETE' THEN
        mapped_action := 'DELETE';
    ELSE
        mapped_action := 'EDIT';
    END IF;

    -- I-record ang pagbabago sa audit_log table
    INSERT INTO audit_log (
        action_by,
        action,
        table_name,
        old_values,
        new_values
    ) VALUES (
        current_app_user_id,
        mapped_action, -- Ginamit ang na-map na salita para pumasa sa check constraint
        TG_TABLE_NAME,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. I-re-attach ang Trigger sa app_user Table
DROP TRIGGER IF EXISTS trg_audit_app_user ON app_user;

CREATE TRIGGER trg_audit_app_user
AFTER INSERT OR UPDATE OR DELETE ON app_user
FOR EACH ROW EXECUTE FUNCTION audit_user();

-- ==========================================
-- 4. VERIFICATION / TESTING SCRIPT
-- ==========================================
SELECT set_config('app.current_user_id', '1', true);

INSERT INTO app_user (username, email, role_id, is_password_set)
VALUES ('test_audit_user_final_v6', 'testauditv6@hope.system', 1, FALSE)
ON CONFLICT (username) DO NOTHING;

UPDATE app_user 
SET is_blocked = TRUE 
WHERE username = 'test_audit_user_final_v6';

-- Tignan ang huling mga audit record
SELECT * FROM audit_log ORDER BY audit_id DESC LIMIT 5;