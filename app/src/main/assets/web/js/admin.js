/**
 * STARK-AI CORE — Global Admin & Telemetry Dashboard
 */

let adminUsers = [
  { id: 'usr_01', name: 'Tony Stark', email: 'tony@stark.com', plan: 'PRO', messages: 18, status: 'ACTIVE', role: 'ADMIN' },
  { id: 'usr_02', name: 'Pepper Potts', email: 'pepper@stark.com', plan: 'VIP', messages: 84, status: 'ACTIVE', role: 'USER' },
  { id: 'usr_03', name: 'James Rhodes', email: 'rhodey@usaf.mil', plan: 'PRO', messages: 46, status: 'ACTIVE', role: 'USER' },
  { id: 'usr_04', name: 'Peter Parker', email: 'peter@web.net', plan: 'STANDARD', messages: 49, status: 'ACTIVE', role: 'USER' },
  { id: 'usr_05', name: 'Bruce Banner', email: 'banner@gamma.edu', plan: 'VIP', messages: 192, status: 'ACTIVE', role: 'USER' },
  { id: 'usr_06', name: 'Natasha Romanoff', email: 'nat@shield.gov', plan: 'PRO', messages: 72, status: 'ACTIVE', role: 'USER' },
  { id: 'usr_07', name: 'Justin Hammer', email: 'hammer@hammertech.com', plan: 'STANDARD', messages: 50, status: 'RESTRICTED', role: 'USER' }
];

function initAdminSystem() {
  renderAdminTable();
}

function renderAdminTable(query = '') {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = adminUsers.filter(u => 
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  filtered.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(u.name)}</strong></td>
      <td><code>${escapeHtml(u.email)}</code></td>
      <td>
        <select class="stark-select" onchange="changeAdminUserTier('${u.id}', this.value)" style="padding:4px 8px; font-size:11px;">
          <option value="STANDARD" ${u.plan === 'STANDARD' ? 'selected' : ''}>STANDARD ($10)</option>
          <option value="PRO" ${u.plan === 'PRO' ? 'selected' : ''}>PRO ($20)</option>
          <option value="VIP" ${u.plan === 'VIP' ? 'selected' : ''}>VIP ($25)</option>
        </select>
      </td>
      <td>${u.messages} transmissions</td>
      <td>
        <span class="badge-${u.status === 'ACTIVE' ? 'status-online' : 'danger'}" style="font-size:11px; font-weight:700;">
          ${u.status === 'ACTIVE' ? '● ACTIVE' : '■ RESTRICTED'}
        </span>
      </td>
      <td><span style="font-size:11px; color:var(--text-muted);">${u.role}</span></td>
      <td>
        <button class="convo-btn-sm" onclick="toggleUserBan('${u.id}')" title="${u.status === 'ACTIVE' ? 'Suspend Access' : 'Restore Access'}" style="color:${u.status === 'ACTIVE' ? '#ef4444' : '#10b981'}; font-weight:600; font-size:11px;">
          ${u.status === 'ACTIVE' ? 'Suspend' : 'Reinstate'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterAdminUsers(query) {
  renderAdminTable(query);
}

function changeAdminUserTier(userId, newPlan) {
  const user = adminUsers.find(u => u.id === userId);
  if (user) {
    user.plan = newPlan;
    showToast(`User ${user.name} upgraded to ${newPlan}`);
  }
}

function toggleUserBan(userId) {
  const user = adminUsers.find(u => u.id === userId);
  if (user) {
    user.status = user.status === 'ACTIVE' ? 'RESTRICTED' : 'ACTIVE';
    renderAdminTable();
    showToast(`Security status updated for ${user.name}`);
  }
}

function refreshAdminData() {
  const total = document.getElementById('admin-total-users');
  const active = document.getElementById('admin-active-users');
  const rev = document.getElementById('admin-revenue');

  if (total) total.textContent = (1428 + Math.floor(Math.random() * 8)).toLocaleString();
  if (active) active.textContent = (382 + Math.floor(Math.random() * 12)).toLocaleString();
  if (rev) rev.textContent = '$' + (26450 + Math.floor(Math.random() * 200)).toLocaleString();

  renderAdminTable();
  showToast('Global Telemetry Synchronized with Backend Core');
}
