
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../../.env')
});

function createSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials are missing.');
    }

    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

module.exports = createSupabaseClient;
