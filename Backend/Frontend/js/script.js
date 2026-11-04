const authGrid = document.querySelector('#auth-grid');
const sessionPanel = document.querySelector('#session-panel');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const resetCard = document.querySelector('#password-reset');
const resetRequestForm = document.querySelector('#reset-request-form');
const resetPasswordForm = document.querySelector('#reset-password-form');
const loginMessage = document.querySelector('#login-message');
const registerMessage = document.querySelector('#form-message');
const resetRequestMessage = document.querySelector('#reset-request-message');
const resetPasswordMessage = document.querySelector('#reset-password-message');
const sessionMessage = document.querySelector('#session-message');
const loginButton = document.querySelector('#login-button');
const registerButton = document.querySelector('#submit-button');
const resetRequestButton = document.querySelector('#reset-request-button');
const resetPasswordButton = document.querySelector('#reset-password-button');
const logoutButton = document.querySelector('#logout-button');
const storageKey = 'hope-community-session';
const isLocalPreview = window.location.protocol === 'file:' ||
  ['localhost', '127.0.0.1'].includes(window.location.hostname);
const apiBaseUrl = isLocalPreview ? 'http://localhost:3000' : window.location.origin;

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
    showMessage(sessionMessage, 'error', error.message);
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
    if (error.status !== 401 || !session.refreshToken) {
      if (error.status === 401 || error.status === 403) {
        clearSession();
      }
      showAuthForms();
      showMessage(loginMessage, 'error', error.message);
      return;
    }

    try {
      const refreshed = await apiRequest('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken: session.refreshToken }
      });
      saveSession(refreshed.session);
      showSignedIn(refreshed.user);
    } catch (refreshError) {
      if (refreshError.status === 401 || refreshError.status === 403) {
        clearSession();
      }
      showAuthForms();
      showMessage(loginMessage, 'error', refreshError.message);
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

async function apiRequest(path, { method = 'GET', body, accessToken } = {}) {
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
  sessionPanel.hidden = false;
  document.querySelector('#session-title').textContent =
    `Welcome, ${user.fullName || user.email || 'member'}`;
  document.querySelector('#session-email').textContent = user.email || '';
  clearMessage(sessionMessage);
}

function showAuthForms() {
  sessionPanel.hidden = true;
  authGrid.hidden = false;
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
