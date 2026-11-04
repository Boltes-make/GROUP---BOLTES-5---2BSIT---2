const form = document.querySelector('#register-form');
const formMessage = document.querySelector('#form-message');
const submitButton = document.querySelector('#submit-button');
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
      `${shouldShow ? 'Hide' : 'Show'} ${input.id === 'password' ? 'password' : 'confirmation password'}`
    );
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage();

  const formData = new FormData(form);
  const fullName = formData.get('fullName').trim();
  const email = formData.get('email').trim();
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (password !== confirmPassword) {
    showMessage('error', 'Your passwords do not match.');
    document.querySelector('#confirm-password').focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.querySelector('span').textContent = 'Creating account...';

  try {
    const response = await fetch(`${apiBaseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    });
    const contentType = response.headers.get('content-type') || '';
    const responseBody = await response.text();
    let result = null;

    if (contentType.includes('application/json') && responseBody) {
      try {
        result = JSON.parse(responseBody);
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
      }
    }

    if (!response.ok) {
      const message = result?.message ||
        `Registration failed (HTTP ${response.status}). Check the backend terminal for details.`;
      throw new Error(message);
    }

    if (!result) {
      throw new Error(`The server returned an unexpected response (HTTP ${response.status}).`);
    }

    form.reset();
    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
      button.textContent = 'Show';
      button.setAttribute('aria-pressed', 'false');
    });
    showMessage(
      'success',
      result.message || 'Your account request was received. It is now pending approval.'
    );
  } catch (error) {
    showMessage('error', error.message || 'Unable to reach the server. Please try again.');
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = 'Create account';
  }
});

function showMessage(type, message) {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
  formMessage.hidden = false;
}

function hideMessage() {
  formMessage.hidden = true;
  formMessage.textContent = '';
  formMessage.className = 'form-message';
}
