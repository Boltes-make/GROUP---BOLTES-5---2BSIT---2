const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

process.env.SUPERADMIN_EMAILS = 'super@example.test,second-super@example.test';
process.env.ADMIN_EMAILS = 'admin@example.test,super@example.test,second-super@example.test';

const users = new Map([
    ['super', {
        id: 'super', email: 'super@example.test', user_metadata: { full_name: 'Super' },
        app_metadata: { role: 'User', status: 'approved', permissions: {} }
    }],
    ['second-super', {
        id: 'second-super', email: 'second-super@example.test', user_metadata: { full_name: 'Second Super' },
        app_metadata: { role: 'User', status: 'approved', permissions: {} }
    }],
    ['admin', {
        id: 'admin', email: 'admin@example.test', user_metadata: { full_name: 'Admin' },
        app_metadata: { role: 'Admin', status: 'approved', permissions: {} }
    }],
    ['user', {
        id: 'user', email: 'user@example.test', user_metadata: { full_name: 'User' },
        app_metadata: { role: 'User', status: 'approved', permissions: {} }
    }],
    ['other-admin', {
        id: 'other-admin', email: 'other-admin@example.test', user_metadata: { full_name: 'Other Admin' },
        app_metadata: { role: 'Admin', status: 'approved', permissions: {} }
    }]
]);
const auditLog = [];
let auditUnavailable = false;

require.cache[require.resolve('../src/config/supabase')] = {
    id: require.resolve('../src/config/supabase'),
    filename: require.resolve('../src/config/supabase'),
    loaded: true,
    exports: {
        createSupabaseClient: () => ({
            auth: {
                getUser: async (token) => ({
                    data: { user: users.get(token) || null },
                    error: users.has(token) ? null : new Error('Invalid token')
                })
            }
        })
    }
};

require.cache[require.resolve('../src/config/supabaseAdmin')] = {
    id: require.resolve('../src/config/supabaseAdmin'),
    filename: require.resolve('../src/config/supabaseAdmin'),
    loaded: true,
    exports: () => ({
        auth: {
            admin: {
                createUser: async (attributes) => {
                    const user = {
                        id: randomUUID(),
                        email: attributes.email,
                        user_metadata: attributes.user_metadata,
                        app_metadata: attributes.app_metadata
                    };
                    users.set(user.id, user);
                    return { data: { user }, error: null };
                },
                getUserById: async (id) => ({
                    data: { user: users.get(id) || null },
                    error: users.has(id) ? null : new Error('User not found')
                }),
                updateUserById: async (id, changes) => {
                    const user = users.get(id);
                    if (!user) {
                        return { data: { user: null }, error: new Error('User not found') };
                    }
                    Object.assign(user, changes);
                    return { data: { user }, error: null };
                },
                listUsers: async ({ page, perPage }) => {
                    const allUsers = [...users.values()];
                    return { data: { users: allUsers.slice((page - 1) * perPage, page * perPage) }, error: null };
                }
            }
        },
        from: (table) => {
            assert.equal(table, 'audit_log');
            return {
                insert: (entry) => {
                    return {
                        select: () => ({
                            single: async () => {
                                if (auditUnavailable) {
                                    return { data: null, error: new Error('audit table unavailable') };
                                }
                                const inserted = { id: randomUUID(), ...structuredClone(entry) };
                                auditLog.push(inserted);
                                return { data: { id: inserted.id }, error: null };
                            }
                        })
                    };
                },
                update: (changes) => ({
                    eq: async (_field, id) => {
                        const entry = auditLog.find((item) => item.id === id);
                        Object.assign(entry, changes);
                        return { error: null };
                    }
                })
            };
        }
    })
};

const { app } = require('../src/server');
let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(pathname, token, options = {}) {
    const response = await fetch(`${baseUrl}${pathname}`, {
        ...options,
        headers: {
            ...(options.body ? { 'content-type': 'application/json' } : {}),
            authorization: `Bearer ${token}`,
            ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    return { status: response.status, body: await response.json() };
}

function rights({ customer = [], product = [], hr = [], sales = [], reports = [] } = {}) {
    const result = {};
    for (const [module, actions] of Object.entries({ customer, product, hr, sales, reports })) {
        result[module] = Object.fromEntries(['view', 'create', 'edit', 'delete'].map((action) => [
            action, actions.includes(action)
        ]));
    }
    return result;
}

test('module and action checks enforce assigned rights server-side', async () => {
    users.get('user').app_metadata.permissions = rights();
    assert.equal((await request('/api/modules/customer', 'user')).status, 403);
    assert.equal((await request('/api/modules/customer/authorize/create', 'user', { method: 'POST' })).status, 403);

    users.get('user').app_metadata.permissions = rights({ customer: ['view', 'create'] });
    assert.equal((await request('/api/modules/customer', 'user')).status, 200);
    assert.equal((await request('/api/modules/customer/authorize/create', 'user', { method: 'POST' })).status, 200);
    assert.equal((await request('/api/modules/customer/authorize/delete', 'user', { method: 'POST' })).status, 403);
});

test('rights changes require a successful persistent audit entry', async () => {
    auditLog.length = 0;
    const assigned = rights({ reports: ['view', 'edit'] });
    const result = await request('/api/admin/users/user/rights', 'admin', {
        method: 'PATCH',
        body: { permissions: assigned }
    });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.user.permissions, assigned);
    assert.equal(auditLog.length, 1);
    assert.equal(auditLog[0].event_type, 'module_rights_changed');
    assert.equal(auditLog[0].status, 'succeeded');
    assert.deepEqual(auditLog[0].after_state, assigned);
});

test('rights are not changed when the required audit insert fails', async () => {
    const previous = structuredClone(users.get('user').app_metadata.permissions);
    auditUnavailable = true;
    const result = await request('/api/admin/users/user/rights', 'admin', {
        method: 'PATCH',
        body: { permissions: rights({ sales: ['view', 'create'] }) }
    });
    auditUnavailable = false;
    assert.equal(result.status, 503);
    assert.match(result.body.message, /audit log/i);
    assert.deepEqual(users.get('user').app_metadata.permissions, previous);
});

test('admins cannot assign rights to administrator accounts', async () => {
    const result = await request('/api/admin/users/other-admin/rights', 'admin', {
        method: 'PATCH',
        body: { permissions: rights({ reports: ['view'] }) }
    });
    assert.equal(result.status, 403);
});

test('new Admin designation is audited before the account receives the Admin role', async () => {
    auditLog.length = 0;
    const result = await request('/api/admin/users', 'super', {
        method: 'POST',
        body: {
            fullName: 'New Admin',
            email: 'new-admin@example.test',
            password: 'a-strong-demo-password',
            role: 'Admin'
        }
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.user.role, 'Admin');
    assert.equal(auditLog.length, 1);
    assert.equal(auditLog[0].event_type, 'role_changed');
    assert.equal(auditLog[0].status, 'succeeded');
});

test('role changes are not applied when the required audit insert fails', async () => {
    auditLog.length = 0;
    auditUnavailable = true;
    const result = await request('/api/admin/users/user/role', 'super', {
        method: 'PATCH',
        body: { role: 'Admin' }
    });
    auditUnavailable = false;
    assert.equal(result.status, 503);
    assert.match(result.body.message, /audit log/i);
    assert.equal(users.get('user').app_metadata.role, 'User');
});

test('blocking another Superadmin leaves one active and self-blocking is rejected', async () => {
    assert.equal((await request('/api/admin/users/super/block', 'super', {
        method: 'PATCH',
        body: { blocked: true }
    })).status, 400);

    const result = await request('/api/admin/users/second-super/block', 'super', {
        method: 'PATCH',
        body: { blocked: true }
    });
    assert.equal(result.status, 200);
    assert.equal(users.get('second-super').app_metadata.blocked, true);
    assert.equal(users.get('super').app_metadata.blocked, undefined);
});
