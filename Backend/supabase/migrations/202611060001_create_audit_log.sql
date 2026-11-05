create table if not exists public.audit_log (
    id uuid primary key default gen_random_uuid(),
    actor_user_id uuid not null,
    actor_email text not null,
    target_user_id uuid not null,
    target_email text not null,
    event_type text not null,
    before_state jsonb not null,
    after_state jsonb not null,
    status text not null default 'pending'
        check (status in ('pending', 'succeeded', 'failed')),
    created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx
    on public.audit_log (created_at desc);
create index if not exists audit_log_target_user_id_idx
    on public.audit_log (target_user_id, created_at desc);

alter table public.audit_log enable row level security;
revoke all on table public.audit_log from public, anon, authenticated;
grant all on table public.audit_log to service_role;
