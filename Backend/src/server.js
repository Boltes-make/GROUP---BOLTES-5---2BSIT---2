const express = require('express');
const cors = require('cors');
const path = require('path');
const { createSupabaseClient } = require('./config/supabase');
const createSupabaseAdminClient = require('./config/supabaseAdmin');

const app = express();
const PORT = Number(process.env.APP_PORT) || 3000;
const frontendPath = path.resolve(__dirname, '../Frontend');

app.use(cors());
app.use(express.json({ limit: '16kb' }));
app.use(express.static(frontendPath, { index: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

function getBearerToken(req) {
    const match = (req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : '';
}

function configuredEmails(name) {
    return (process.env[name] || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
}

function isSuperAdmin(user) {
    const configured = configuredEmails('SUPERADMIN_EMAILS');
    const bootstrapSuperAdmin = configured.length ? configured : configuredEmails('ADMIN_EMAILS').slice(0, 1);
    return bootstrapSuperAdmin.includes((user.email || '').toLowerCase());
}

function publicUser(user) {
    const email = (user.email || '').toLowerCase();
    const role = isSuperAdmin(user)
        ? 'Superadmin'
        : configuredEmails('ADMIN_EMAILS').includes(email)
            ? 'Admin'
            : user.app_metadata?.role || 'User';

    return {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || '',
        role,
        status: user.app_metadata?.blocked === true
            ? 'blocked'
            : isPending(user) ? 'pending' : 'active'
    };
}

function isAdmin(user) {
    return ['Admin', 'Superadmin'].includes(publicUser(user).role);
}

function isBlocked(user) {
    return user.app_metadata?.blocked === true;
}

function isPending(user) {
    return user.app_metadata?.status !== 'approved' && !isSuperAdmin(user);
}

function requireRole(requiredRole) {
    return (req, res, next) => {
        const accessToken = getBearerToken(req);
        if (!accessToken) {
            return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
        }

        (async () => {
            const client = createSupabaseClient();
            const { data, error } = await client.auth.getUser(accessToken);

            if (error || !data.user) {
                return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
            }

            if (isBlocked(data.user) || isPending(data.user)) {
                return res.status(403).json({
                    success: false,
                    message: isBlocked(data.user)
                        ? 'Your account has been blocked. Contact an administrator.'
                        : 'Your account is pending approval.'
                });
            }

            if (requiredRole === 'Superadmin' && !isSuperAdmin(data.user)) {
                return res.status(403).json({ success: false, message: 'Superadmin access is required.' });
            }
            if (requiredRole === 'Admin' && !isAdmin(data.user)) {
                return res.status(403).json({ success: false, message: 'Administrator access is required.' });
            }

            req.adminUser = data.user;
            return next();
        })().catch((error) => {
            console.error('ADMIN AUTHORIZATION ERROR:', error.message);
            return res.status(503).json({
                success: false,
                message: 'Could not verify administrator access. Please try again.'
            });
        });
    };
}

const requireAdmin = requireRole('Admin');
const requireSuperAdmin = requireRole('Superadmin');

function sessionResponse(session) {
    return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at
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
    if ([...configuredEmails('ADMIN_EMAILS'), ...configuredEmails('SUPERADMIN_EMAILS')].includes(email)) {
        return res.status(409).json({
            success: false,
            message: 'This administrator email is reserved. Contact the Superadmin to set up its account.'
        });
    }

    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({
            success: false,
            message: 'Your password must be between 8 and 128 characters.'
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
            return res.status(error.status && error.status >= 400 && error.status < 500 ? error.status : 400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(201).json({
            success: true,
            status: 'pending',
            message: 'Your account request was received and is pending Superadmin approval.'
        });
    } catch (error) {
        console.error('REGISTRATION SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Registration is unavailable. Check the Supabase server configuration.'
        });
    }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const adminClient = createSupabaseAdminClient();
        const users = [];
        let page = 1;
        const perPage = 1000;

        while (true) {
            const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
            if (error) {
                console.error('USER LIST ERROR:', error.message);
                return res.status(503).json({
                    success: false,
                    message: 'Could not load users. Please try again.'
                });
            }

            users.push(...data.users);
            if (data.users.length < perPage) {
                break;
            }
            page += 1;
        }

        return res.json({ success: true, users: users.map(publicUser) });
    } catch (error) {
        console.error('USER LIST SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'User management is temporarily unavailable.'
        });
    }
});

app.patch('/api/admin/users/:id/approve', requireSuperAdmin, async (req, res) => {
    try {
        const adminClient = createSupabaseAdminClient();
        const { data: existing, error: findError } = await adminClient.auth.admin.getUserById(req.params.id);
        if (findError || !existing.user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (isBlocked(existing.user)) {
            return res.status(400).json({ success: false, message: 'Unblock this account before approving it.' });
        }

        const { data, error } = await adminClient.auth.admin.updateUserById(req.params.id, {
            app_metadata: { ...existing.user.app_metadata, status: 'approved' }
        });
        if (error) {
            console.error('APPROVE USER ERROR:', { message: error.message, status: error.status, code: error.code });
            return res.status(400).json({ success: false, message: error.message || 'Could not approve this user.' });
        }

        return res.json({ success: true, user: publicUser(data.user) });
    } catch (error) {
        console.error('APPROVE USER SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Could not approve this user. Please try again.'
        });
    }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = typeof req.body?.role === 'string' ? req.body.role : 'User';

    if (!fullName || fullName.length > 100) {
        return res.status(400).json({ success: false, message: 'Enter a name up to 100 characters long.' });
    }
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    if ([...configuredEmails('ADMIN_EMAILS'), ...configuredEmails('SUPERADMIN_EMAILS')].includes(email)) {
        return res.status(409).json({
            success: false,
            message: 'Administrator emails are reserved and cannot be assigned to another account.'
        });
    }
    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({ success: false, message: 'The temporary password must be between 8 and 128 characters.' });
    }
    if (!['Admin', 'User'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Choose a valid user role.' });
    }
    if (role === 'Admin' && !isSuperAdmin(req.adminUser)) {
        return res.status(403).json({ success: false, message: 'Only a Superadmin can designate administrators.' });
    }

    try {
        const adminClient = createSupabaseAdminClient();
        const { data, error } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
            app_metadata: { status: 'approved', role, blocked: false }
        });

        if (error) {
            console.error('ADD USER ERROR:', { message: error.message, status: error.status, code: error.code });
            return res.status(400).json({
                success: false,
                message: error.message || 'Could not add this user.'
            });
        }

        return res.status(201).json({ success: true, user: publicUser(data.user) });
    } catch (error) {
        console.error('ADD USER SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Could not add this user. Check the server configuration and try again.'
        });
    }
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!fullName || fullName.length > 100) {
        return res.status(400).json({ success: false, message: 'Enter a name up to 100 characters long.' });
    }
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    try {
        const adminClient = createSupabaseAdminClient();
        const { data: existing, error: findError } = await adminClient.auth.admin.getUserById(req.params.id);
        if (findError || !existing.user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (email !== (existing.user.email || '').toLowerCase() &&
            [...configuredEmails('ADMIN_EMAILS'), ...configuredEmails('SUPERADMIN_EMAILS')].includes(email)) {
            return res.status(409).json({
                success: false,
                message: 'Administrator emails are reserved and cannot be assigned to another account.'
            });
        }

        const { data, error } = await adminClient.auth.admin.updateUserById(req.params.id, {
            email,
            email_confirm: true,
            user_metadata: {
                ...existing.user.user_metadata,
                full_name: fullName
            }
        });
        if (error) {
            console.error('EDIT USER ERROR:', { message: error.message, status: error.status, code: error.code });
            return res.status(400).json({ success: false, message: error.message || 'Could not update this user.' });
        }

        return res.json({ success: true, user: publicUser(data.user) });
    } catch (error) {
        console.error('EDIT USER SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Could not update this user. Please try again.'
        });
    }
});

app.patch('/api/admin/users/:id/role', requireSuperAdmin, async (req, res) => {
    const role = typeof req.body?.role === 'string' ? req.body.role : '';
    if (!['Admin', 'User'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Choose a valid user role.' });
    }
    if (req.params.id === req.adminUser.id) {
        return res.status(400).json({ success: false, message: 'You cannot change your own administrator role.' });
    }

    try {
        const adminClient = createSupabaseAdminClient();
        const { data: existing, error: findError } = await adminClient.auth.admin.getUserById(req.params.id);
        if (findError || !existing.user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (isSuperAdmin(existing.user)) {
            return res.status(400).json({ success: false, message: 'Superadmin access is controlled by SUPERADMIN_EMAILS.' });
        }
        if (configuredEmails('ADMIN_EMAILS').includes((existing.user.email || '').toLowerCase())) {
            return res.status(400).json({ success: false, message: 'This configured administrator cannot be changed here.' });
        }

        const { data, error } = await adminClient.auth.admin.updateUserById(req.params.id, {
            app_metadata: { ...existing.user.app_metadata, role }
        });
        if (error) {
            console.error('DESIGNATE ADMIN ERROR:', { message: error.message, status: error.status, code: error.code });
            return res.status(400).json({ success: false, message: error.message || 'Could not change this user role.' });
        }

        return res.json({ success: true, user: publicUser(data.user) });
    } catch (error) {
        console.error('DESIGNATE ADMIN SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Could not change this user role. Please try again.'
        });
    }
});

app.patch('/api/admin/users/:id/block', requireAdmin, async (req, res) => {
    const blocked = req.body?.blocked;
    if (typeof blocked !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Choose whether to block or unblock this user.' });
    }
    if (req.params.id === req.adminUser.id && blocked) {
        return res.status(400).json({ success: false, message: 'You cannot block your own administrator account.' });
    }

    try {
        const adminClient = createSupabaseAdminClient();
        const { data: existing, error: findError } = await adminClient.auth.admin.getUserById(req.params.id);
        if (findError || !existing.user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (isSuperAdmin(existing.user) && !isSuperAdmin(req.adminUser)) {
            return res.status(403).json({ success: false, message: 'Only a Superadmin can block another Superadmin.' });
        }

        const { data, error } = await adminClient.auth.admin.updateUserById(req.params.id, {
            app_metadata: { ...existing.user.app_metadata, blocked }
        });
        if (error) {
            console.error('BLOCK USER ERROR:', { message: error.message, status: error.status, code: error.code });
            return res.status(400).json({ success: false, message: error.message || 'Could not update this user.' });
        }

        return res.json({ success: true, user: publicUser(data.user) });
    } catch (error) {
        console.error('BLOCK USER SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Could not update this user. Please try again.'
        });
    }
});

app.post('/api/auth/password-reset/request', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid email address.'
        });
    }

    try {
        const client = createSupabaseClient();
        const redirectTo = process.env.AUTH_REDIRECT_URL?.trim() || `http://localhost:${PORT}/`;
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo
        });

        if (error) {
            console.error('PASSWORD RESET REQUEST ERROR:', {
                message: error.message,
                status: error.status,
                code: error.code
            });
            const status = error.status === 429 ? 429 : 400;
            return res.status(status).json({
                success: false,
                message: status === 429
                    ? 'Password reset email limit reached. Please wait before requesting another link.'
                    : 'Could not request a password reset. Check the email and try again.'
            });
        }

        return res.json({
            success: true,
            message: 'If an account exists for that email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('PASSWORD RESET SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Password reset is temporarily unavailable. Please try again later.'
        });
    }
});

app.post('/api/auth/password-reset/confirm', async (req, res) => {
    const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken : '';
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!accessToken || !refreshToken) {
        return res.status(400).json({
            success: false,
            message: 'The reset link is invalid or expired. Request a new reset link.'
        });
    }

    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({
            success: false,
            message: 'Your password must be between 8 and 128 characters.'
        });
    }

    try {
        const client = createSupabaseClient();
        const { data: sessionData, error: sessionError } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        if (sessionError || !sessionData.user) {
            return res.status(401).json({
                success: false,
                message: 'The reset link is invalid or expired. Request a new reset link.'
            });
        }

        const { error } = await client.auth.updateUser({ password });
        if (error) {
            console.error('PASSWORD RESET CONFIRM ERROR:', {
                message: error.message,
                status: error.status,
                code: error.code
            });
            return res.status(error.status === 429 ? 429 : 400).json({
                success: false,
                message: error.status === 429
                    ? 'Too many password changes. Please wait and try again.'
                    : 'Could not update the password. Request a new reset link and try again.'
            });
        }

        const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
        if (signOutError) {
            console.error('PASSWORD RESET SIGN-OUT ERROR:', signOutError.message);
        }

        return res.json({
            success: true,
            message: 'Your password has been updated. You can now sign in.'
        });
    } catch (error) {
        console.error('PASSWORD RESET CONFIRM SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Password reset is temporarily unavailable. Please try again later.'
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

        if (isBlocked(data.user) || isPending(data.user)) {
            const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
            if (signOutError) {
                console.error('PENDING USER SIGN-OUT ERROR:', signOutError.message);
            }
            return res.status(403).json({
                success: false,
                message: isBlocked(data.user)
                    ? 'Your account has been blocked. Contact an administrator.'
                    : 'Your account is pending approval.'
            });
        }

        return res.json({
            success: true,
            session: sessionResponse(data.session),
            user: publicUser(data.user)
        });
    } catch (error) {
        console.error('LOGIN SERVER ERROR:', error.message);
        return res.status(503).json({
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
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please sign in again.'
            });
        }

        if (isBlocked(data.user) || isPending(data.user)) {
            return res.status(403).json({
                success: false,
                message: isBlocked(data.user)
                    ? 'Your account has been blocked. Contact an administrator.'
                    : 'Your account is pending approval.'
            });
        }

        return res.json({ success: true, user: publicUser(data.user) });
    } catch (error) {
        console.error('SESSION CHECK ERROR:', error.message);
        return res.status(503).json({
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
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please sign in again.'
            });
        }

        if (isBlocked(data.user) || isPending(data.user)) {
            const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
            if (signOutError) {
                console.error('PENDING SESSION SIGN-OUT ERROR:', signOutError.message);
            }
            return res.status(403).json({
                success: false,
                message: isBlocked(data.user)
                    ? 'Your account has been blocked. Contact an administrator.'
                    : 'Your account is pending approval.'
            });
        }

        return res.json({
            success: true,
            session: sessionResponse(data.session),
            user: publicUser(data.user)
        });
    } catch (error) {
        console.error('SESSION REFRESH ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Could not refresh your session. Please sign in again.'
        });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    const accessToken = getBearerToken(req);
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
    if (!accessToken || !refreshToken) {
        return res.status(400).json({ success: false, message: 'An active session is required.' });
    }

    try {
        const client = createSupabaseClient();
        const { error: sessionError } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        if (sessionError) {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please sign in again.'
            });
        }

        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) {
            console.error('LOGOUT ERROR:', error.message);
            return res.status(503).json({
                success: false,
                message: 'Could not end the session. Please try again.'
            });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('LOGOUT SERVER ERROR:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Could not log out. Please try again.'
        });
    }
});

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({ success: false, message: 'Request body must be valid JSON.' });
    }
    console.error('SERVER ERROR:', error.message);
    return res.status(500).json({ success: false, message: 'Unexpected server error.' });
});

app.listen(PORT, () => {
    console.log(`HOPE ERP Backend running on port ${PORT}`);
});
