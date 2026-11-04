
console.log('SERVER FILE:', __filename);
console.log('WORKING DIRECTORY:', process.cwd());

const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./config/supabase');
const createSupabaseAdminClient = require('./config/supabaseAdmin');

const app = express();
const PORT = process.env.APP_PORT || 3000;
const frontendPath = path.resolve(__dirname, '../Frontend');

app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath, { index: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.post('/api/register', async (req, res) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!fullName || fullName.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a name that is no longer than 100 characters.'
        });
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid email address.'
        });
    }

    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({
            success: false,
            message: 'Your password must be between 8 and 128 characters.'
        });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceRoleKey || serviceRoleKey.startsWith('sb_publishable_')) {
        return res.status(503).json({
            success: false,
            message: 'Registration needs a valid Supabase secret or service_role key in the server .env file.'
        });
    }

    try {
        const adminClient = createSupabaseAdminClient();
        const { error } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName
            },
            app_metadata: {
                status: 'pending',
                role: 'User'
            }
        });

        if (error) {
            console.error('REGISTRATION ERROR:', {
                message: error.message,
                status: error.status,
                code: error.code
            });
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(201).json({
            success: true,
            status: 'pending',
            message: 'Your account request was received. It is now pending approval.'
        });
    } catch (error) {
        console.error('REGISTRATION SERVER ERROR:', error);
        return res.status(500).json({
            success: false,
            message: 'We could not create your account right now. Please try again later.'
        });
    }
});

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('TEST-DB ROUTE WAS CALLED');

        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .limit(1);

        if (error) {
            console.error('SUPABASE ERROR:', error);

            return res.status(500).json({
                success: false,
                message: 'Supabase connection test failed.',
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
        }

        console.log('SUPABASE CONNECTION SUCCESSFUL');

        res.json({
            success: true,
            message: 'Supabase connection successful!',
            data: data
        });

    } catch (error) {
        console.error('SERVER ERROR:', error);

        res.status(500).json({
            success: false,
            message: 'Unexpected server error.',
            error: error.message,
            stack: error.stack
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`HOPE ERP Backend running on port ${PORT}`);
});
