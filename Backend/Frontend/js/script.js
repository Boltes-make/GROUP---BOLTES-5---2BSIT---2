const authGrid = document.querySelector('#auth-grid');
const appPanel = document.querySelector('#app-panel');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const resetCard = document.querySelector('#password-reset');
const resetRequestForm = document.querySelector('#reset-request-form');
const resetPasswordForm = document.querySelector('#reset-password-form');
const userForm = document.querySelector('#user-form');
const loginMessage = document.querySelector('#login-message');
const registerMessage = document.querySelector('#form-message');
const resetRequestMessage = document.querySelector('#reset-request-message');
const resetPasswordMessage = document.querySelector('#reset-password-message');
const sessionMessage = document.querySelector('#session-message');
const usersMessage = document.querySelector('#users-message');
const userFormMessage = document.querySelector('#user-form-message');
const loginButton = document.querySelector('#login-button');
const registerButton = document.querySelector('#submit-button');
const resetRequestButton = document.querySelector('#reset-request-button');
const resetPasswordButton = document.querySelector('#reset-password-button');
const logoutButton = document.querySelector('#logout-button');
const saveUserButton = document.querySelector('#save-user-button');
const storageKey = 'hope-community-session';
const isLocalPreview = window.location.protocol === 'file:' ||
  ['localhost', '127.0.0.1'].includes(window.location.hostname);
const apiBaseUrl = isLocalPreview ? 'http://localhost:3000' : window.location.origin;
let currentUser = null;
let users = [];
let sessionRefreshPromise = null;

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
      showMessage(sessionMessage, 'error', 'Administrator access is required.');
      return;
    }
    setAppView(view);
  });
});

document.querySelector('#add-user-button').addEventListener('click', () => openUserEditor());
document.querySelector('#cancel-user-button').addEventListener('click', closeUserEditor);
document.querySelector('#user-search').addEventListener('input', renderUsers);

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
    await loadUsers();
    showMessage(usersMessage, 'success', `User ${shouldBlock ? 'blocked' : 'unblocked'} successfully.`);
  } catch (error) {
    showMessage(usersMessage, 'error', error.message);
    button.disabled = false;
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
  } finally {
    logoutButton.disabled = false;
    logoutButton.textContent = 'Log out';
  }
});

async function restoreSession() {
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
  setAppView('dashboard');
  clearMessage(sessionMessage);
}

function showAuthForms() {
  appPanel.hidden = true;
  authGrid.hidden = false;
  document.querySelector('.page-shell').classList.remove('signed-in');
  currentUser = null;
  users = [];
  closeUserEditor();
}

function endSession(message) {
  clearSession();
  showAuthForms();
  showMessage(loginMessage, 'error', message);
}

function setAppView(viewName) {
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

async function loadUsers() {
  clearMessage(usersMessage);
  document.querySelector('#user-count').textContent = 'Loading...';
  try {
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
    status.textContent = user.status || 'pending';
    statusCell.append(status);
    row.append(statusCell);

    const actions = document.createElement('td');
    const actionGroup = document.createElement('div');
    actionGroup.className = 'row-actions';
    actionGroup.append(
      createUserAction('Edit', 'edit', user),
      createUserAction(user.status === 'blocked' ? 'Unblock' : 'Block', 'block', user, user.id === currentUser?.id)
    );
    actions.append(actionGroup);
    row.append(actions);
    tableBody.append(row);
  });

  document.querySelector('#user-count').textContent =
    `${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'}`;
  document.querySelector('#empty-users').hidden = filteredUsers.length !== 0;
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
