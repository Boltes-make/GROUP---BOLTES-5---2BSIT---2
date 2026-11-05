const authGrid = document.querySelector('#auth-grid');
const appPanel = document.querySelector('#app-panel');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const resetCard = document.querySelector('#password-reset');
const resetRequestForm = document.querySelector('#reset-request-form');
const resetPasswordForm = document.querySelector('#reset-password-form');
const userForm = document.querySelector('#user-form');
const rightsDialog = document.querySelector('#rights-dialog');
const rightsForm = document.querySelector('#rights-form');
const loginMessage = document.querySelector('#login-message');
const registerMessage = document.querySelector('#form-message');
const resetRequestMessage = document.querySelector('#reset-request-message');
const resetPasswordMessage = document.querySelector('#reset-password-message');
const sessionMessage = document.querySelector('#session-message');
const usersMessage = document.querySelector('#users-message');
const userFormMessage = document.querySelector('#user-form-message');
const rightsMessage = document.querySelector('#rights-message');
const loginButton = document.querySelector('#login-button');
const registerButton = document.querySelector('#submit-button');
const resetRequestButton = document.querySelector('#reset-request-button');
const resetPasswordButton = document.querySelector('#reset-password-button');
const logoutButton = document.querySelector('#logout-button');
const saveUserButton = document.querySelector('#save-user-button');
const storageKey = 'hope-community-session';
const demoRoleKey = 'hope-community-demo-role';
const demoUsersKey = 'hope-community-demo-users';
const demoAuditKey = 'hope-community-demo-audit-log';
const moduleDefinitions = [
  { id: 'customer', title: 'Customer', description: 'Customer workspace.' },
  { id: 'product', title: 'Product', description: 'Product workspace.' },
  { id: 'hr', title: 'Human Resources', description: 'Human Resources workspace.' },
  { id: 'sales', title: 'Sales', description: 'Sales workspace.' },
  { id: 'reports', title: 'Reports', description: 'Reports workspace.' }
];
const permissionActions = ['view', 'create', 'edit', 'delete'];
const demoUserTemplates = [
  { id: 'demo-superadmin', fullName: 'Demo Superadmin', email: 'superadmin@example.test', role: 'Superadmin', permissions: createEmptyPermissions(), status: 'active' },
  { id: 'demo-admin', fullName: 'Demo Admin', email: 'admin@example.test', role: 'Admin', permissions: createAllPermissions(), status: 'active' },
  { id: 'demo-user-reports', fullName: 'Demo User With Reports', email: 'reports-user@example.test', role: 'User', permissions: createModulePermissions({ reports: ['view'] }), status: 'active' },
  { id: 'demo-user', fullName: 'Demo User', email: 'user@example.test', role: 'User', permissions: createEmptyPermissions(), status: 'active' },
  { id: 'demo-pending-user', fullName: 'Demo Pending User', email: 'pending-user@example.test', role: 'User', permissions: createEmptyPermissions(), status: 'pending' }
];
const isLocalPreview = window.location.protocol === 'file:' ||
  ['localhost', '127.0.0.1'].includes(window.location.hostname);
const apiBaseUrl = isLocalPreview ? 'http://localhost:3000' : window.location.origin;
let currentUser = null;
let users = [];
let sessionRefreshPromise = null;

document.querySelector('#demo-login-button').addEventListener('click', () => {
  try {
    const role = document.querySelector('#demo-role').value;
    const demoUser = getDemoSessionUser(role);
    if (!demoUser) {
      showMessage(loginMessage, 'error', 'Choose a valid demo role.');
      return;
    }

    clearSession();
    sessionStorage.setItem(demoRoleKey, role);
    showSignedIn(demoUser);
  } catch (error) {
    showMessage(loginMessage, 'error', error.message);
  }
});

document.querySelector('#reset-demo-button').addEventListener('click', () => {
  if (!isDemoSession()) {
    return;
  }
  try {
    resetDemoUsers();
    showMessage(sessionMessage, 'success', 'Demo sample data has been reset.');
    if (!document.querySelector('#users-view').hidden) {
      loadUsers();
    } else {
      renderModuleTiles(currentUser);
    }
  } catch (error) {
    showMessage(sessionMessage, 'error', error.message);
  }
});

document.querySelectorAll('[data-password-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const shouldShow = input.type === 'password';

    input.type = shouldShow ? 'text' : 'password';
    button.textContent = shouldShow ? 'Hide' : 'Show';
    button.setAttribute('aria-pressed', String(shouldShow));
    button.setAttribute(
      'aria-label',
      `${shouldShow ? 'Hide' : 'Show'} ${input.id.includes('confirm') ? 'confirmation password' : 'password'}`
    );
  });
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage(loginMessage);
  setButtonBusy(loginButton, true, 'Signing in...');

  try {
    const formData = new FormData(loginForm);
    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: formData.get('email').trim(),
        password: formData.get('password')
      }
    });

    saveSession(result.session);
    showSignedIn(result.user);
    loginForm.reset();
  } catch (error) {
    showMessage(loginMessage, 'error', error.message);
  } finally {
    setButtonBusy(loginButton, false, 'Sign in');
  }
});

document.querySelector('#forgot-password-link').addEventListener('click', (event) => {
  event.preventDefault();
  const loginEmail = loginForm.elements.email.value.trim();
  if (loginEmail) {
    resetRequestForm.elements.email.value = loginEmail;
  }
  showResetPanel();
  document.querySelector('#reset-email').focus();
});

document.querySelectorAll('[data-return-login]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    showLoginPanel();
    loginForm.elements.email.focus();
  });
});

document.querySelectorAll('[data-app-view]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const view = button.dataset.appView;
    if (view === 'users' && currentUser?.role !== 'Admin') {
    if (view === 'users' && !['Admin', 'Superadmin'].includes(currentUser?.role)) {
      showMessage(sessionMessage, 'error', 'Administrator access is required.');
      return;
    }
    setAppView(view);
  });
appPanel.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-app-view]');
  if (button) {
    event.preventDefault();
    await setAppView(button.dataset.appView);
  }
});

document.querySelector('#add-user-button').addEventListener('click', () => openUserEditor());
document.querySelector('#cancel-user-button').addEventListener('click', closeUserEditor);
document.querySelector('#user-search').addEventListener('input', renderUsers);

document.querySelector('#cancel-rights-button').addEventListener('click', () => rightsDialog.close());
document.querySelector('#user-search').addEventListener('input', renderUsers);

buildRightsMatrix();
document.querySelector('#rights-all-button').addEventListener('click', () => setAllRights(true));
document.querySelector('#rights-none-button').addEventListener('click', () => setAllRights(false));
document.querySelector('#rights-table-body').addEventListener('change', (event) => {
  const input = event.target;
  if (input.matches('[data-module-toggle]')) {
    const moduleId = input.dataset.moduleToggle;
    document.querySelectorAll(`[data-module="${moduleId}"]`).forEach((action) => {
      action.checked = input.checked;
    });
  } else if (input.matches('[data-module-action]')) {
    const { module: moduleId } = input.dataset;
    const moduleToggle = document.querySelector(`[data-module-toggle="${moduleId}"]`);
    const moduleActions = [...document.querySelectorAll(`[data-module="${moduleId}"]`)];
    moduleToggle.checked = moduleActions.some((action) => action.checked);
    moduleToggle.indeterminate = moduleActions.some((action) => action.checked) &&
      moduleActions.some((action) => !action.checked);
  }
});

document.querySelector('#users-table-body').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-user-action]');
  if (!button) {
    return;
  }

  const user = users.find((item) => item.id === button.dataset.userId);
  if (!user) {
    showMessage(usersMessage, 'error', 'That user is no longer available. Reload the user list and try again.');
    return;
  }

  if (button.dataset.userAction === 'edit') {
    openUserEditor(user);
    return;
  }

  if (button.dataset.userAction === 'rights') {
    openRightsDialog(user);
    return;
  }

  if (button.dataset.userAction === 'approve') {
    button.disabled = true;
    clearMessage(usersMessage);
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(user.id)}/approve`, {
        method: 'PATCH',
        accessToken: readSession()?.accessToken,
        body: {}
      });
      if (isDemoSession()) {
        updateDemoUser(user.id, { status: 'active' });
      } else {
        await apiRequest(`/api/admin/users/${encodeURIComponent(user.id)}/approve`, {
          method: 'PATCH',
          accessToken: readSession()?.accessToken,
          body: {}
        });
      }
      await loadUsers();
      showMessage(usersMessage, 'success', `${user.fullName || user.email} was approved.`);
    } catch (error) {
      showMessage(usersMessage, 'error', error.message);
      button.disabled = false;
    }
    return;
  }

  const shouldBlock = user.status !== 'blocked';
  const action = shouldBlock ? 'block' : 'unblock';
  if (!window.confirm(`Are you sure you want to ${action} ${user.fullName || user.email}?`)) {
    return;
  }

  button.disabled = true;
  clearMessage(usersMessage);
  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(user.id)}/block`, {
      method: 'PATCH',
      accessToken: readSession()?.accessToken,
      body: { blocked: shouldBlock }
    });
    if (isDemoSession()) {
      updateDemoUser(user.id, { status: shouldBlock ? 'blocked' : 'active' });
    } else {
      await apiRequest(`/api/admin/users/${encodeURIComponent(user.id)}/block`, {
        method: 'PATCH',
        accessToken: readSession()?.accessToken,
        body: { blocked: shouldBlock }
      });
    }
    await loadUsers();
    showMessage(usersMessage, 'success', `User ${shouldBlock ? 'blocked' : 'unblocked'} successfully.`);
  } catch (error) {
    showMessage(usersMessage, 'error', error.message);
    button.disabled = false;
  }
});

rightsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const targetId = rightsForm.dataset.userId;
  const target = users.find((user) => user.id === targetId);
  if (!target) {
    showMessage(rightsMessage, 'error', 'That user is no longer available. Reload the user list and try again.');
    return;
  }
  const permissions = readRightsMatrix();
  clearMessage(rightsMessage);
  const saveButton = document.querySelector('#save-rights-button');
  setButtonBusy(saveButton, true, 'Saving rights...');
  try {
    if (isDemoSession()) {
      updateDemoRights(target, permissions);
    } else {
      await apiRequest(`/api/admin/users/${encodeURIComponent(target.id)}/rights`, {
        method: 'PATCH',
        accessToken: readSession()?.accessToken,
        body: { permissions }
      });
    }
    rightsDialog.close();
    await loadUsers();
    showMessage(usersMessage, 'success', `Module rights for ${target.fullName || target.email} were saved.`);
  } catch (error) {
    showMessage(rightsMessage, 'error', error.message);
  } finally {
    setButtonBusy(saveButton, false, 'Save rights');
  }
});

userForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage(userFormMessage);
  setButtonBusy(saveUserButton, true, userForm.dataset.userId ? 'Saving changes...' : 'Adding user...');

  const formData = new FormData(userForm);
  const userId = userForm.dataset.userId;
  const body = {
    fullName: formData.get('fullName').trim(),
    email: formData.get('email').trim(),
    role: formData.get('role')
  };
  if (!userId) {
    body.password = formData.get('password');
    email: formData.get('email').trim()
  };
  if (!userId) {
    body.password = formData.get('password');
    if (currentUser?.role === 'Superadmin') {
      body.role = formData.get('role');
    }
  }

  try {
    const result = await apiRequest(
      userId ? `/api/admin/users/${encodeURIComponent(userId)}` : '/api/admin/users',
      {
        method: userId ? 'PATCH' : 'POST',
        accessToken: readSession()?.accessToken,
        body
      }
    );
    if (userId && userId !== currentUser?.id && currentUser?.role === 'Superadmin' &&
        formData.get('role') !== users.find((user) => user.id === userId)?.role) {
      await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        accessToken: readSession()?.accessToken,
        body: { role: formData.get('role') }
      });
  }
  if (currentUser?.role === 'Superadmin' && userId !== currentUser?.id) {
    body.role = formData.get('role');
  }

  try {
    let result;
    if (isDemoSession()) {
      result = saveDemoUser(userId, body);
    } else {
      result = await apiRequest(
        userId ? `/api/admin/users/${encodeURIComponent(userId)}` : '/api/admin/users',
        {
          method: userId ? 'PATCH' : 'POST',
          accessToken: readSession()?.accessToken,
          body
        }
      );
    }
    closeUserEditor();
    await loadUsers();
    showMessage(usersMessage, 'success', userId
      ? 'User details updated successfully.'
      : `${result.user.fullName || result.user.email} was added successfully.`);
  } catch (error) {
    showMessage(userFormMessage, 'error', error.message);
  } finally {
    setButtonBusy(saveUserButton, false, userId ? 'Save Changes' : 'Add User');
  }
});

resetRequestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage(resetRequestMessage);
  setButtonBusy(resetRequestButton, true, 'Sending reset link...');

  try {
    const result = await apiRequest('/api/auth/password-reset/request', {
      method: 'POST',
      body: { email: resetRequestForm.elements.email.value.trim() }
    });
    showMessage(resetRequestMessage, 'success', result.message);
  } catch (error) {
    showMessage(resetRequestMessage, 'error', error.message);
  } finally {
    setButtonBusy(resetRequestButton, false, 'Send reset link');
  }
});

resetPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage(resetPasswordMessage);

  const password = resetPasswordForm.elements.password.value;
  const confirmPassword = resetPasswordForm.elements.confirmPassword.value;
  if (password !== confirmPassword) {
    showMessage(resetPasswordMessage, 'error', 'Your passwords do not match.');
    document.querySelector('#confirm-new-password').focus();
    return;
  }

  if (!recoveryTokens) {
    showMessage(resetPasswordMessage, 'error', 'The reset link is invalid or expired. Request a new reset link.');
    return;
  }

  setButtonBusy(resetPasswordButton, true, 'Updating password...');
  try {
    const result = await apiRequest('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: {
        ...recoveryTokens,
        password
      }
    });
    recoveryTokens = null;
    resetPasswordForm.reset();
    showLoginPanel();
    resetRequestForm.reset();
    showMessage(loginMessage, 'success', result.message);
  } catch (error) {
    showMessage(resetPasswordMessage, 'error', error.message);
  } finally {
    setButtonBusy(resetPasswordButton, false, 'Update password');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage(registerMessage);

  const formData = new FormData(registerForm);
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (password !== confirmPassword) {
    showMessage(registerMessage, 'error', 'Your passwords do not match.');
    document.querySelector('#confirm-password').focus();
    return;
  }

  setButtonBusy(registerButton, true, 'Creating account...');

  try {
    const result = await apiRequest('/api/register', {
      method: 'POST',
      body: {
        fullName: formData.get('fullName').trim(),
        email: formData.get('email').trim(),
        password
      }
    });

    registerForm.reset();
    resetPasswordToggles(registerForm);
    showMessage(registerMessage, 'success', result.message);
  } catch (error) {
    showMessage(registerMessage, 'error', error.message);
  } finally {
    setButtonBusy(registerButton, false, 'Create account');
  }
});

logoutButton.addEventListener('click', async () => {
  const session = readSession();
  logoutButton.disabled = true;
  logoutButton.textContent = 'Logging out...';
  clearMessage(sessionMessage);

  try {
    if (session?.accessToken && session?.refreshToken) {
      await apiRequest('/api/auth/logout', {
  clearSession();
  showAuthForms();

  try {
    if (session?.accessToken && session?.refreshToken) {
      await sendApiRequest('/api/auth/logout', {
        method: 'POST',
        accessToken: session.accessToken,
        body: { refreshToken: session.refreshToken }
      });
    }
    clearSession();
    showAuthForms();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      endSession(error.message);
    } else {
      showMessage(sessionMessage, 'error', error.message);
    }
    showMessage(loginMessage, 'success', 'You have been logged out.');
  } catch (error) {
    showMessage(
      loginMessage,
      error.status === 401 || error.status === 403 ? 'success' : 'error',
      error.status === 401 || error.status === 403
        ? 'You have been logged out. Your server session was already expired.'
        : 'You have been logged out of this browser, but the server could not be reached to revoke the session.'
    );
  } finally {
    logoutButton.disabled = false;
    logoutButton.textContent = 'Log out';
  }
});

async function restoreSession() {
  try {
    const demoRole = sessionStorage.getItem(demoRoleKey);
    if (demoRole) {
      const demoUser = getDemoSessionUser(demoRole);
      if (demoUser) {
        showSignedIn(demoUser);
        return;
      }
      sessionStorage.removeItem(demoRoleKey);
    }
  } catch (error) {
    showAuthForms();
    showMessage(loginMessage, 'error', error.message);
    return;
  }

  const session = readSession();
  if (!session?.accessToken) {
    clearSession();
    return;
  }

  try {
    const result = await apiRequest('/api/auth/session', {
      accessToken: session.accessToken
    });
    showSignedIn(result.user);
  } catch (error) {
    if (error.status === 401 && session.refreshToken) {
      try {
        const refreshed = await refreshStoredSession();
        const result = await apiRequest('/api/auth/session', {
          accessToken: refreshed.accessToken
        });
        showSignedIn(result.user);
        return;
      } catch (refreshError) {
        if (refreshError.status === 401 || refreshError.status === 403) {
          endSession(refreshError.status === 403
            ? refreshError.message
            : 'Your session expired. Please sign in again.');
        } else {
          showAuthForms();
          showMessage(loginMessage, 'error', refreshError.message);
        }
        return;
      }
    }

    if (error.status === 401 || error.status === 403) {
      endSession(error.message);
    } else {
      showAuthForms();
      showMessage(loginMessage, 'error', error.message);
    }
  }
}

let recoveryTokens = null;

function handleRecoveryLink() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const recoveryError = hash.get('error_description') || hash.get('error');
  const type = hash.get('type');
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');

  if (recoveryError) {
    showResetPanel();
    resetRequestForm.hidden = false;
    resetPasswordForm.hidden = true;
    showMessage(resetRequestMessage, 'error', 'The reset link is invalid or expired. Request a new reset link.');
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    return;
  }

  if (type !== 'recovery') {
    return;
  }

  if (!accessToken || !refreshToken) {
    showResetPanel();
    showMessage(resetRequestMessage, 'error', 'The reset link is incomplete. Request a new reset link.');
    return;
  }

  recoveryTokens = { accessToken, refreshToken };
  showResetPanel();
  resetRequestForm.hidden = true;
  resetPasswordForm.hidden = false;
  clearMessage(resetPasswordMessage);
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  document.querySelector('#new-password').focus();
}

async function apiRequest(path, options = {}) {
  try {
    return await sendApiRequest(path, options);
  } catch (error) {
    if (error.status !== 401 || !options.accessToken ||
        path === '/api/auth/session' || path === '/api/auth/refresh') {
      throw error;
    }

    const refreshed = await refreshStoredSession();
    const retryOptions = {
      ...options,
      accessToken: refreshed.accessToken
    };
    if (path === '/api/auth/logout' && options.body) {
      retryOptions.body = { ...options.body, refreshToken: refreshed.refreshToken };
    }
    return sendApiRequest(path, retryOptions);
  }
}

async function refreshStoredSession() {
  if (!sessionRefreshPromise) {
    const session = readSession();
    if (!session?.refreshToken) {
      endSession('Your session expired. Please sign in again.');
      const error = new Error('Your session expired. Please sign in again.');
      error.status = 401;
      throw error;
    }

    sessionRefreshPromise = sendApiRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken }
    })
      .then((result) => {
        saveSession(result.session);
        return result.session;
      })
      .catch((error) => {
        if (error.status === 401 || error.status === 403) {
          endSession(error.status === 403
            ? error.message
            : 'Your session expired. Please sign in again.');
        }
        throw error;
      })
      .finally(() => {
        sessionRefreshPromise = null;
      });
  }

  return sessionRefreshPromise;
}

async function sendApiRequest(path, { method = 'GET', body, accessToken } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running, then try again.');
    if (isLocalPreview) {
      throw new Error(`Cannot reach the backend at ${apiBaseUrl}. Start it from the Backend folder with "npm start", then open http://localhost:3000.`);
    }
    throw new Error('Cannot reach the server. Please try again later.');
  }

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();
  let result = null;

  if (contentType.includes('application/json') && responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
    }
  }

  if (!response.ok) {
    const error = new Error(result?.message || `Request failed (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  if (!result) {
    throw new Error(`The server returned an unexpected response (HTTP ${response.status}).`);
  }

  return result;
}

function showSignedIn(user) {
  authGrid.hidden = true;
  appPanel.hidden = false;
  document.querySelector('.page-shell').classList.add('signed-in');
  currentUser = user;
  document.querySelector('#session-title').textContent = user.fullName || user.email || 'member';
  document.querySelector('#session-email').textContent = user.email || '';
  document.querySelector('#settings-name').textContent = user.fullName || 'Account';
  document.querySelector('#settings-email').textContent = user.email || '';
  document.querySelector('#settings-role').textContent = user.role || 'User';
  const isAdministrator = user.role === 'Admin';
  document.querySelector('#users-nav-button').hidden = !isAdministrator;
  document.querySelector('#open-users-button').hidden = !isAdministrator;
  const isAdministrator = ['Admin', 'Superadmin'].includes(user.role);
  document.querySelector('#users-nav-button').hidden = !isAdministrator;
  document.querySelector('#open-users-button').hidden = !isAdministrator;
  document.querySelector('#sidebar-name').textContent = user.fullName || user.email || 'member';
  document.querySelector('#sidebar-role').textContent = user.role || 'User';
  document.querySelector('#demo-banner').hidden = !user.isDemo;
  const isAdministrator = ['Admin', 'Superadmin'].includes(user.role);
  document.querySelector('#users-nav-button').hidden = !isAdministrator;
  document.querySelectorAll('.module-nav').forEach((button) => {
    button.hidden = !hasModuleRight(user, button.dataset.appView, 'view');
  });
  renderModuleTiles(user);
  setAppView('dashboard');
  clearMessage(sessionMessage);
}

function showAuthForms() {
  appPanel.hidden = true;
  authGrid.hidden = false;
  document.querySelector('.page-shell').classList.remove('signed-in');
  currentUser = null;
  users = [];
  document.querySelector('#demo-banner').hidden = true;
  closeUserEditor();
}

function endSession(message) {
  clearSession();
  showAuthForms();
  showMessage(loginMessage, 'error', message);
}

function setAppView(viewName) {
async function setAppView(viewName) {
  if (isDemoSession()) {
    if (!canOpenDemoModule(viewName)) {
      showMessage(sessionMessage, 'error', 'You do not have permission to open this module in demo mode.');
      return;
    }
    showAppView(viewName);
    if (viewName === 'users') {
      await loadUsers();
    }
    return;
  }

  const session = readSession();
  if (!session?.accessToken) {
    endSession('Your session expired. Please sign in again.');
    return;
  }
  try {
    await apiRequest(`/api/modules/${encodeURIComponent(viewName)}`, {
      accessToken: session.accessToken
    });
  } catch (error) {
    showMessage(sessionMessage, 'error', error.message);
    return;
  }

  showAppView(viewName);

  if (viewName === 'users') {
    loadUsers();
  }
}

function showAppView(viewName) {
  document.querySelectorAll('.app-view').forEach((view) => {
    view.hidden = view.id !== `${viewName}-view`;
  });
  document.querySelectorAll('.app-nav [data-app-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.appView === viewName);
  });
  clearMessage(sessionMessage);

  if (viewName === 'users') {
    loadUsers();
  }
}

function canOpenDemoModule(viewName) {
  return viewName === 'dashboard' ||
    viewName === 'settings' ||
    (moduleDefinitions.some((module) => module.id === viewName) && hasModuleRight(currentUser, viewName, 'view')) ||
    (viewName === 'users' && ['Admin', 'Superadmin'].includes(currentUser.role));
}

function renderModuleTiles(user) {
  const modules = [
    { id: 'dashboard', title: 'Dashboard', description: 'Community overview and your workspace.' },
    ...moduleDefinitions.filter((module) => hasModuleRight(user, module.id, 'view')),
    ...(['Admin', 'Superadmin'].includes(user.role)
      ? [{ id: 'users', title: 'User Management', description: 'Manage community accounts.' }]
      : []),
    { id: 'settings', title: 'Settings', description: 'View your account details.' }
  ];
  const container = document.querySelector('#module-tiles');
  container.replaceChildren();

  modules.forEach((module) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'module-tile';
    tile.dataset.appView = module.id;
    const title = document.createElement('strong');
    title.textContent = module.title;
    const description = document.createElement('span');
    description.textContent = module.description;
    tile.append(title, description);
    container.append(tile);
  });
}

async function loadUsers() {
  clearMessage(usersMessage);
  document.querySelector('#user-count').textContent = 'Loading...';
  try {
    if (isDemoSession()) {
      users = readDemoUsers();
      renderUsers();
      return;
    }
    const result = await apiRequest('/api/admin/users', {
      accessToken: readSession()?.accessToken
    });
    users = result.users;
    renderUsers();
  } catch (error) {
    document.querySelector('#user-count').textContent = '';
    showMessage(usersMessage, 'error', error.message);
  }
}

function renderUsers() {
  const query = document.querySelector('#user-search').value.trim().toLowerCase();
  const filteredUsers = users.filter((user) =>
    [user.fullName, user.email, user.role, user.status]
      .some((value) => String(value || '').toLowerCase().includes(query))
  );
  const tableBody = document.querySelector('#users-table-body');
  tableBody.replaceChildren();

  filteredUsers.forEach((user) => {
    const row = document.createElement('tr');
    appendTextCell(row, user.fullName || '—');
    appendTextCell(row, user.email || '—');
    appendTextCell(row, user.role || 'User');

    const statusCell = document.createElement('td');
    const status = document.createElement('span');
    status.className = `user-status${user.status === 'blocked' ? ' blocked' : ''}`;
    status.className = `user-status ${user.status || 'pending'}`;
    status.textContent = user.status || 'pending';
    statusCell.append(status);
    row.append(statusCell);

    const actions = document.createElement('td');
    const actionGroup = document.createElement('div');
    actionGroup.className = 'row-actions';
    actionGroup.append(
      createUserAction('Edit', 'edit', user),
      createUserAction(user.status === 'blocked' ? 'Unblock' : 'Block', 'block', user, user.id === currentUser?.id)
    if (user.status === 'pending' && currentUser?.role === 'Superadmin') {
      actionGroup.append(createUserAction('Approve', 'approve', user));
    }
    actionGroup.append(
      createUserAction('Edit', 'edit', user),
      createUserAction(user.status === 'blocked' ? 'Unblock' : 'Block', 'block', user, user.id === currentUser?.id)
      ...(canManageUser(user) ? [createUserAction('Edit', 'edit', user)] : []),
      ...(canAssignRights(user) ? [createUserAction('Rights', 'rights', user)] : []),
      ...(canBlockUser(user)
        ? [createUserAction(user.status === 'blocked' ? 'Unblock' : 'Block', 'block', user, user.id === currentUser?.id)]
        : [])
    );
    actions.append(actionGroup);
    row.append(actions);
    tableBody.append(row);
  });

  document.querySelector('#user-count').textContent =
    `${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'}`;
  document.querySelector('#empty-users').hidden = filteredUsers.length !== 0;
}

function canManageUser(user) {
  if (user.role === 'Superadmin') {
    return false;
  }
  return currentUser?.role === 'Superadmin' || (currentUser?.role === 'Admin' && user.role === 'User');
}

function canBlockUser(user) {
  return user.role === 'Superadmin'
    ? currentUser?.role === 'Superadmin' && user.id !== currentUser?.id
    : currentUser?.role === 'Superadmin' || (currentUser?.role === 'Admin' && user.role === 'User');
}

function canAssignRights(user) {
  if (user.role === 'Superadmin' || user.id === currentUser?.id) {
    return false;
  }
  return currentUser?.role === 'Superadmin' || (currentUser?.role === 'Admin' && user.role === 'User');
}

function createEmptyPermissions() {
  return Object.fromEntries(moduleDefinitions.map(({ id }) => [
    id,
    Object.fromEntries(permissionActions.map((action) => [action, false]))
  ]));
}

function createAllPermissions() {
  return Object.fromEntries(moduleDefinitions.map(({ id }) => [
    id,
    Object.fromEntries(permissionActions.map((action) => [action, true]))
  ]));
}

function createModulePermissions(enabled = {}) {
  const permissions = createEmptyPermissions();
  Object.entries(enabled).forEach(([moduleId, actions]) => {
    if (permissions[moduleId]) {
      actions.forEach((action) => {
        if (permissionActions.includes(action)) {
          permissions[moduleId][action] = true;
        }
      });
    }
  });
  return permissions;
}

function normalizePermissions(value) {
  if (Array.isArray(value)) {
    return createModulePermissions(Object.fromEntries(value.map((moduleId) => [moduleId, ['view']])));
  }
  const normalized = createEmptyPermissions();
  if (!value || typeof value !== 'object') {
    return normalized;
  }
  moduleDefinitions.forEach(({ id }) => {
    permissionActions.forEach((action) => {
      normalized[id][action] = value[id]?.[action] === true;
    });
  });
  return normalized;
}

function hasModuleRight(user, moduleId, action) {
  if (user?.role === 'Superadmin') {
    return true;
  }
  return normalizePermissions(user?.permissions)[moduleId]?.[action] === true;
}

function buildRightsMatrix() {
  const body = document.querySelector('#rights-table-body');
  body.replaceChildren();
  moduleDefinitions.forEach(({ id, title }) => {
    const row = document.createElement('tr');
    const moduleCell = document.createElement('th');
    moduleCell.scope = 'row';
    const label = document.createElement('label');
    label.className = 'rights-module-label';
    const moduleToggle = document.createElement('input');
    moduleToggle.type = 'checkbox';
    moduleToggle.dataset.moduleToggle = id;
    moduleToggle.setAttribute('aria-label', `${title} module access`);
    label.append(moduleToggle, document.createTextNode(title));
    moduleCell.append(label);
    row.append(moduleCell);
    permissionActions.forEach((action) => {
      const cell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.module = id;
      checkbox.dataset.moduleAction = action;
      checkbox.setAttribute('aria-label', `${title}: ${action}`);
      cell.append(checkbox);
      row.append(cell);
    });
    body.append(row);
  });
}

function setAllRights(checked) {
  document.querySelectorAll('#rights-table-body input').forEach((input) => {
    input.checked = checked;
    input.indeterminate = false;
  });
}

function readRightsMatrix() {
  const permissions = createEmptyPermissions();
  moduleDefinitions.forEach(({ id }) => {
    permissionActions.forEach((action) => {
      permissions[id][action] = document.querySelector(
        `#rights-table-body [data-module="${id}"][data-module-action="${action}"]`
      ).checked;
    });
  });
  return permissions;
}

function openRightsDialog(user) {
  clearMessage(rightsMessage);
  rightsForm.dataset.userId = user.id;
  document.querySelector('#rights-user-label').textContent =
    `${user.fullName || user.email} · ${user.role}`;
  const permissions = normalizePermissions(user.permissions);
  moduleDefinitions.forEach(({ id }) => {
    permissionActions.forEach((action) => {
      document.querySelector(
        `#rights-table-body [data-module="${id}"][data-module-action="${action}"]`
      ).checked = permissions[id][action];
    });
    const moduleToggle = document.querySelector(`[data-module-toggle="${id}"]`);
    const actions = permissionActions.map((action) => permissions[id][action]);
    moduleToggle.checked = actions.every(Boolean);
    moduleToggle.indeterminate = actions.some(Boolean) && actions.some((enabled) => !enabled);
  });
  rightsDialog.showModal();
}

function updateDemoRights(user, permissions) {
  const before = normalizePermissions(user.permissions);
  const stored = localStorage.getItem(demoAuditKey);
  const auditLog = stored ? JSON.parse(stored) : [];
  if (!Array.isArray(auditLog)) {
    throw new Error('Demo audit data has an invalid format. Reset demo data and try again.');
  }
  updateDemoUser(user.id, { permissions });
  auditLog.push({
    actor: currentUser.email,
    target: user.email,
    event: 'module_rights_changed',
    before,
    after: permissions,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(demoAuditKey, JSON.stringify(auditLog));
}

function isDemoSession() {
  return currentUser?.isDemo === true && sessionStorage.getItem(demoRoleKey) === currentUser.role;
}

function getDemoSessionUser(role) {
  const template = demoUserTemplates.find((user) => user.role === role);
  if (!template) {
    return null;
  }
  const current = readDemoUsers().find((user) => user.id === template.id);
  return { ...current, isDemo: true };
}

function readDemoUsers() {
  const stored = localStorage.getItem(demoUsersKey);
  if (!stored) {
    return resetDemoUsers();
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.some((user) =>
      !user || typeof user.id !== 'string' || typeof user.email !== 'string' ||
      !['Superadmin', 'Admin', 'User'].includes(user.role) ||
      !['active', 'pending', 'blocked'].includes(user.status) ||
      !user.permissions || typeof user.permissions !== 'object'
    )) {
      throw new Error('Demo data has an invalid format.');
    }
    parsed.forEach((user) => {
      user.permissions = normalizePermissions(user.permissions);
    });
    return parsed;
  } catch (error) {
    localStorage.removeItem(demoUsersKey);
    throw new Error(`Could not load demo data: ${error.message}`);
  }
}

function resetDemoUsers() {
  const usersCopy = demoUserTemplates.map((user) => ({
    ...user,
    permissions: normalizePermissions(user.permissions)
  }));
  localStorage.removeItem(demoAuditKey);
  localStorage.setItem(demoUsersKey, JSON.stringify(usersCopy));
  return usersCopy;
}

function updateDemoUser(userId, changes) {
  const demoUsers = readDemoUsers();
  const index = demoUsers.findIndex((user) => user.id === userId);
  if (index < 0) {
    throw new Error('That demo account no longer exists. Reset demo data and try again.');
  }
  demoUsers[index] = { ...demoUsers[index], ...changes };
  localStorage.setItem(demoUsersKey, JSON.stringify(demoUsers));
}

function saveDemoUser(userId, body) {
  const demoUsers = readDemoUsers();
  if (userId) {
    const existing = demoUsers.find((user) => user.id === userId);
    if (!existing) {
      throw new Error('That demo account no longer exists. Reset demo data and try again.');
    }
    if (existing.role === 'Superadmin') {
      throw new Error('Superadmin demo accounts cannot be changed.');
    }
    if (currentUser.role === 'Admin' && existing.role !== 'User') {
      throw new Error('Admins can only change User demo accounts.');
    }
    const updatedUser = {
      ...existing,
      fullName: body.fullName,
      email: body.email
    };
    if (currentUser.role === 'Superadmin' && body.role !== undefined) {
      updatedUser.role = body.role;
    }
    const index = demoUsers.findIndex((user) => user.id === userId);
    demoUsers[index] = updatedUser;
    localStorage.setItem(demoUsersKey, JSON.stringify(demoUsers));
    return { success: true, user: updatedUser };
  }

  const role = currentUser.role === 'Superadmin' ? body.role || 'User' : 'User';
  const newUser = {
    id: `demo-user-${crypto.randomUUID()}`,
    fullName: body.fullName,
    email: body.email,
    role,
    permissions: createEmptyPermissions(),
    status: 'active'
  };
  demoUsers.push(newUser);
  localStorage.setItem(demoUsersKey, JSON.stringify(demoUsers));
  return { success: true, user: newUser };
}

function appendTextCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  row.append(cell);
}

function createUserAction(label, action, user, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'row-action';
  button.dataset.userAction = action;
  button.dataset.userId = user.id;
  button.textContent = label;
  button.disabled = disabled;
  if (disabled) {
    button.title = 'You cannot block your own administrator account.';
  }
  return button;
}

function openUserEditor(user = null) {
  userForm.reset();
  clearMessage(userFormMessage);
  userForm.dataset.userId = user?.id || '';
  const isEditing = Boolean(user);
  document.querySelector('#user-form-title').textContent = isEditing ? 'Edit User' : 'Add User';
  document.querySelector('#user-form-label').textContent = isEditing ? 'UPDATE ACCOUNT' : 'NEW ACCOUNT';
  document.querySelector('#user-full-name').value = user?.fullName || '';
  document.querySelector('#user-email').value = user?.email || '';
  document.querySelector('#user-role').value = user?.role || 'User';
  document.querySelector('#user-password-field').hidden = isEditing;
  document.querySelector('#user-password').required = !isEditing;
  document.querySelector('#user-form-note').textContent = isEditing
    ? 'Changing someone’s role can grant or remove administrator access.'
    : 'Share the temporary password securely. Admin access should only be given to trusted staff.';
  document.querySelector('#user-role').value = user?.role === 'Admin' ? 'Admin' : 'User';
  document.querySelector('#user-role').disabled = user?.id === currentUser?.id;
  document.querySelector('#user-role-field').hidden = currentUser?.role !== 'Superadmin';
  const canChangeRole = currentUser?.role === 'Superadmin' && user?.id !== currentUser?.id;
  document.querySelector('#user-role-field').hidden = !canChangeRole;
  document.querySelector('#user-password-field').hidden = isEditing;
  document.querySelector('#user-password').required = !isEditing;
  document.querySelector('#user-form-note').textContent = isEditing
    ? user?.id === currentUser?.id
      ? 'Superadmin access is protected and cannot be changed here.'
      : 'Only a Superadmin can designate or remove administrator access.'
      ? 'Your own administrator role cannot be changed here.'
      : currentUser?.role === 'Admin'
        ? 'Admins can edit User accounts. Use Rights to manage their module access.'
        : 'Superadmins can manage User and Admin accounts.'
    : 'This account is active immediately. Share its temporary password securely.';
  setButtonBusy(saveUserButton, false, isEditing ? 'Save Changes' : 'Add User');
  userForm.hidden = false;
  document.querySelector('#user-full-name').focus();
  userForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeUserEditor() {
  if (!userForm) {
    return;
  }
  userForm.hidden = true;
  userForm.reset();
  userForm.dataset.userId = '';
  clearMessage(userFormMessage);
}

function showResetPanel() {
  resetCard.hidden = false;
  authGrid.classList.add('reset-mode');
}

function showLoginPanel() {
  authGrid.classList.remove('reset-mode');
  resetCard.hidden = true;
  resetRequestForm.hidden = false;
  resetPasswordForm.hidden = true;
  clearMessage(resetRequestMessage);
  clearMessage(resetPasswordMessage);
}

function saveSession(session) {
  sessionStorage.removeItem(demoRoleKey);
  sessionStorage.setItem(storageKey, JSON.stringify(session));
}

function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    return session && typeof session.accessToken === 'string' ? session : null;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(storageKey);
  sessionStorage.removeItem(demoRoleKey);
}

function resetPasswordToggles(form) {
  form.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.textContent = 'Show';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute(
      'aria-label',
      button.dataset.passwordToggle.includes('confirm') ? 'Show confirmation password' : 'Show password'
    );
  });
}

function setButtonBusy(button, busy, label) {
  button.disabled = busy;
  button.querySelector('span').textContent = label;
}

function showMessage(element, type, message) {
  element.textContent = message;
  element.className = `form-message ${type}`;
  element.hidden = false;
}

function clearMessage(element) {
  element.textContent = '';
  element.className = 'form-message';
  element.hidden = true;
}

handleRecoveryLink();
restoreSession();
