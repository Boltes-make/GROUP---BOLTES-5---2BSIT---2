const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../../.env')
});

function getSupabaseConfig() {
    const url = process.env.SUPABASE_URL?.trim();
    const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

    if (!url || !anonKey) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured in the project-root .env file.');
    }

    return { url, anonKey };
}

function createSupabaseClient() {
    const { url, anonKey } = getSupabaseConfig();

    return createClient(url, anonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

module.exports = {
    createSupabaseClient,
    getSupabaseConfig
};
