const authGrid = document.querySelector('#auth-grid');
const sessionPanel = document.querySelector('#session-panel');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const loginMessage = document.querySelector('#login-message');
const registerMessage = document.querySelector('#form-message');
const sessionMessage = document.querySelector('#session-message');
const loginButton = document.querySelector('#login-button');
const registerButton = document.querySelector('#submit-button');
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
    showAuthForms();
  } catch (error) {
    showAuthForms();
    showMessage(loginMessage, 'error', error.message);
  } finally {
    clearSession();
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
      clearSession();
      if (error.status !== 401 && error.status !== 403) {
        saveSession(session);
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
  document.querySelector('#session-title').textContent = `Welcome, ${user.fullName || user.email || 'member'}`;
  document.querySelector('#session-email').textContent = user.email || '';
  clearMessage(sessionMessage);
}

function showAuthForms() {
  sessionPanel.hidden = true;
  authGrid.hidden = false;
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

restoreSession();
