
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '../../../');

dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_ANON_KEY?.trim();

console.log('SUPABASE URL:', supabaseUrl);
console.log('KEY EXISTS:', Boolean(supabaseKey));

if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured in the project-root .env.local or .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('SUPABASE CLIENT INITIALIZED');

module.exports = supabase;
