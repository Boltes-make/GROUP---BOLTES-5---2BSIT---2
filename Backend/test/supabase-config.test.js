const { after, test } = require('node:test');
const assert = require('node:assert/strict');

const originalUrl = process.env.SUPABASE_URL;
const originalAnonKey = process.env.SUPABASE_ANON_KEY;
process.env.SUPABASE_URL = 'https://project.supabase.co/rest/v1/';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

const { getSupabaseConfig } = require('../src/config/supabase');

after(() => {
    if (originalUrl === undefined) {
        delete process.env.SUPABASE_URL;
    } else {
        process.env.SUPABASE_URL = originalUrl;
    }

    if (originalAnonKey === undefined) {
        delete process.env.SUPABASE_ANON_KEY;
    } else {
        process.env.SUPABASE_ANON_KEY = originalAnonKey;
    }
});

test('normalizes a Supabase REST endpoint to its project URL', () => {
    assert.deepEqual(getSupabaseConfig(), {
        url: 'https://project.supabase.co',
        anonKey: 'test-anon-key'
    });
});

test('rejects non-project API paths in SUPABASE_URL', () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co/storage/v1';
    assert.throws(getSupabaseConfig, /project URL, not a REST endpoint or another API path/);
});
