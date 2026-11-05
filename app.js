const seedUsers = [
  { id: 1, name: 'Super Admin', email: 'super@boltes.com', password: 'admin123', role: 'superadmin', status: 'active', active: 'Now' },
  { id: 2, name: 'Maya Chen', email: 'maya@boltes.com', password: 'admin123', role: 'superadmin', status: 'active', active: '12 min ago' },
  { id: 3, name: 'Jon Bell', email: 'admin@boltes.com', password: 'admin123', role: 'admin', status: 'active', active: '1 hr ago' },
  { id: 4, name: 'Rina Flores', email: 'rina@boltes.com', password: 'user123', role: 'admin', status: 'active', active: 'Yesterday' },
  { id: 5, name: 'Theo Martin', email: 'user@boltes.com', password: 'user123', role: 'user', status: 'active', active: '8 min ago' },
  { id: 6, name: 'Ava Reed', email: 'ava@boltes.com', password: 'user123', role: 'user', status: 'active', active: '2 hrs ago' },
  { id: 7, name: 'Liam Cole', email: 'liam@boltes.com', password: 'user123', role: 'user', status: 'blocked', active: '3 days ago' },
];

const roleInfo = {
  superadmin: { level: 100, title: 'Full command', copy: 'Complete control across the workspace, including administrators and access roles.', permissions: ['Manage administrators', 'Manage all users', 'Assign every role', 'Block accounts'] },
  admin: { level: 66, title: 'Operations lead', copy: 'Manage users and permissions while workspace governance remains protected.', permissions: ['Manage users', 'Assign user roles', 'Block user accounts'] },
  user: { level: 33, title: 'Workspace member', copy: 'Use assigned workspace tools and view your own access information.', permissions: ['View workspace', 'Update profile', 'View activity history'] }
};

let users = JSON.parse(localStorage.getItem('boltesUsers') || 'null') || seedUsers;
let currentUser = JSON.parse(sessionStorage.getItem('boltesSession') || localStorage.getItem('boltesRemember') || 'null');
let activities = JSON.parse(localStorage.getItem('boltesActivity') || 'null') || [
  { icon: '↗', title: 'Maya Chen signed in', detail: 'Browser session · Chrome', time: '12 min ago' },
  { icon: '♙', title: 'Jon Bell updated a role', detail: 'Rina Flores → Administrator', time: '1 hour ago' },
  { icon: '✓', title: 'Password policy passed', detail: 'Automatic workspace audit', time: '3 hours ago' }
];

function saveUsers() { localStorage.setItem('boltesUsers', JSON.stringify(users)); }
function saveActivity() { localStorage.setItem('boltesActivity', JSON.stringify(activities)); }
function initials(name) { return name.split(' ').map(part => part[0]).join('').slice(0,2).toUpperCase(); }
function showToast(message) { const toast = document.getElementById('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }

function showAuth(view = 'login') {
  document.getElementById('authView').classList.remove('hidden');
  document.getElementById('appView').classList.add('hidden');
  document.querySelectorAll('.auth-form').forEach(form => form.classList.toggle('active', form.dataset.form === view));
  document.getElementById('authStep').textContent = view === 'login' ? '01 / SIGN IN' : view === 'register' ? '02 / REGISTER' : '03 / RECOVERY';
}

function showApp() {
  document.getElementById('authView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  renderDashboard(); renderUsers(); renderActivity();
}

function renderDashboard() {
  if (!currentUser) return;
  const firstName = currentUser.name.split(' ')[0];
  document.getElementById('sideName').textContent = currentUser.name;
  document.getElementById('sideRole').textContent = capitalize(currentUser.role);
  document.getElementById('headName').textContent = currentUser.name;
  document.getElementById('sideAvatar').textContent = initials(currentUser.name);
  document.getElementById('headAvatar').textContent = initials(currentUser.name);
  document.getElementById('welcomeText').textContent = `Good morning, ${currentUser.name}.`;
  document.getElementById('dateLabel').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' }).toUpperCase();
  document.getElementById('totalUsers').textContent = users.length;
  document.getElementById('adminCount').textContent = users.filter(user => user.role !== 'user').length;
  const visibleUsers = canManage(currentUser.role) ? users : users.filter(user => user.id === currentUser.id);
  document.getElementById('recentUsers').innerHTML = visibleUsers.slice(0, 4).map(userCard).join('');
  const info = roleInfo[currentUser.role];
  document.getElementById('roleCard').innerHTML = `<div class="role-summary"><div class="level"><span style="width:${info.level}%"></span></div><p class="eyebrow">${capitalize(currentUser.role)}</p><h4>${info.title}</h4><p>${info.copy}</p>${info.permissions.map(item => `<div class="permission">${item}</div>`).join('')}</div>`;
}

function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function canManage(role) { return role === 'superadmin' || role === 'admin'; }
function userCard(user) { return `<div class="directory-user"><span class="avatar">${initials(user.name)}</span><div><strong>${user.name}</strong><span>${user.email}</span></div><span class="role-tag">${user.role}</span></div>`; }

function renderUsers() {
  if (!currentUser) return;
  const query = document.getElementById('userSearch').value.toLowerCase();
  let list = users.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(query));
  if (currentUser.role === 'admin') list = list.filter(user => user.role !== 'superadmin');
  if (currentUser.role === 'user') list = list.filter(user => user.id === currentUser.id);
  document.getElementById('inviteButton').classList.toggle('hidden', currentUser.role === 'user');
  document.getElementById('userTable').innerHTML = list.map(user => `<tr><td><div class="table-person"><span class="avatar">${initials(user.name)}</span><div><strong>${user.name}</strong><br><span style="color:var(--muted)">${user.email}</span></div></div></td><td><span class="role-tag">${user.role}</span></td><td><span class="status ${user.status === 'blocked' ? 'blocked' : ''}">${capitalize(user.status)}</span></td><td>${user.active}</td><td>${canEdit(user) ? `<button class="action-button" onclick="openUserModal(${user.id})">Manage ···</button>` : '—'}</td></tr>`).join('') || '<tr><td colspan="5">No people found.</td></tr>';
}

function canEdit(target) {
  if (currentUser.role === 'superadmin') return target.id !== currentUser.id;
  if (currentUser.role === 'admin') return target.role === 'user';
  return false;
}

function renderActivity() {
  document.getElementById('activityList').innerHTML = activities.map(item => `<div class="activity-item"><div class="activity-icon">${item.icon}</div><div><strong>${item.title}</strong><span>${item.detail}</span></div><time>${item.time}</time></div>`).join('');
}

function switchSection(section) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.dataset.screen === section));
  document.querySelectorAll('.nav-item[data-section]').forEach(item => item.classList.toggle('active', item.dataset.section === section));
  document.getElementById('pageTitle').textContent = capitalize(section);
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showAuth(button.dataset.view)));
document.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => switchSection(button.dataset.section)));
document.querySelectorAll('[data-action="theme"]').forEach(button => button.addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('boltesTheme', document.body.classList.contains('dark') ? 'dark' : 'light'); }));
document.querySelectorAll('[data-action="reveal"]').forEach(button => button.addEventListener('click', () => { const input = button.parentElement.querySelector('input'); input.type = input.type === 'password' ? 'text' : 'password'; button.textContent = input.type === 'password' ? 'SHOW' : 'HIDE'; }));
document.querySelector('[data-action="logout"]').addEventListener('click', () => { currentUser = null; sessionStorage.removeItem('boltesSession'); localStorage.removeItem('boltesRemember'); showAuth(); });
document.querySelector('[data-action="close-modal"]').addEventListener('click', () => document.getElementById('modal').classList.add('hidden'));
document.getElementById('userSearch').addEventListener('input', renderUsers);

document.getElementById('loginForm').addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.currentTarget); const email = data.get('email').trim().toLower(); const password = data.get('password'); const user = users.find(item => item.email.toLower() === email && item.password === password);
  if (!user) return showToast('Email or password is incorrect.');
  if (user.status === 'blocked') return showToast('This account has been blocked.');
  currentUser = user; sessionStorage.setItem('boltesSession', JSON.stringify(user));
  if (data.get('remember')) localStorage.setItem('boltesRemember', JSON.stringify(user)); else localStorage.removeItem('boltesRemember');
  activities.unshift({ icon:'↗', title:`${user.name} signed in`, detail:'Browser session · BOLTES Portal', time:'Just now' }); saveActivity(); showApp(); showToast(`Welcome, ${user.name}.`);
});

document.getElementById('registerForm').addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.currentTarget); const email = data.get('email').trim().toLower();
  if (users.some(user => user.email.toLower() === email)) return showToast('An account already uses this email.');
  const user = { id: Date.now(), name:data.get('name').trim(), email, password:data.get('password'), role:'user', status:'active', active:'Just now' }; users.push(user); saveUsers(); currentUser = user; sessionStorage.setItem('boltesSession', JSON.stringify(user)); showApp(); showToast('Account created successfully.');
});

document.getElementById('resetForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const email=data.get('email').trim().toLower(); const user=users.find(item=>item.email.toLower()===email); if(!user) return showToast('No account uses this email in the demo.'); user.password=data.get('password'); saveUsers(); showAuth('login'); showToast('Password updated successfully.'); });
document.querySelector('[data-action="register"]').addEventListener('click', () => { currentUser ? showToast('Use People to manage workspace access.') : showAuth('register'); });

function openUserModal(id) {
  const user = users.find(item => item.id === id); if (!user) return;
  const canAssignSuper = currentUser.role === 'superadmin';
  document.getElementById('modalTitle').textContent = `Manage ${user.name}`;
  document.getElementById('modalBody').innerHTML = `<label>Access role<select id="roleSelect"><option value="user" ${user.role==='user'?'selected':''}>User</option><option value="admin" ${user.role==='admin'?'selected':''}>Admin</option>${canAssignSuper ? `<option value="superadmin" ${user.role==='superadmin'?'selected':''}>Superadmin</option>`:''}</select></label><div class="form-row"><span style="font-size:12px">${user.status === 'blocked' ? 'Account is blocked' : 'Account is active'}</span></div><button id="saveRole" class="primary-button">Save changes <span>→</span></button><button id="toggleBlock" class="secondary-button" style="width:100%;height:42px;margin-top:10px">${user.status === 'blocked' ? 'Unblock account' : 'Block account'}</button>`;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('saveRole').onclick = () => { const oldRole=user.role; user.role=document.getElementById('roleSelect').value; saveUsers(); activities.unshift({icon:'♙',title:`${currentUser.name} changed a role`,detail:`${user.name}: ${oldRole} → ${user.role}`,time:'Just now'}); saveActivity(); document.getElementById('modal').classList.add('hidden'); renderDashboard(); renderUsers(); renderActivity(); showToast('Access role updated.'); };
  document.getElementById('toggleBlock').onclick = () => { user.status = user.status === 'blocked' ? 'active' : 'blocked'; saveUsers(); activities.unshift({icon:'!',title:`${user.name} was ${user.status === 'blocked' ? 'blocked' : 'unblocked'}`,detail:`Action by ${currentUser.name}`,time:'Just now'}); saveActivity(); document.getElementById('modal').classList.add('hidden'); renderDashboard(); renderUsers(); renderActivity(); showToast(`Account ${user.status}.`); };
}

if (localStorage.getItem('boltesTheme') === 'dark') document.body.classList.add('dark');
if (currentUser) showApp(); else showAuth();
const app = document.getElementById("app");
const icons = {
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 5 6v5c0 4.8 3 8.1 7 10 4-1.9 7-5.2 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.8-4"/></svg>',
  dashboard: '<svg width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  users: '<svg width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="3"/><path d="M16 15a6 6 0 0 1 6 6"/></svg>',
  settings: '<svg width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6a7 7 0 0 0-1.6.9L6.3 6 4.3 9.4l2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.6 1l.4 2.6h4l.3-2.6a7 7 0 0 0 1.5-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.6.1-.9Z"/></svg>'
};

const defaultUsers = [
  { id: 1, name: "Alex Morgan", email: "alex@accesshub.com", role: "superadmin", status: "active" },
  { id: 2, name: "Sarah Chen", email: "sarah@accesshub.com", role: "admin", status: "active" },
  { id: 3, name: "James Wilson", email: "james@accesshub.com", role: "user", status: "active" },
  { id: 4, name: "Emily Davis", email: "emily@accesshub.com", role: "user", status: "blocked" },
  { id: 5, name: "Michael Brown", email: "michael@accesshub.com", role: "admin", status: "active" }
];

let users = JSON.parse(localStorage.getItem("accesshub-users")) || defaultUsers;
let currentUser = JSON.parse(sessionStorage.getItem("accesshub-currentUser"));
let currentPage = "dashboard";

function saveUsers() { localStorage.setItem("accesshub-users", JSON.stringify(users)); }

function brand() {
  return `<button class="brand" data-route="home" aria-label="AccessHub home"><span class="brand-mark">${icons.shield}</span><span>AccessHub</span></button>`;
}

function render() {
  bindRoute(document.body.dataset.route || location.hash.slice(1) || "home");
}

function bindRoute(route) {
  if (["login", "register", "reset"].includes(route)) return renderAuth(route);
  if (route === "dashboard" && currentUser) return renderDashboard();
  if (route === "dashboard") return navigate("login");
  renderLanding();
}

function navigate(route) {
  location.hash = route;
  document.body.dataset.route = route;
  bindRoute(route);
  window.scrollTo(0, 0);
}

function renderLanding() {
  app.innerHTML = `
    <nav class="landing-nav">${brand()}<div class="nav-actions">
      <button class="btn btn-secondary" data-route="login">Sign in</button>
      <button class="btn btn-primary" data-route="register">Get started</button>
    </div></nav>
    <main class="hero">
      <section>
        <div class="eyebrow">Secure access management</div>
        <h1>One workspace.<br><span>Every permission.</span></h1>
        <p class="hero-copy">Manage users, assign roles, and protect your organization with one secure, intuitive access portal.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-route="register">Create account</button>
          <button class="btn btn-secondary" data-route="login">Explore dashboard</button>
        </div>
      </section>
      <section class="hero-art" aria-label="Dashboard preview">
        <div class="hero-panel"><div class="panel-top"><i class="panel-dot"></i><i class="panel-dot"></i><i class="panel-dot"></i></div><div class="panel-body">
          <div class="panel-sidebar"><div class="panel-menu active"></div><div class="panel-menu"></div><div class="panel-menu"></div></div>
          <div class="panel-main"><div class="panel-title"></div><div class="stat-row"><div class="stat-card"></div><div class="stat-card"></div><div class="stat-card"></div></div><div class="chart-card"><div class="chart-bars"><i></i><i></i><i></i><i></i><i></i></div></div></div>
        </div></div>
        <div class="float-card users"><span class="float-icon">${icons.users}</span><span><strong>248 users</strong><small>24 this month</small></span></div>
        <div class="float-card security"><span class="float-icon">✓</span><span><strong>Protected</strong><small>All systems secure</small></span></div>
      </section>
    </main>`;
}

function passwordField(id, placeholder) {
  return `<div class="password-wrap"><input class="form-control" id="${id}" type="password" placeholder="${placeholder}" required><button class="password-toggle" type="button" aria-label="Show password">◉</button></div>`;
}

function renderAuth(page) {
  const config = {
    login: ["Welcome back", "Sign in", "Sign in to continue to your workspace.", "Forgot password?", "New to AccessHub?", "Create an account", "login"],
    register: ["Create an account", "Get started", "Set up your account and join your team.", "", "Already have an account?", "Sign in", "register"],
    reset: ["Reset password", "Reset your password", "Enter your email to create a new password.", "", "Remembered your password?", "Back to sign in", "reset"]
  };
  const [heading, buttonText, copy, forgot, switchCopy, switchLabel, mode] = config[page];
  app.innerHTML = `
    <main class="auth-page"><aside class="auth-aside">${brand()}<div class="auth-message"><h1>${mode === "login" ? "Secure access,<br>made simple." : mode === "register" ? "Your team starts<br>here." : "Get back to<br>your workspace."}</h1><p>Control who can access your organization with clear roles and confident security.</p></div><footer>© 2026 AccessHub. All rights reserved.</footer></aside>
    <section class="auth-main"><form class="auth-card" id="${mode}-form">
      <h1>${heading}</h1><p>${copy}</p>
      ${mode === "register" ? `<div class="form-group"><label for="name">Full name</label><input class="form-control" id="name" type="text" placeholder="Your full name" required></div>` : ""}
      <div class="form-group"><label for="email">Email address</label><input class="form-control" id="email" type="email" placeholder="you@example.com" required></div>
      ${mode !== "reset" ? `<div class="form-group"><label for="password">${mode === "register" ? "Create password" : "Password"}</label>${passwordField("password", "Enter your password")}</div>` : ""}
      ${mode === "reset" ? `<div class="form-group"><label for="password">New password</label>${passwordField("password", "Enter a new password")}</div>` : ""}
      ${mode === "reset" ? `<div class="form-group"><label for="confirm-password">Confirm new password</label>${passwordField("confirm-password", "Re-enter your new password")}</div>` : ""}
      ${mode === "register" ? `<div class="form-group"><label for="confirm-password">Confirm password</label>${passwordField("confirm-password", "Re-enter your password")}</div>` : ""}
      ${mode === "login" ? `<div class="form-row"><label class="check"><input type="checkbox"> Remember me</label><button class="link" type="button" data-route="reset">${forgot}</button></div>` : ""}
      <p class="form-error" aria-live="polite"></p>
      <button class="btn btn-primary auth-submit">${buttonText}</button>
      <p class="auth-switch">${switchCopy} <button class="link" type="button" data-route="${mode === "login" ? "register" : "login"}">${switchLabel}</button></p>
    </form></section></main>`;
}

function renderDashboard() {
  const role = currentUser.role;
  const canManage = role === "superadmin" || role === "admin";
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar" id="sidebar">${brand()}<p class="nav-label">Workspace</p>
      <button class="side-link active" data-dashboard-page="dashboard"><span class="side-icon">${icons.dashboard}</span>Overview</button>
      ${canManage ? `<button class="side-link" data-dashboard-page="users"><span class="side-icon">${icons.users}</span>User management</button>` : ""}
      <button class="side-link" data-dashboard-page="settings"><span class="side-icon">${icons.settings}</span>Settings</button>
      <div class="sidebar-footer"><div class="profile-mini"><div class="avatar">${initials(currentUser.name)}</div><div><strong>${escapeHtml(currentUser.name)}</strong><small>${role}</small></div></div><button class="side-link" id="logout"><span class="side-icon">↪</span>Sign out</button></div>
    </aside>
    <main class="main-area"><header class="topbar"><div><button class="icon-button mobile-menu" id="menu-btn">☰</button><h1 id="top-title">Overview</h1></div><div class="top-actions"><button class="icon-button" title="Notifications">♢</button><div class="avatar">${initials(currentUser.name)}</div></div></header><section class="dashboard" id="dashboard-content"></section></main>
  </div>`;
  renderDashboardContent();
}

function renderDashboardContent() {
  const title = { dashboard: "Overview", users: "User management", settings: "Settings" }[currentPage];
  document.getElementById("top-title").textContent = title;
  document.querySelectorAll("[data-dashboard-page]").forEach(el => el.classList.toggle("active", el.dataset.dashboardPage === currentPage));
  const content = document.getElementById("dashboard-content");
  if (currentPage === "users") return renderUsers(content);
  if (currentPage === "settings") return renderSettings(content);
  renderOverview(content);
}

function renderOverview(content) {
  const isAdmin = currentUser.role !== "user";
  content.innerHTML = `<div class="welcome-row"><div><h2>Welcome back, ${escapeHtml(currentUser.name.split(" ")[0])}</h2><p>Here is what is happening with your workspace today.</p></div><button class="btn btn-primary" data-dashboard-page="users" ${isAdmin ? "" : "style=\"display:none\""}>Manage users</button></div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-box-top"><span>Total users</span><b>•••</b></div><strong>${users.length}<span class="stat-change">+12%</span></strong></div>
      <div class="stat-box"><div class="stat-box-top"><span>Administrators</span><b>•••</b></div><strong>${users.filter(u => u.role !== "user").length}<span class="stat-change">+2</span></strong></div>
      <div class="stat-box"><div class="stat-box-top"><span>Active sessions</span><b>•••</b></div><strong>186<span class="stat-change">+8%</span></strong></div>
      <div class="stat-box"><div class="stat-box-top"><span>Blocked accounts</span><b>•••</b></div><strong>${users.filter(u => u.status === "blocked").length}<span class="stat-change">this month</span></strong></div>
    </div>
    <div class="content-grid"><section class="panel"><div class="panel-head"><h3>Recent users</h3><button class="link" data-dashboard-page="users">View all</button></div><div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th></tr></thead><tbody>${users.slice(0, 4).map(u => `<tr><td><strong>${escapeHtml(u.name)}</strong><br><small>${escapeHtml(u.email)}</small></td><td><span class="badge ${u.role}">${u.role}</span></td><td><span class="badge ${u.status}">${u.status}</span></td></tr>`).join("")}</tbody></table></div></section>
    <section class="panel"><div class="panel-head"><h3>Recent activity</h3></div><div class="activity-list">${["User account created","Password updated","Role permissions changed","New login detected"].map((a,i) => `<div class="activity-item"><span class="activity-dot"></span><div><p>${a}</p><small>${i + 1} hour${i ? "s" : ""} ago</small></div></div>`).join("")}</div></section></div>`;
}

function renderUsers(content) {
  const superadmin = currentUser.role === "superadmin";
  content.innerHTML = `<div class="welcome-row"><div><h2>User management</h2><p>Manage accounts, roles, and access permissions.</p></div></div>
    <div class="toolbar"><div class="search"><input class="form-control" id="user-search" placeholder="Search users"></div><button class="btn btn-primary" id="add-user">+ Add user</button></div>
    <section class="panel user-table-panel"><div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody id="user-table"></tbody></table></div></section>`;
  drawUserTable();
}

function drawUserTable(filter = "") {
  const tbody = document.getElementById("user-table");
  if (!tbody) return;
  const superadmin = currentUser.role === "superadmin";
  const visible = users.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(filter.toLowerCase()));
  tbody.innerHTML = visible.map(u => {
    const locked = u.id === currentUser.id || (currentUser.role === "admin" && u.role !== "user");
    const roleOptions = superadmin ? ["superadmin","admin","user"] : ["user"];
    return `<tr><td><strong>${escapeHtml(u.name)}</strong><br><small>${escapeHtml(u.email)}</small></td>
      <td><select class="role-select" data-user-role="${u.id}" ${locked ? "disabled" : ""}>${roleOptions.map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></td>
      <td><span class="badge ${u.status}">${u.status}</span></td>
      <td><button class="btn btn-small ${u.status === "active" ? "btn-danger" : "btn-secondary"}" data-toggle-user="${u.id}" ${locked ? "disabled" : ""}>${u.status === "active" ? "Block" : "Unblock"}</button></td></tr>`;
  }).join("");
}

function renderSettings(content) {
  const roleText = currentUser.role.replace("superadmin", "Super administrator");
  content.innerHTML = `<div class="welcome-row"><div><h2>Account settings</h2><p>Update your profile and security preferences.</p></div></div><section class="panel" style="max-width:760px"><div class="panel-head"><h3>Profile information</h3></div><div style="padding:22px"><div class="form-group"><label>Full name</label><input class="form-control" id="settings-name" value="${escapeHtml(currentUser.name)}"></div><div class="form-group"><label>Email address</label><input class="form-control" value="${escapeHtml(currentUser.email)}" disabled></div><div class="form-group"><label>Role</label><input class="form-control" value="${roleText}" disabled></div><button class="btn btn-primary" id="save-settings">Save changes</button> <button class="btn btn-secondary" data-route="reset">Change password</button></div></section>`;
}

function initialExperience() {
  if (!users.some(u => u.email === "alex@accesshub.com")) saveUsers();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function initials(name) {
  return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function toast(message) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

document.addEventListener("click", event => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) navigate(routeButton.dataset.route);

  const dashboardButton = event.target.closest("[data-dashboard-page]");
  if (dashboardButton) {
    currentPage = dashboardButton.dataset.dashboardPage;
    renderDashboardContent();
  }

  if (event.target.closest(".password-toggle")) {
    const input = event.target.closest(".password-wrap").querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
  }

  if (event.target.id === "menu-btn") document.getElementById("sidebar").classList.toggle("open");
  if (event.target.id === "logout") {
    currentUser = null;
    sessionStorage.removeItem("accesshub-currentUser");
    navigate("home");
  }
  const addUser = event.target.closest("#add-user");
  if (addUser) {
    const name = prompt("Full name:");
    const email = prompt("Email address:");
    if (name && email) {
      users.push({ id: Date.now(), name: name.trim(), email: email.trim(), role: "user", status: "active" });
      saveUsers(); drawUserTable(document.getElementById("user-search")?.value || "");
      toast("User added successfully");
    }
  }
  const toggle = event.target.closest("[data-toggle-user]");
  if (toggle) {
    const user = users.find(u => u.id == toggle.dataset.toggleUser);
    if (user) {
      user.status = user.status === "active" ? "blocked" : "active";
      saveUsers(); drawUserTable(document.getElementById("user-search")?.value || "");
      toast(`${user.name} has been ${user.status}`);
    }
  }
  if (event.target.id === "save-settings") {
    const name = document.getElementById("settings-name").value.trim();
    if (!name) return toast("Please enter your name");
    currentUser.name = name;
    sessionStorage.setItem("accesshub-currentUser", JSON.stringify(currentUser));
    const found = users.find(u => u.id === currentUser.id);
    if (found) found.name = name;
    saveUsers(); renderDashboard(); toast("Profile updated");
  }
});

document.addEventListener("change", event => {
  const roleSelect = event.target.closest("[data-user-role]");
  if (!roleSelect) return;
  const user = users.find(u => u.id == roleSelect.dataset.userRole);
  if (user) {
    user.role = roleSelect.value;
    saveUsers();
    toast(`${user.name}'s role changed to ${user.role}`);
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "user-search") drawUserTable(event.target.value);
});

document.addEventListener("submit", event => {
  const form = event.target;
  const error = form.querySelector(".form-error");
  if (!form.matches("#login-form, #register-form, #reset-form")) return;
  event.preventDefault();
  const email = form.querySelector("#email")?.value.trim().toLowerCase();
  if (form.id === "login-form") {
    const name = users.find(u => u.email.toLowerCase() === email);
    if (!name) return error.textContent = "No account was found with that email.";
    if (name.status === "blocked") return error.textContent = "This account has been blocked.";
    currentUser = { ...name };
    sessionStorage.setItem("accesshub-currentUser", JSON.stringify(currentUser));
    currentPage = "dashboard";
    navigate("dashboard");
  } else if (form.id === "register-form") {
    const name = form.querySelector("#name").value.trim();
    const password = form.querySelector("#password").value;
    const confirm = form.querySelector("#confirm-password").value;
    if (password !== confirm) return error.textContent = "Passwords do not match.";
    if (password.length < 6) return error.textContent = "Password must be at least 6 characters.";
    if (users.some(u => u.email.toLowerCase() === email)) return error.textContent = "An account already exists for this email.";
    const user = { id: Date.now(), name, email, role: "user", status: "active", password };
    users.push(user); saveUsers();
    currentUser = { ...user };
    sessionStorage.setItem("accesshub-currentUser", JSON.stringify(currentUser));
    navigate("dashboard");
  } else {
    const password = form.querySelector("#password").value;
    const confirm = form.querySelector("#confirm-password").value;
    if (password.length < 6) return error.textContent = "Password must be at least 6 characters.";
    if (password !== confirm) return error.textContent = "Passwords do not match.";
    const user = users.find(u => u.email.toLowerCase() === email);
    if (!user) return error.textContent = "No account was found with that email.";
    user.password = password;
    saveUsers();
    error.textContent = "Password updated successfully.";
    setTimeout(() => navigate("login"), 1200);
  }
});

window.addEventListener("hashchange", () => bindRoute(location.hash.slice(1) || "home"));
initialExperience();
render();
