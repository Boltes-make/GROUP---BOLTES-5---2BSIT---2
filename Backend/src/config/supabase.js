
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '../../../');

dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env') });

function createSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials are missing.');
    }

if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured in the project-root .env.local or .env file.');
    return createClient(supabaseUrl, supabaseKey, {
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../../');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env') });

function getSupabaseConfig() {
    const configuredUrl = process.env.SUPABASE_URL?.trim();
    const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

    if (!configuredUrl || !anonKey) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured in the project-root .env.local or .env file.');
    }

    let projectUrl;
    try {
        projectUrl = new URL(configuredUrl);
    } catch {
        throw new Error('SUPABASE_URL must be a valid Supabase project URL, such as https://your-project.supabase.co.');
    }

    if (!['http:', 'https:'].includes(projectUrl.protocol) || projectUrl.search || projectUrl.hash ||
        !['', '/', '/rest/v1', '/rest/v1/'].includes(projectUrl.pathname)) {
        throw new Error('SUPABASE_URL must be the project URL, not a REST endpoint or another API path.');
    }

    return { url: projectUrl.origin, anonKey };
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

module.exports = createSupabaseClient;
module.exports = {
    createSupabaseClient,
    getSupabaseConfig
};
