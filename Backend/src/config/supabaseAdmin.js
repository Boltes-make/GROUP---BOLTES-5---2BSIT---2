const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase');

function createSupabaseAdminClient() {
    const { url } = getSupabaseConfig();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!serviceRoleKey || serviceRoleKey.startsWith('sb_publishable_')) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY must be a Supabase secret or service_role key.');
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

module.exports = createSupabaseAdminClient;
