CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);

INSERT INTO public.audit_log (table_name, action, record_key, new_values, action_by)
SELECT 'system', 'ADD', '1', '{"message": "Audit logging initialized"}'::jsonb, 'SYSTEM'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.audit_log
  WHERE table_name = 'system'
    AND action = 'ADD'
    AND record_key = '1'
    AND new_values = '{"message": "Audit logging initialized"}'::jsonb
    AND action_by = 'SYSTEM'
);