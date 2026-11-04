
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../../.env')
});

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_ANON_KEY?.trim();

console.log('SUPABASE URL:', supabaseUrl);
console.log('KEY EXISTS:', Boolean(supabaseKey));

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are missing.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('SUPABASE CLIENT INITIALIZED');

module.exports = supabase;
