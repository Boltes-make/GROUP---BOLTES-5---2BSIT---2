
console.log('SERVER FILE:', __filename);
console.log('WORKING DIRECTORY:', process.cwd());

const express = require('express');
const cors = require('cors');
const path = require('path');
const createSupabaseClient = require('./config/supabase');
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

function getBearerToken(req) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : '';
}

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || '',
        role: user.app_metadata?.role || 'User'
    };
}

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

app.post('/api/auth/login', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !password || password.length > 128) {
        return res.status(400).json({
            success: false,
            message: 'Enter a valid email address and password.'
        });
    }

    try {
        const client = createSupabaseClient();
        const { data, error } = await client.auth.signInWithPassword({ email, password });

        if (error || !data.user || !data.session) {
            return res.status(401).json({
                success: false,
                message: 'Email or password is incorrect.'
            });
        }

        if (data.user.app_metadata?.status !== 'approved') {
            await client.auth.signOut({ scope: 'global' });
            return res.status(403).json({
                success: false,
                message: 'Your account is pending approval.'
            });
        }

        return res.json({
            success: true,
            session: {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresAt: data.session.expires_at
            },
            user: publicUser(data.user)
        });
    } catch (error) {
        console.error('LOGIN SERVER ERROR:', error);
        return res.status(500).json({
            success: false,
            message: 'Login is temporarily unavailable. Please try again.'
        });
    }
});

app.get('/api/auth/session', async (req, res) => {
    const accessToken = getBearerToken(req);
    if (!accessToken) {
        return res.status(401).json({ success: false, message: 'No active session.' });
    }

    try {
        const client = createSupabaseClient();
        const { data, error } = await client.auth.getUser(accessToken);

        if (error || !data.user) {
            return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
        }

        if (data.user.app_metadata?.status !== 'approved') {
            return res.status(403).json({ success: false, message: 'Your account is pending approval.' });
        }

        return res.json({ success: true, user: publicUser(data.user) });
    } catch (error) {
        console.error('SESSION CHECK ERROR:', error);
        return res.status(500).json({
            success: false,
            message: 'Could not verify your session. Please try again.'
        });
    }
});

app.post('/api/auth/refresh', async (req, res) => {
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
    if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'A refresh token is required.' });
    }

    try {
        const client = createSupabaseClient();
        const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });

        if (error || !data.user || !data.session) {
            return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
        }

        if (data.user.app_metadata?.status !== 'approved') {
            await client.auth.signOut({ scope: 'global' });
            return res.status(403).json({ success: false, message: 'Your account is pending approval.' });
        }

        return res.json({
            success: true,
            session: {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresAt: data.session.expires_at
            },
            user: publicUser(data.user)
        });
    } catch (error) {
        console.error('SESSION REFRESH ERROR:', error);
        return res.status(500).json({
            success: false,
            message: 'Could not refresh your session. Please sign in again.'
        });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    const accessToken = getBearerToken(req);
    if (!accessToken) {
        return res.status(401).json({ success: false, message: 'No active session.' });
    }

    try {
        const client = createSupabaseClient();
        const { data, error } = await client.auth.getUser(accessToken);

        if (error || !data.user) {
            return res.json({ success: true });
        }

        const { error: sessionError } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: req.body?.refreshToken || ''
        });

        if (sessionError) {
            console.error('LOGOUT SESSION ERROR:', sessionError.message);
            return res.status(401).json({ success: false, message: 'Session is no longer valid.' });
        }

        const { error: logoutError } = await client.auth.signOut({ scope: 'local' });
        if (logoutError) {
            console.error('LOGOUT ERROR:', logoutError.message);
            return res.status(502).json({ success: false, message: 'Could not end the session. Please try again.' });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('LOGOUT SERVER ERROR:', error);
        return res.status(500).json({ success: false, message: 'Could not log out. Please try again.' });
    }
});

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('TEST-DB ROUTE WAS CALLED');

        const { data, error } = await createSupabaseClient()
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
