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
