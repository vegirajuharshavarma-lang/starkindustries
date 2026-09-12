/**
 * STARK-AI CORE — Application Master Controller
 */

let speechRecognizer = null;
let isListening = false;
let selectedCheckoutPlan = null;
let vaultFiles = [
  { id: 'file_01', name: 'stark_auth_spec_v3.pdf', size: '2.4 MB', tokens: 1840, date: '2026-09-08' },
  { id: 'file_02', name: 'spring_boot_app_config.yml', size: '14 KB', tokens: 320, date: '2026-09-10' },
  { id: 'file_03', name: 'quantum_encryption_keys.json', size: '42 KB', tokens: 810, date: '2026-09-11' }
];

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // 1. Initialize UI theme
  if (window.starkApi.settings.theme) {
    document.body.className = window.starkApi.settings.theme;
    const sel = document.getElementById('setting-theme');
    if (sel) sel.value = window.starkApi.settings.theme;
  }

  // 2. Initialize Voice Recognizer
  initSpeechRecognition();

  // 3. Initialize Chat Subsystem
  initChatSystem();

  // 4. Initialize Admin
  initAdminSystem();

  // 5. Update UI Telemetry
  updateTelemetryUi();
  updateUserDisplay();
  renderVaultFiles();
  renderDashboardRecentChats();

  // 6. Setup Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createNewConversation();
    }
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Mobile sidebar toggle button
  document.getElementById('btn-sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-backdrop')?.classList.toggle('active');
  });

  // Check URL hash for direct session invite (e.g. #join=STRK-8921)
  if (window.location.hash && window.location.hash.includes('join=')) {
    const code = window.location.hash.split('join=')[1]?.toUpperCase();
    if (code) {
      setTimeout(() => {
        showModal('modal-join-session');
        const input = document.getElementById('join-invite-code');
        if (input) input.value = code;
      }, 400);
    }
  }
}

// Navigation & View Switching
function switchView(viewId) {
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const panel = document.getElementById(viewId);
  if (panel) panel.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (navBtn) navBtn.classList.add('active');

  closeSidebar();

  if (viewId === 'view-dashboard') {
    renderDashboardRecentChats();
  }
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('active');
}

// Modal Controllers
function showModal(modalId) {
  closeAllModals();
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
}

// Telemetry & UI Quota Refresh
function updateTelemetryUi() {
  const user = window.starkApi.currentUser;
  const plan = window.starkApi.getUserPlanDetails();
  const usage = window.starkApi.usage;

  const pct = Math.min(100, Math.round((usage.messagesCount / plan.maxMessages) * 100));
  
  // Sidebar Telemetry
  const pctElem = document.getElementById('telemetry-usage-pct');
  const barElem = document.getElementById('telemetry-bar-fill');
  const countsElem = document.getElementById('telemetry-counts');
  
  if (pctElem) pctElem.textContent = plan.maxMessages > 10000 ? '0%' : `${pct}%`;
  if (barElem) barElem.style.width = plan.maxMessages > 10000 ? '5%' : `${pct}%`;
  if (countsElem) {
    countsElem.textContent = plan.maxMessages > 10000 ? 
      `${usage.messagesCount} / Uncapped` : 
      `${usage.messagesCount} / ${plan.maxMessages} Transmissions`;
  }

  // Dashboard Cards
  const dashLimit = document.getElementById('dash-card-limit');
  const dashPct = document.getElementById('dash-card-pct');
  const dashBar = document.getElementById('dash-metric-bar');
  const dashPlan = document.getElementById('dash-card-plan');

  if (dashLimit) dashLimit.textContent = `${usage.messagesCount} / ${plan.maxMessages > 10000 ? '∞' : plan.maxMessages}`;
  if (dashPct) dashPct.textContent = `${pct}%`;
  if (dashBar) dashBar.style.width = `${pct}%`;
  if (dashPlan) dashPlan.textContent = plan.name;

  // Plan Badges
  const badgeTier = document.getElementById('badge-plan-tier');
  if (badgeTier) badgeTier.textContent = plan.name;

  const footPlan = document.getElementById('footnote-plan-name');
  if (footPlan) footPlan.textContent = plan.name;

  const mobilePlan = document.getElementById('btn-mobile-plan');
  if (mobilePlan) mobilePlan.textContent = plan.name;
}

function updateUserDisplay() {
  const user = window.starkApi.currentUser;
  if (!user) return;

  const nameElem = document.getElementById('user-display-name');
  const planElem = document.getElementById('user-display-plan');
  const initialsElem = document.getElementById('user-avatar-initials');
  const dashName = document.getElementById('dash-user-name');

  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);

  if (nameElem) nameElem.textContent = user.name;
  if (planElem) planElem.textContent = `${user.plan} ARCHITECT`;
  if (initialsElem) initialsElem.textContent = initials;
  if (dashName) dashName.textContent = user.name;

  // Profile modal
  const pName = document.getElementById('profile-full-name');
  const pEmail = document.getElementById('profile-email');
  const pRole = document.getElementById('profile-role-tag');
  const pAvatar = document.getElementById('profile-avatar-large');
  const pTrans = document.getElementById('p-stat-transmissions');
  const pPlan = document.getElementById('p-stat-plan');

  if (pName) pName.textContent = user.name;
  if (pEmail) pEmail.textContent = user.email;
  if (pRole) pRole.textContent = `${user.role} • ${user.plan}`;
  if (pAvatar) pAvatar.textContent = initials;
  if (pTrans) pTrans.textContent = window.starkApi.usage.messagesCount;
  if (pPlan) pPlan.textContent = user.plan;
}

// Subscription & Checkout
function selectPlan(tierName, price) {
  const currentPlan = window.starkApi.currentUser?.plan;
  if (currentPlan === tierName) {
    showToast(`You are currently on the ${tierName} plan`);
    return;
  }

  selectedCheckoutPlan = { name: tierName, price: price };
  
  document.getElementById('checkout-tier-name').textContent = tierName;
  document.getElementById('checkout-amount').textContent = `$${price}.00 / month`;
  document.getElementById('checkout-btn-text').textContent = `Authorize Upgrade to ${tierName}`;

  closeModal('modal-subscription');
  showModal('modal-checkout');
}

function handleCheckoutSubmit(e) {
  e.preventDefault();
  if (!selectedCheckoutPlan) return;

  const tier = selectedCheckoutPlan.name;
  window.starkApi.changePlan(tier);

  closeModal('modal-checkout');
  updateTelemetryUi();
  updateUserDisplay();
  showToast(`Successfully upgraded to STARK-AI ${tier}! Unlimited bandwidth provisioned.`);
}

// Authentication Handlers
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');

  document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
  document.getElementById('form-reset').classList.toggle('hidden', tab !== 'reset');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;

  const user = await window.starkApi.login(email, pass);
  closeModal('modal-auth');
  updateUserDisplay();
  updateTelemetryUi();
  showToast(`Welcome back, ${user.name}`);
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-password').value;

  const user = await window.starkApi.register(name, email, pass);
  closeModal('modal-auth');
  updateUserDisplay();
  updateTelemetryUi();
  showToast(`Account initialized. Welcome to STARK-AI CORE, ${user.name}`);
}

function handleResetPassword(e) {
  e.preventDefault();
  closeModal('modal-auth');
  showToast('Password recovery cryptokey dispatched to email');
}

function quickLogin(roleKey) {
  let email = 'tony@stark.com';
  let plan = 'PRO';

  if (roleKey === 'standard') {
    email = 'peter@web.net';
    plan = 'STANDARD';
  } else if (roleKey === 'vip') {
    email = 'pepper@stark.com';
    plan = 'VIP';
  } else if (roleKey === 'admin') {
    email = 'admin@stark.com';
    plan = 'VIP';
  }

  window.starkApi.login(email, 'StarkCore2026!').then(u => {
    u.plan = plan;
    window.starkApi.saveUser(u);
    closeModal('modal-auth');
    updateUserDisplay();
    updateTelemetryUi();
    showToast(`Switched identity to ${u.name} (${plan})`);
  });
}

function logoutUser() {
  window.starkApi.logout();
  closeModal('modal-profile');
  showModal('modal-auth');
  showToast('Logged out of STARK-AI Core');
}

// File Attachment & Vault
function triggerFileInput() {
  document.getElementById('file-input-hidden')?.click();
}

function triggerImagePicker() {
  document.getElementById('image-input-hidden')?.click();
}

function handleFileSelected(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const plan = window.starkApi.getUserPlanDetails();

    if (file.size > plan.maxFileSizeMb * 1024 * 1024) {
      showToast(`File ${file.name} exceeds ${plan.name} limit of ${plan.maxFileSizeMb}MB`, true);
      continue;
    }

    const item = {
      name: file.name,
      size: `${sizeMb} MB`,
      tokens: Math.round(file.size / 4),
      isImage: false
    };

    pendingAttachments.push(item);
    vaultFiles.unshift({
      id: 'file_' + Date.now() + '_' + i,
      name: file.name,
      size: `${sizeMb} MB`,
      tokens: Math.round(file.size / 4),
      date: new Date().toISOString().substring(0, 10)
    });
  }

  renderPendingAttachments();
  renderVaultFiles();
  showToast(`${files.length} file(s) attached to transmission`);
}

function handleImageSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    pendingAttachments.push({
      name: file.name,
      size: `${(file.size / 1024).toFixed(0)} KB`,
      isImage: true,
      dataUrl: event.target.result
    });
    renderPendingAttachments();
    showToast('Image attached for Vision Analysis');
  };
  reader.readAsDataURL(file);
}

function handleDrop(e) {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFileSelected({ target: { files: e.dataTransfer.files } });
  }
}

function renderPendingAttachments() {
  const tray = document.getElementById('attachment-tray');
  const list = document.getElementById('tray-files-list');
  if (!tray || !list) return;

  if (pendingAttachments.length === 0) {
    tray.classList.add('hidden');
    list.innerHTML = '';
    return;
  }

  tray.classList.remove('hidden');
  list.innerHTML = '';

  pendingAttachments.forEach((att, idx) => {
    const chip = document.createElement('div');
    chip.className = 'tray-chip';
    chip.innerHTML = `
      <span>${att.isImage ? '🖼️' : '📄'} ${escapeHtml(att.name)}</span>
      <button class="tray-chip-remove" onclick="removePendingAttachment(${idx})">&times;</button>
    `;
    list.appendChild(chip);
  });
}

function removePendingAttachment(idx) {
  pendingAttachments.splice(idx, 1);
  renderPendingAttachments();
}

function clearPendingAttachments() {
  pendingAttachments = [];
  renderPendingAttachments();
}

function renderVaultFiles() {
  const list = document.getElementById('vault-files-list');
  const countBadge = document.getElementById('badge-files-count');
  const vaultCount = document.getElementById('vault-count');
  const dashFiles = document.getElementById('dash-card-files');

  if (countBadge) countBadge.textContent = vaultFiles.length;
  if (vaultCount) vaultCount.textContent = vaultFiles.length;
  if (dashFiles) dashFiles.innerHTML = `${vaultFiles.length} <span class="metric-unit">docs</span>`;

  if (!list) return;
  list.innerHTML = '';

  vaultFiles.forEach((f, idx) => {
    const item = document.createElement('div');
    item.className = 'vault-item';
    item.innerHTML = `
      <div>
        <div class="vault-item-name">📄 ${escapeHtml(f.name)}</div>
        <div class="vault-item-meta">${f.size} • ~${f.tokens} tokens • ${f.date}</div>
      </div>
      <div>
        <button class="convo-btn-sm" onclick="askAboutVaultFile('${escapeAttr(f.name)}')" title="Ask AI about this document" style="color:var(--cyan-core); margin-right:8px;">Analyze</button>
        <button class="convo-btn-sm" onclick="deleteVaultFile(${idx})" title="Delete File" style="color:#ef4444;">&times;</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function askAboutVaultFile(fileName) {
  closeModal('modal-files');
  switchView('view-chat');
  const input = document.getElementById('prompt-input');
  input.value = `Perform a comprehensive intelligence and vulnerability audit on ${fileName}.`;
  sendMessage();
}

function deleteVaultFile(idx) {
  vaultFiles.splice(idx, 1);
  renderVaultFiles();
  showToast('File removed from vault');
}

// Voice Subsystem
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    speechRecognizer = new SpeechRecognition();
    speechRecognizer.continuous = false;
    speechRecognizer.interimResults = false;
    speechRecognizer.lang = 'en-US';

    speechRecognizer.onstart = () => {
      isListening = true;
      document.getElementById('btn-voice-input')?.classList.add('recording');
      showToast('Voice dictation active... Speak now');
    };

    speechRecognizer.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('prompt-input');
      input.value = (input.value + ' ' + transcript).trim();
      autoResizeInput(input);
      showToast('Voice transcribed');
    };

    speechRecognizer.onerror = (e) => {
      isListening = false;
      document.getElementById('btn-voice-input')?.classList.remove('recording');
      showToast('Voice transcription error or permission denied');
    };

    speechRecognizer.onend = () => {
      isListening = false;
      document.getElementById('btn-voice-input')?.classList.remove('recording');
    };
  }
}

function toggleVoiceInput() {
  if (window.AndroidBridge && typeof window.AndroidBridge.triggerVoiceRecognition === 'function') {
    window.AndroidBridge.triggerVoiceRecognition();
    return;
  }

  if (!speechRecognizer) {
    showToast('Speech Recognition not supported on this browser/environment');
    return;
  }

  if (isListening) {
    speechRecognizer.stop();
  } else {
    try {
      speechRecognizer.start();
    } catch(e) {
      speechRecognizer.stop();
    }
  }
}

// Input Helpers
function handleInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResizeInput(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(160, textarea.scrollHeight) + 'px';
}

function usePrompt(promptText) {
  const input = document.getElementById('prompt-input');
  input.value = promptText;
  autoResizeInput(input);
  sendMessage();
}

function launchFeature(feature) {
  switchView('view-chat');
  if (feature === 'coding') {
    usePrompt('Generate a Spring Boot 3 JWT SecurityFilter with role-based authorization.');
  } else if (feature === 'analysis') {
    showModal('modal-files');
  } else if (feature === 'vision') {
    triggerImagePicker();
  } else if (feature === 'voice') {
    toggleVoiceInput();
  }
}

function renderDashboardRecentChats() {
  const container = document.getElementById('dash-recent-chats');
  if (!container) return;
  container.innerHTML = '';

  const recents = conversations.slice(0, 4);
  if (recents.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">No transmissions recorded yet.</div>`;
    return;
  }

  recents.forEach(conv => {
    const row = document.createElement('div');
    row.className = 'dash-recent-row';
    row.onclick = () => {
      selectConversation(conv.id);
      switchView('view-chat');
    };

    row.innerHTML = `
      <div>
        <div class="recent-row-title">${escapeHtml(conv.title)}</div>
        <div class="recent-row-meta">${conv.messages.length} messages • Model: ${conv.model}</div>
      </div>
      <button class="convo-btn-sm" style="color:var(--cyan-core);">&rarr;</button>
    `;
    container.appendChild(row);
  });
}

// Settings & Preferences
function changeTheme(themeClass) {
  document.body.className = themeClass;
  window.starkApi.saveSettings('theme', themeClass);
  showToast('Visual aesthetic updated');
}

function saveSetting(key, val) {
  window.starkApi.saveSettings(key, val);
  showToast('Setting updated');
}

function wipeLocalData() {
  if (confirm('Permanently wipe all cached transmissions and reset usage?')) {
    localStorage.clear();
    showToast('Local cache wiped. Reloading Core...');
    setTimeout(() => location.reload(), 600);
  }
}

// Toast System
function showToast(msg, isError = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  toast.innerHTML = `
    <span>${isError ? '⚠️' : '⚡'}</span>
    <span>${escapeHtml(msg)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
