/**
 * STARK-AI CORE — Chat Management, UI Renderer & Real-Time Collaboration Engine
 * Handles conversations, multi-user real-time synchronization, role enforcement,
 * concurrent message sequencing, and AI responses.
 */

let conversations = [];
let currentConversationId = null;
let isGenerating = false;
let abortGeneration = false;
let pendingAttachments = [];
let typingTimeout = null;

// Initialize Chat Subsystem
function initChatSystem() {
  loadConversations();
  if (conversations.length === 0) {
    createNewConversation(true);
  } else {
    selectConversation(conversations[0].id);
  }

  // Bind real-time collaboration event bus listener
  if (window.starkApi) {
    window.starkApi.onCollabEvent((event) => handleIncomingCollabEvent(event));
  }
}

function loadConversations() {
  const saved = localStorage.getItem('stark_conversations');
  if (saved) {
    try {
      conversations = JSON.parse(saved);
      // Ensure all conversations have collaboration metadata initialized
      conversations.forEach(c => ensureCollabMetadata(c));
      return;
    } catch(e) {}
  }

  // Default Initial Conversations with rich collaborative session
  const defaultCode = 'STRK-8921';
  conversations = [
    {
      id: 'conv_default_01',
      title: 'OAuth2 Hardening & Real-time Collab',
      model: 'gemini-3.5-flash',
      createdAt: new Date().toISOString(),
      isCollaborative: true,
      inviteCode: defaultCode,
      allowEditorAi: true,
      allowMemberInvites: true,
      defaultRole: 'EDITOR',
      participants: [
        { id: 'part_tony', userId: 'usr_stark_01', username: 'Tony Stark', email: 'tony@stark.com', role: 'OWNER', status: 'ONLINE', joinedAt: new Date().toISOString() },
        { id: 'part_bruce', userId: 'usr_banner_02', username: 'Bruce Banner', email: 'banner@stark.team', role: 'EDITOR', status: 'ONLINE', joinedAt: new Date().toISOString() },
        { id: 'part_pepper', userId: 'usr_pepper_03', username: 'Pepper Potts', email: 'pepper@stark.com', role: 'VIEWER', status: 'ONLINE', joinedAt: new Date().toISOString() }
      ],
      messages: [
        {
          id: 'msg_1',
          role: 'user',
          senderName: 'Tony Stark',
          senderRole: 'OWNER',
          senderUserId: 'usr_stark_01',
          sequenceNumber: 1001,
          content: 'Initialize multi-user security audit on our OAuth2 token pipeline. Team, please review.',
          timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: 'msg_2',
          role: 'ai',
          senderName: 'STARK AI CORE',
          senderRole: 'AI',
          sequenceNumber: 1002,
          content: `### 🛡️ STARK Cybersecurity Audit Report\n\n**Target:** OAuth2 & JWT Token Pipeline Stack\n\n#### 1. Token Signature & Key Management\n- **Algorithm:** Enforce \`ES256\` (ECDSA) or \`EdDSA\` instead of \`HS256\` (HMAC) to prevent key leakage.\n- **Key Rotation:** Dynamic JWKS endpoint with automated cryptographic key rotation.\n\n\`\`\`java\n@Component\npublic class JwtTokenFilter extends OncePerRequestFilter {\n    @Autowired\n    private TokenRevocationService revocationService;\n\n    @Override\n    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)\n            throws ServletException, IOException {\n        String token = resolveBearerToken(req);\n        if (token != null && revocationService.isBlacklisted(token)) {\n            res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token revoked by STARK Core Security");\n            return;\n        }\n        chain.doFilter(req, res);\n    }\n}\n\`\`\`\n\n#### 2. Directives\n* **CSRF Mitigation:** \`SameSite=Strict\` with \`HttpOnly\` cookies.\n* **Rate Limiting:** Redis token bucket at 10 req/sec per IP.`,
          timestamp: new Date(Date.now() - 3500000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: 'msg_3',
          role: 'user',
          senderName: 'Bruce Banner',
          senderRole: 'EDITOR',
          senderUserId: 'usr_banner_02',
          sequenceNumber: 1003,
          content: 'Confirmed. Thermal telemetry on the auth cache shows zero leakages. Ready to deploy hotfix.',
          timestamp: new Date(Date.now() - 1800000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    }
  ];
  saveConversations();
}

function ensureCollabMetadata(conv) {
  if (!conv.inviteCode) {
    conv.inviteCode = 'STRK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  if (conv.isCollaborative === undefined) {
    conv.isCollaborative = false;
  }
  if (conv.allowEditorAi === undefined) {
    conv.allowEditorAi = true;
  }
  if (conv.allowMemberInvites === undefined) {
    conv.allowMemberInvites = true;
  }
  if (!conv.defaultRole) {
    conv.defaultRole = 'EDITOR';
  }
  if (!conv.participants || conv.participants.length === 0) {
    conv.participants = [
      { id: 'part_tony', userId: 'usr_stark_01', username: 'Tony Stark', email: 'tony@stark.com', role: 'OWNER', status: 'ONLINE', joinedAt: new Date().toISOString() }
    ];
  }
}

function saveConversations() {
  localStorage.setItem('stark_conversations', JSON.stringify(conversations));
  renderSidebarConversations();
}

function renderSidebarConversations(filterText = '') {
  const container = document.getElementById('conversations-list');
  if (!container) return;
  container.innerHTML = '';

  const filtered = conversations.filter(c => 
    c.title.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding: 12px; font-size: 12px; color: var(--text-muted); text-align: center;">No transmissions found</div>`;
    return;
  }

  filtered.forEach(conv => {
    const item = document.createElement('div');
    item.className = `convo-item ${conv.id === currentConversationId ? 'active' : ''}`;
    item.onclick = () => selectConversation(conv.id);

    const isCollab = conv.isCollaborative;
    const pCount = conv.participants ? conv.participants.length : 1;

    item.innerHTML = `
      <div class="convo-title" title="${conv.title}">
        ${isCollab ? 
          `<span style="color:var(--cyan-core); margin-right:6px;" title="Shared Team Session (Code: ${conv.inviteCode})">👥</span>` :
          `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle; display:inline-block;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`
        }
        <span>${escapeHtml(conv.title)}</span>
        ${isCollab ? `<span class="convo-collab-badge" title="${pCount} connected">${pCount}P</span>` : ''}
      </div>
      <div class="convo-actions" onclick="event.stopPropagation()">
        <button class="convo-btn-sm" onclick="renameConversationPrompt('${conv.id}')" title="Rename">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
        </button>
        <button class="convo-btn-sm" onclick="deleteConversation('${conv.id}')" title="Delete">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function filterConversations(text) {
  renderSidebarConversations(text);
}

function createNewConversation(silent = false) {
  const newCode = 'STRK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const persona = window.starkApi.getActivePersona();
  
  const newConv = {
    id: 'conv_' + Date.now(),
    title: 'New Transmission',
    model: document.getElementById('model-select')?.value || 'gemini-3.5-flash',
    createdAt: new Date().toISOString(),
    isCollaborative: false,
    inviteCode: newCode,
    allowEditorAi: true,
    allowMemberInvites: true,
    defaultRole: 'EDITOR',
    participants: [
      {
        id: 'part_' + Math.random().toString(36).substring(2, 9),
        userId: persona.id,
        username: persona.name,
        email: persona.email,
        role: 'OWNER',
        status: 'ONLINE',
        joinedAt: new Date().toISOString()
      }
    ],
    messages: []
  };

  conversations.unshift(newConv);
  saveConversations();
  selectConversation(newConv.id);
  if (!silent) {
    showToast('New STARK Transmission Workspace Initiated');
    switchView('view-chat');
  }
}

function selectConversation(convId) {
  currentConversationId = convId;
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;

  ensureCollabMetadata(conv);

  // Update Topbar Title
  const titleElem = document.getElementById('current-chat-title');
  if (titleElem) titleElem.textContent = conv.title;

  // Update Model Select
  const modelSelect = document.getElementById('model-select');
  if (modelSelect && conv.model) {
    modelSelect.value = conv.model;
    updateModelTag(conv.model);
  }

  renderSidebarConversations();
  renderActiveMessages();
  updateCollabTopbarAndPresenceUi();
  enforceUserRolePermissions();
  closeSidebar();
}

function renameConversationPrompt(convId) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;
  const newName = prompt('Enter new transmission title:', conv.title);
  if (newName && newName.trim()) {
    conv.title = newName.trim();
    saveConversations();
    if (conv.id === currentConversationId) {
      document.getElementById('current-chat-title').textContent = conv.title;
    }
    showToast('Transmission renamed');
  }
}

function deleteConversation(convId) {
  if (!confirm('Permanently delete this transmission transcript?')) return;
  conversations = conversations.filter(c => c.id !== convId);
  saveConversations();
  if (currentConversationId === convId) {
    if (conversations.length > 0) {
      selectConversation(conversations[0].id);
    } else {
      createNewConversation(true);
    }
  }
  showToast('Transmission eliminated from memory');
}

// --- ACTIVE ROLE CALCULATION & PERMISSIONS ENFORCEMENT ---
function getCurrentUserRole() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return 'OWNER';

  const persona = window.starkApi.getActivePersona();
  if (!conv.isCollaborative) {
    return 'OWNER';
  }

  // Match in participant list by username or userId
  const match = (conv.participants || []).find(p => 
    p.userId === persona.id || 
    p.username.toLowerCase() === persona.name.toLowerCase()
  );

  if (match) return match.role;

  // If user is Tony Stark, treat as Owner by default
  if (persona.name === 'Tony Stark') return 'OWNER';

  return conv.defaultRole || 'EDITOR';
}

function enforceUserRolePermissions() {
  const role = getCurrentUserRole();
  const promptInput = document.getElementById('prompt-input');
  const btnSend = document.getElementById('btn-send-message');
  const btnAttach = document.getElementById('btn-attach-file');
  const btnImage = document.getElementById('btn-image-mode');
  const btnVoice = document.getElementById('btn-voice-input');
  const viewerBanner = document.getElementById('viewer-mode-banner');

  if (role === 'VIEWER') {
    // Lock inputs into Read-Only Observation Mode
    if (promptInput) {
      promptInput.disabled = true;
      promptInput.placeholder = '🔒 [VIEWER MODE] Read-only observation stream. Messaging locked.';
      promptInput.style.opacity = '0.6';
    }
    if (btnSend) btnSend.disabled = true;
    if (btnAttach) btnAttach.disabled = true;
    if (btnImage) btnImage.disabled = true;
    if (btnVoice) btnVoice.disabled = true;
    if (viewerBanner) viewerBanner.classList.remove('hidden');
  } else {
    // Unlock input for OWNER and EDITOR
    if (promptInput) {
      promptInput.disabled = false;
      promptInput.placeholder = 'Initialize inquiry... (Ask anything, synthesize code, analyze data)';
      promptInput.style.opacity = '1';
    }
    if (btnSend) btnSend.disabled = isGenerating;
    if (btnAttach) btnAttach.disabled = false;
    if (btnImage) btnImage.disabled = false;
    if (btnVoice) btnVoice.disabled = false;
    if (viewerBanner) viewerBanner.classList.add('hidden');
  }
}

// --- COLLABORATION PRESENCE & TOPBAR UI ---
function updateCollabTopbarAndPresenceUi() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  const countBadge = document.getElementById('topbar-collab-count');
  const avatarStack = document.getElementById('topbar-avatar-stack');
  const collabBtnText = document.getElementById('topbar-collab-text');
  const presenceBar = document.getElementById('collab-presence-bar');
  const presenceChips = document.getElementById('presence-chips-container');
  const currentRole = getCurrentUserRole();

  const participants = conv.participants || [];
  const activeCount = participants.length;

  if (countBadge) countBadge.textContent = activeCount;
  if (collabBtnText) {
    collabBtnText.textContent = conv.isCollaborative ? 'Team Shared' : 'Collaborate';
  }

  // Update Topbar avatar stack
  if (avatarStack) {
    avatarStack.innerHTML = '';
    const slice = participants.slice(0, 3);
    slice.forEach(p => {
      const initials = p.username.split(' ').map(n => n[0]).join('').substring(0, 2);
      const color = getParticipantColor(p.username);
      const chip = document.createElement('span');
      chip.className = 'stack-avatar';
      chip.style.background = color;
      chip.style.color = '#000';
      chip.title = `${p.username} (${p.role})`;
      chip.textContent = initials;
      avatarStack.appendChild(chip);
    });
  }

  // Render Presence Bar
  if (presenceBar) {
    presenceBar.classList.toggle('active-collab', conv.isCollaborative);
  }

  if (presenceChips) {
    presenceChips.innerHTML = '';
    participants.forEach(p => {
      const isMe = p.username.toLowerCase() === window.starkApi.getActivePersona().name.toLowerCase();
      const chip = document.createElement('div');
      chip.className = `presence-chip ${isMe ? 'is-self' : ''}`;
      const color = getParticipantColor(p.username);
      const roleBadge = p.role === 'OWNER' ? 'HOST' : p.role;
      
      chip.innerHTML = `
        <span class="chip-avatar" style="background:${color};color:#000;">${p.username.substring(0,2).toUpperCase()}</span>
        <span class="chip-name">${escapeHtml(p.username)}</span>
        <span class="chip-role chip-role-${p.role.toLowerCase()}">${roleBadge}</span>
        ${isMe ? '<span class="chip-you-tag">YOU</span>' : ''}
      `;
      presenceChips.appendChild(chip);
    });
  }
}

function getParticipantColor(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('tony') || n.includes('stark')) return '#00e5ff';
  if (n.includes('bruce') || n.includes('banner')) return '#10b981';
  if (n.includes('pepper')) return '#f59e0b';
  if (n.includes('peter') || n.includes('parker')) return '#ef4444';
  return '#a855f7';
}

// --- MESSAGE RENDERING WITH SENDER IDENTITY & CONCURRENCY ORDER ---
function renderActiveMessages() {
  const container = document.getElementById('messages-list');
  const hero = document.getElementById('chat-empty-hero');
  if (!container) return;

  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv || conv.messages.length === 0) {
    container.innerHTML = '';
    if (hero) hero.classList.remove('hidden');
    return;
  }

  if (hero) hero.classList.add('hidden');
  container.innerHTML = '';

  // Sort messages by sequence number / time to guarantee ordered multi-user presentation
  const sorted = [...conv.messages].sort((a, b) => {
    if (a.sequenceNumber && b.sequenceNumber) return a.sequenceNumber - b.sequenceNumber;
    return 0;
  });

  sorted.forEach(msg => {
    container.appendChild(createMessageRowElement(msg));
  });

  scrollChatToBottom();
}

function createMessageRowElement(msg) {
  const row = document.createElement('div');
  row.className = `message-row ${msg.role}`;
  row.id = `msg-${msg.id}`;

  const isUser = msg.role === 'user';
  const senderName = msg.senderName || (isUser ? 'Operative' : 'STARK AI CORE');
  const senderRole = msg.senderRole || (isUser ? 'EDITOR' : 'AI');
  const initials = isUser ? senderName.split(' ').map(n => n[0]).join('').substring(0, 2) : '⚡';
  const avatarColor = isUser ? getParticipantColor(senderName) : 'var(--cyan-core)';

  let attachmentsHtml = '';
  if (msg.attachments && msg.attachments.length > 0) {
    attachmentsHtml = `<div class="msg-attachments">`;
    msg.attachments.forEach(att => {
      if (att.isImage) {
        attachmentsHtml += `<img src="${att.dataUrl || att.url}" class="msg-image-thumb" alt="Attachment">`;
      } else {
        attachmentsHtml += `<span class="attachment-chip">📎 ${escapeHtml(att.name)}</span>`;
      }
    });
    attachmentsHtml += `</div>`;
  }

  const renderedContent = isUser ? escapeHtml(msg.content) : parseMarkdown(msg.content);

  // Role pill styles
  let roleBadgeClass = 'role-badge-editor';
  if (senderRole === 'OWNER' || senderRole === 'HOST') roleBadgeClass = 'role-badge-owner';
  else if (senderRole === 'VIEWER') roleBadgeClass = 'role-badge-viewer';
  else if (senderRole === 'AI') roleBadgeClass = 'role-badge-ai';

  row.innerHTML = `
    <div class="message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}" style="${isUser ? `background:${avatarColor};color:#000;font-weight:bold;` : ''}">
      ${initials}
    </div>
    <div class="message-content-wrap">
      <!-- Sender Identity & Sequence Header -->
      <div class="message-sender-header">
        <span class="sender-name-label">${escapeHtml(senderName)}</span>
        <span class="sender-role-pill ${roleBadgeClass}">${senderRole === 'OWNER' ? 'HOST' : senderRole}</span>
        ${msg.sequenceNumber ? `<span class="sender-seq-tag">#${msg.sequenceNumber}</span>` : ''}
      </div>

      <div class="message-bubble ${isUser ? '' : 'markdown-body'}">
        ${attachmentsHtml}
        <div class="message-text">${renderedContent}</div>
      </div>

      <div class="message-actions">
        <span style="font-size:10px; color:var(--text-muted);">${msg.timestamp || ''}</span>
        ${!isUser ? `
          <button class="msg-btn-action" onclick="copyMessageText('${escapeAttr(msg.content)}')" title="Copy Markdown">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          </button>
          <button class="msg-btn-action" onclick="speakMessageText('${escapeAttr(stripMarkdown(msg.content))}')" title="Play Voice Synthesizer">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            <span>Voice</span>
          </button>
          <button class="msg-btn-action" onclick="regenerateLastAiMessage()" title="Regenerate Transmission">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            <span>Regenerate</span>
          </button>
        ` : ''}
      </div>
    </div>
  `;
  return row;
}

// --- SENDING MESSAGES & CONCURRENCY HANDLING ---
async function sendMessage() {
  const role = getCurrentUserRole();
  if (role === 'VIEWER') {
    showToast('Viewer Access: Read-only observation active. Transmissions locked.', true);
    return;
  }

  if (isGenerating) {
    showToast('Neural Core is currently busy synthesizing a response. Please wait.');
    return;
  }

  const input = document.getElementById('prompt-input');
  const text = input.value.trim();
  if (!text && pendingAttachments.length === 0) return;

  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  // Role permissions check for AI neural generation
  const isOwner = role === 'OWNER';
  if (!isOwner && !conv.allowEditorAi) {
    showToast('Host has restricted AI Neural generation to Host-only.', true);
    return;
  }

  // Clear live typing broadcast immediately
  broadcastTyping(false);

  // If default title, update dynamically
  if (conv.messages.length === 0) {
    conv.title = text.length > 28 ? text.substring(0, 28) + '...' : text;
    document.getElementById('current-chat-title').textContent = conv.title;
  }

  const persona = window.starkApi.getActivePersona();
  const seq = ++window.starkApi.sequenceCounter;

  // Create User Message with Sender Metadata
  const userMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    role: 'user',
    senderName: persona.name,
    senderRole: role,
    senderUserId: persona.id,
    sequenceNumber: seq,
    content: text,
    attachments: [...pendingAttachments],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  conv.messages.push(userMsg);
  saveConversations();
  renderActiveMessages();

  // Reset Input & Attachments
  input.value = '';
  input.style.height = 'auto';
  const attachmentsToSend = [...pendingAttachments];
  clearPendingAttachments();

  // Broadcast user message to all connected collaborators in real-time
  window.starkApi.broadcastEvent({
    type: 'MESSAGE_TRANSMITTED',
    conversationId: conv.id,
    message: userMsg
  });

  // Trigger AI Query Execution
  await executeAiQuery(text, conv, attachmentsToSend, persona.name);
}

async function executeAiQuery(promptText, conv, attachments, requestedByName = 'Operative') {
  isGenerating = true;
  abortGeneration = false;
  setGeneratingUi(true);

  // Broadcast AI synthesis start to other participants for concurrency awareness
  window.starkApi.broadcastEvent({
    type: 'AI_SYNTHESIS_STATE',
    conversationId: conv.id,
    isSynthesizing: true,
    requesterName: requestedByName
  });

  const model = conv.model || 'gemini-3.5-flash';

  try {
    const aiResponseText = await window.starkApi.generateAiResponse(
      promptText,
      model,
      conv.messages.map(m => ({ role: m.role, text: m.content })),
      attachments
    );

    if (abortGeneration) {
      showToast('Transmission generation halted');
      return;
    }

    const aiSeq = ++window.starkApi.sequenceCounter;
    const aiMsg = {
      id: 'msg_ai_' + Date.now(),
      role: 'ai',
      senderName: 'STARK AI CORE',
      senderRole: 'AI',
      sequenceNumber: aiSeq,
      content: aiResponseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    conv.messages.push(aiMsg);
    saveConversations();
    renderActiveMessages();
    updateTelemetryUi();

    // Broadcast AI message to all collaborators in real-time
    window.starkApi.broadcastEvent({
      type: 'MESSAGE_TRANSMITTED',
      conversationId: conv.id,
      message: aiMsg
    });

    // Auto TTS if enabled
    if (window.starkApi.settings.tts) {
      speakMessageText(stripMarkdown(aiResponseText));
    }

  } catch(err) {
    showToast(err.message || 'Error communicating with STARK Core', true);
    if (err.message && err.message.includes('quota exceeded')) {
      setTimeout(() => showModal('modal-subscription'), 800);
    }
  } finally {
    isGenerating = false;
    setGeneratingUi(false);

    // Broadcast AI synthesis end
    window.starkApi.broadcastEvent({
      type: 'AI_SYNTHESIS_STATE',
      conversationId: conv.id,
      isSynthesizing: false,
      requesterName: requestedByName
    });
  }
}

function stopAiGeneration() {
  abortGeneration = true;
  isGenerating = false;
  setGeneratingUi(false);
  window.starkApi.broadcastEvent({
    type: 'AI_SYNTHESIS_STATE',
    conversationId: currentConversationId,
    isSynthesizing: false
  });
}

function regenerateLastAiMessage() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv || conv.messages.length === 0) return;

  let lastUserMsg = null;
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    if (conv.messages[i].role === 'user') {
      lastUserMsg = conv.messages[i];
      break;
    }
  }

  if (lastUserMsg) {
    if (conv.messages[conv.messages.length - 1].role === 'ai') {
      conv.messages.pop();
    }
    executeAiQuery(lastUserMsg.content, conv, lastUserMsg.attachments || [], lastUserMsg.senderName);
  }
}

function setGeneratingUi(generating) {
  const typing = document.getElementById('typing-indicator');
  const stopWrap = document.getElementById('stop-generation-wrap');
  const sendBtn = document.getElementById('btn-send-message');

  if (typing) typing.classList.toggle('hidden', !generating);
  if (stopWrap) stopWrap.classList.toggle('hidden', !generating);
  if (sendBtn) sendBtn.disabled = generating;

  if (generating) scrollChatToBottom();
}

function scrollChatToBottom() {
  const container = document.getElementById('chat-messages-container');
  if (container) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
  }
}

function clearCurrentChat() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;
  if (!confirm('Clear all transmissions in this active workspace?')) return;
  conv.messages = [];
  saveConversations();
  renderActiveMessages();
  showToast('Workspace buffer cleared');
}

function exportChatTranscript() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;
  let markdown = `# ${conv.title}\n*STARK-AI CORE Transmission Log — ${new Date(conv.createdAt).toLocaleString()}*\n\n---\n\n`;
  conv.messages.forEach(m => {
    markdown += `### [${(m.senderName || m.role).toUpperCase()}] (${m.senderRole || ''}) — ${m.timestamp}\n${m.content}\n\n`;
  });

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stark-transcript-${conv.id}.md`;
  a.click();
  showToast('Transcript exported as Markdown');
}

function onModelChange(newModel) {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (conv) {
    conv.model = newModel;
    saveConversations();
  }
  updateModelTag(newModel);
  showToast(`Neural pipeline shifted to ${newModel}`);
}

function updateModelTag(model) {
  const tag = document.getElementById('active-model-tag');
  if (!tag) return;
  if (model.includes('pro')) {
    tag.textContent = 'STARK PRO CORTEX';
    tag.style.color = 'var(--purple-vip)';
  } else if (model.includes('image')) {
    tag.textContent = 'STARK VISION 2.5';
    tag.style.color = '#10b981';
  } else {
    tag.textContent = 'STARK 3.5 FLASH';
    tag.style.color = 'var(--cyan-core)';
  }
}

// --- REAL-TIME COLLABORATION EVENT DISPATCHER & INCOMING HANDLER ---
function handleIncomingCollabEvent(event) {
  if (!event || !event.type) return;

  const currentPersona = window.starkApi.getActivePersona();

  // 1. New Message Transmitted by another participant
  if (event.type === 'MESSAGE_TRANSMITTED' && event.conversationId === currentConversationId) {
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;

    // Check if message already exists locally
    const exists = conv.messages.some(m => m.id === event.message.id);
    if (!exists) {
      conv.messages.push(event.message);
      saveConversations();
      renderActiveMessages();
      if (event.message.senderName !== currentPersona.name) {
        showToast(`⚡ New transmission received from ${event.message.senderName}`);
      }
    }
  }

  // 2. AI Synthesis Concurrency Telemetry Indicator
  if (event.type === 'AI_SYNTHESIS_STATE' && event.conversationId === currentConversationId) {
    const aiIndicator = document.getElementById('collab-ai-concurrency-indicator');
    const aiStatusText = document.getElementById('collab-ai-status-text');
    if (aiIndicator && aiStatusText) {
      if (event.isSynthesizing) {
        aiStatusText.textContent = `Neural Core synthesizing query for ${event.requesterName || 'collaborator'}...`;
        aiIndicator.classList.remove('hidden');
      } else {
        aiIndicator.classList.add('hidden');
      }
    }
  }

  // 3. Live Typing Broadcast
  if (event.type === 'LIVE_TYPING' && event.conversationId === currentConversationId) {
    if (event.senderName !== currentPersona.name) {
      const typingElem = document.getElementById('collab-live-typing');
      const typingText = document.getElementById('collab-live-typing-text');
      if (typingElem && typingText) {
        if (event.isTyping) {
          typingText.textContent = `${event.senderName} is formulating a transmission...`;
          typingElem.classList.remove('hidden');
        } else {
          typingElem.classList.add('hidden');
        }
      }
    }
  }

  // 4. Participant Joined or Invited
  if ((event.type === 'PARTICIPANT_JOINED' || event.type === 'PARTICIPANT_INVITED') && event.conversationId === currentConversationId) {
    const conv = conversations.find(c => c.id === currentConversationId);
    if (conv && event.participant) {
      if (!conv.participants.some(p => p.username.toLowerCase() === event.participant.username.toLowerCase())) {
        conv.participants.push(event.participant);
        saveConversations();
        updateCollabTopbarAndPresenceUi();
        renderCollabModalUi();
        showToast(`Operative ${event.participant.username} joined the session (${event.participant.role})`);
      }
    }
  }

  // 5. Participant Role Changed
  if (event.type === 'ROLE_CHANGED' && event.conversationId === currentConversationId) {
    const conv = conversations.find(c => c.id === currentConversationId);
    if (conv) {
      const target = (conv.participants || []).find(p => p.id === event.participantId || p.username.toLowerCase() === event.username.toLowerCase());
      if (target) {
        target.role = event.newRole;
        saveConversations();
        updateCollabTopbarAndPresenceUi();
        renderCollabModalUi();
        enforceUserRolePermissions();
        if (event.username.toLowerCase() === currentPersona.name.toLowerCase()) {
          showToast(`🛡️ Your permissions were updated to ${event.newRole}`);
        } else {
          showToast(`Operative ${event.username} reassigned to ${event.newRole}`);
        }
      }
    }
  }

  // 6. Participant Removed / Disconnected
  if (event.type === 'PARTICIPANT_REMOVED' && event.conversationId === currentConversationId) {
    const conv = conversations.find(c => c.id === currentConversationId);
    if (conv) {
      conv.participants = (conv.participants || []).filter(p => p.id !== event.participantId);
      saveConversations();
      updateCollabTopbarAndPresenceUi();
      renderCollabModalUi();
      if (event.username.toLowerCase() === currentPersona.name.toLowerCase()) {
        showToast('You have been disconnected from this shared session.', true);
        createNewConversation();
      } else {
        showToast(`Operative ${event.username} disconnected from session.`);
      }
    }
  }

  // 7. Collaboration Toggled
  if (event.type === 'COLLAB_TOGGLED' && event.conversationId === currentConversationId) {
    const conv = conversations.find(c => c.id === currentConversationId);
    if (conv) {
      conv.isCollaborative = event.isCollaborative;
      saveConversations();
      updateCollabTopbarAndPresenceUi();
      renderCollabModalUi();
      enforceUserRolePermissions();
      showToast(conv.isCollaborative ? 'Team Collaboration Mode Activated' : 'Collaboration Mode Deactivated');
    }
  }

  // 8. Persona Switched (For testing simulator)
  if (event.type === 'PERSONA_SWITCHED') {
    updateCollabTopbarAndPresenceUi();
    enforceUserRolePermissions();
    renderCollabModalUi();
  }
}

// Live typing broadcaster
function broadcastTyping(isTyping) {
  if (!currentConversationId) return;
  const persona = window.starkApi.getActivePersona();
  window.starkApi.broadcastEvent({
    type: 'LIVE_TYPING',
    conversationId: currentConversationId,
    senderName: persona.name,
    isTyping: isTyping
  });
}

function handleInputKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
    return;
  }

  // Broadcast typing pulse with 1.5s debounce
  broadcastTyping(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    broadcastTyping(false);
  }, 1500);
}

function autoResizeInput(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
}

// --- COLLABORATION MANAGEMENT MODAL LOGIC ---
function openCurrentCollabModal() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  ensureCollabMetadata(conv);
  renderCollabModalUi();
  showModal('modal-collaboration');
}

function renderCollabModalUi() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  const currentRole = getCurrentUserRole();
  const isOwner = currentRole === 'OWNER';

  // Master switch
  const toggleCheckbox = document.getElementById('collab-toggle-checkbox');
  const activeDot = document.getElementById('collab-active-dot');
  const statusHeading = document.getElementById('collab-status-heading');
  const statusDesc = document.getElementById('collab-status-desc');

  if (toggleCheckbox) toggleCheckbox.checked = conv.isCollaborative;
  if (activeDot) activeDot.classList.toggle('online', conv.isCollaborative);
  if (statusHeading) {
    statusHeading.textContent = conv.isCollaborative ? 'Collaborative Session Active' : 'Session is Currently Private';
  }
  if (statusDesc) {
    statusDesc.textContent = conv.isCollaborative ?
      `Active Team Session • Code: ${conv.inviteCode} • ${conv.participants.length} connected` :
      'Enable to allow team operatives to join, query, and synchronize neural transcripts.';
  }

  // Invite code display
  const codeDisplay = document.getElementById('collab-invite-code-display');
  if (codeDisplay) codeDisplay.textContent = conv.inviteCode;

  // Roster rendering
  const rosterCount = document.getElementById('collab-roster-count');
  const listContainer = document.getElementById('collab-participants-list');
  if (rosterCount) rosterCount.textContent = conv.participants.length;

  if (listContainer) {
    listContainer.innerHTML = '';
    conv.participants.forEach(p => {
      const isMe = p.username.toLowerCase() === window.starkApi.getActivePersona().name.toLowerCase();
      const color = getParticipantColor(p.username);
      const item = document.createElement('div');
      item.className = 'participant-item';

      item.innerHTML = `
        <div class="p-info">
          <div class="p-avatar" style="background:${color};color:#000;">${p.username.substring(0, 2).toUpperCase()}</div>
          <div class="p-details">
            <div class="p-name-row">
              <strong class="p-name">${escapeHtml(p.username)}</strong>
              ${isMe ? '<span class="p-badge-you">YOU</span>' : ''}
              <span class="p-status-dot"></span>
            </div>
            <span class="p-email">${escapeHtml(p.email || 'stark.team')}</span>
          </div>
        </div>

        <div class="p-controls">
          ${isOwner && !isMe ? `
            <select class="role-selector-select" onchange="updateParticipantRoleAction('${p.id}', this.value)">
              <option value="OWNER" ${p.role === 'OWNER' ? 'selected' : ''}>OWNER (Host)</option>
              <option value="EDITOR" ${p.role === 'EDITOR' ? 'selected' : ''}>EDITOR (Can Query)</option>
              <option value="VIEWER" ${p.role === 'VIEWER' ? 'selected' : ''}>VIEWER (Read Only)</option>
            </select>
            <button class="btn-kick-participant" onclick="removeParticipantAction('${p.id}')" title="Disconnect Operative">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          ` : `
            <span class="role-static-pill role-badge-${p.role.toLowerCase()}">${p.role === 'OWNER' ? 'HOST' : p.role}</span>
          `}
        </div>
      `;
      listContainer.appendChild(item);
    });
  }

  // Host governance checkboxes
  const govPanel = document.getElementById('collab-governance-panel');
  const allowAiBox = document.getElementById('gov-allow-editor-ai');
  const allowInvitesBox = document.getElementById('gov-allow-member-invites');

  if (allowAiBox) allowAiBox.checked = conv.allowEditorAi;
  if (allowInvitesBox) allowInvitesBox.checked = conv.allowMemberInvites;
  if (govPanel) {
    govPanel.style.opacity = isOwner ? '1' : '0.5';
    govPanel.style.pointerEvents = isOwner ? 'all' : 'none';
  }

  // Simulator test tray persona highlights
  const activeKey = window.starkApi.activePersonaKey || 'tony';
  document.querySelectorAll('.btn-persona-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-persona-${activeKey}`)?.classList.add('active');
}

function toggleCurrentConversationCollab() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  conv.isCollaborative = !conv.isCollaborative;
  saveConversations();
  updateCollabTopbarAndPresenceUi();
  renderCollabModalUi();
  enforceUserRolePermissions();

  window.starkApi.broadcastEvent({
    type: 'COLLAB_TOGGLED',
    conversationId: conv.id,
    isCollaborative: conv.isCollaborative
  });

  showToast(conv.isCollaborative ? 'Team Collaboration Mode Activated' : 'Collaboration Mode Deactivated');
}

function copyCollabCode() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;
  navigator.clipboard.writeText(conv.inviteCode).then(() => {
    showToast(`Access Code ${conv.inviteCode} copied to clipboard`);
  });
}

function copyCollabShareLink() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;
  const url = `${window.location.origin}${window.location.pathname}#join=${conv.inviteCode}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Secure Session Direct Link copied to clipboard');
  });
}

function inviteCollaboratorAction() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  const input = document.getElementById('collab-invite-input');
  const roleSelect = document.getElementById('collab-invite-role');
  const query = (input?.value || '').trim();
  const role = roleSelect?.value || 'EDITOR';

  if (!query) {
    showToast('Please enter an operative call-sign or email address', true);
    return;
  }

  // Check if current user is allowed to invite
  const currentRole = getCurrentUserRole();
  if (currentRole !== 'OWNER' && !conv.allowMemberInvites) {
    showToast('Host has restricted sending invites to Host-only', true);
    return;
  }

  let name = query;
  let email = query.includes('@') ? query : query.toLowerCase().replace(/\s+/g, '') + '@stark.team';
  if (query.toLowerCase().includes('banner') || query.toLowerCase().includes('bruce')) {
    name = 'Bruce Banner';
    email = 'banner@stark.team';
  } else if (query.toLowerCase().includes('pepper')) {
    name = 'Pepper Potts';
    email = 'pepper@stark.com';
  } else if (query.toLowerCase().includes('peter') || query.toLowerCase().includes('parker')) {
    name = 'Peter Parker';
    email = 'peter@stark.team';
  }

  let existing = conv.participants.find(p => p.username.toLowerCase() === name.toLowerCase() || p.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.role = role;
  } else {
    existing = {
      id: 'part_' + Math.random().toString(36).substring(2, 9),
      userId: 'usr_' + Math.random().toString(36).substring(2, 9),
      username: name,
      email: email,
      role: role,
      status: 'ONLINE',
      joinedAt: new Date().toISOString()
    };
    conv.participants.push(existing);
  }

  conv.isCollaborative = true;
  saveConversations();
  updateCollabTopbarAndPresenceUi();
  renderCollabModalUi();

  window.starkApi.broadcastEvent({
    type: 'PARTICIPANT_INVITED',
    conversationId: conv.id,
    participant: existing
  });

  input.value = '';
  showToast(`Operative ${name} invited as ${role}`);
}

function quickSelectInvite(name, role) {
  const input = document.getElementById('collab-invite-input');
  const roleSelect = document.getElementById('collab-invite-role');
  if (input) input.value = name;
  if (roleSelect) roleSelect.value = role;
  inviteCollaboratorAction();
}

function updateParticipantRoleAction(participantId, newRole) {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  const p = conv.participants.find(part => part.id === participantId);
  if (!p) return;

  const oldRole = p.role;
  p.role = newRole;
  saveConversations();
  updateCollabTopbarAndPresenceUi();
  renderCollabModalUi();

  window.starkApi.broadcastEvent({
    type: 'ROLE_CHANGED',
    conversationId: conv.id,
    participantId: participantId,
    username: p.username,
    oldRole: oldRole,
    newRole: newRole
  });

  showToast(`Updated ${p.username} permissions to ${newRole}`);
}

function removeParticipantAction(participantId) {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  const p = conv.participants.find(part => part.id === participantId);
  if (!p) return;

  if (!confirm(`Disconnect operative ${p.username} from this shared session?`)) return;

  conv.participants = conv.participants.filter(part => part.id !== participantId);
  saveConversations();
  updateCollabTopbarAndPresenceUi();
  renderCollabModalUi();

  window.starkApi.broadcastEvent({
    type: 'PARTICIPANT_REMOVED',
    conversationId: conv.id,
    participantId: participantId,
    username: p.username
  });

  showToast(`Operative ${p.username} disconnected from session.`);
}

function updateGovSettings() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  const allowAiBox = document.getElementById('gov-allow-editor-ai');
  const allowInvitesBox = document.getElementById('gov-allow-member-invites');

  if (allowAiBox) conv.allowEditorAi = allowAiBox.checked;
  if (allowInvitesBox) conv.allowMemberInvites = allowInvitesBox.checked;

  saveConversations();
  showToast('Session Governance parameters saved');
}

// --- TEST LAB & CONCURRENCY SIMULATOR ---
function switchTestPersona(personaKey) {
  const persona = window.starkApi.setActivePersona(personaKey);
  if (persona) {
    document.querySelectorAll('.btn-persona-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-persona-${personaKey}`)?.classList.add('active');
    
    updateUserDisplay();
    enforceUserRolePermissions();
    updateCollabTopbarAndPresenceUi();
    renderCollabModalUi();

    showToast(`Identity switched to ${persona.name} (${persona.role})`);
  }
}

async function simulatePartnerMessage() {
  const conv = conversations.find(c => c.id === currentConversationId);
  if (!conv) return;

  const partnerPersona = window.starkApi.activePersonaKey === 'bruce' ? 
    window.starkApi.collaboratorPersonas.peter : 
    window.starkApi.collaboratorPersonas.bruce;

  const prompts = [
    "Running thermodynamic simulation on the arc reactor core. Telemetry indicates stable power distribution at 99.4%.",
    "Analyzed the OAuth2 key rotation pipeline. Recommending Ed25519 signatures for microservice verification.",
    "Quantum entanglement check completed on secondary node. Encryption keys synchronized."
  ];
  const chosenPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  const seq = ++window.starkApi.sequenceCounter;

  const partnerMsg = {
    id: 'msg_sim_' + Date.now(),
    role: 'user',
    senderName: partnerPersona.name,
    senderRole: partnerPersona.role,
    senderUserId: partnerPersona.id,
    sequenceNumber: seq,
    content: chosenPrompt,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  conv.messages.push(partnerMsg);
  saveConversations();
  renderActiveMessages();

  // Broadcast
  window.starkApi.broadcastEvent({
    type: 'MESSAGE_TRANSMITTED',
    conversationId: conv.id,
    message: partnerMsg
  });

  showToast(`⚡ Partner transmission received from ${partnerPersona.name}`);

  // Automatically trigger concurrent AI response
  await executeAiQuery(chosenPrompt, conv, [], partnerPersona.name);
}

function simulatePartnerTyping() {
  const partnerPersona = window.starkApi.activePersonaKey === 'bruce' ? 
    window.starkApi.collaboratorPersonas.peter : 
    window.starkApi.collaboratorPersonas.bruce;

  window.starkApi.broadcastEvent({
    type: 'LIVE_TYPING',
    conversationId: currentConversationId,
    senderName: partnerPersona.name,
    isTyping: true
  });

  setTimeout(() => {
    window.starkApi.broadcastEvent({
      type: 'LIVE_TYPING',
      conversationId: currentConversationId,
      senderName: partnerPersona.name,
      isTyping: false
    });
  }, 2500);

  showToast(`Simulated typing pulse dispatched for ${partnerPersona.name}`);
}

// --- JOIN SHARED SESSION ---
function executeJoinSession() {
  const codeInput = document.getElementById('join-invite-code');
  const nameInput = document.getElementById('join-operative-name');
  const code = (codeInput?.value || '').trim().toUpperCase();
  const guestName = (nameInput?.value || '').trim();

  if (!code) {
    showToast('Please enter a 6-digit session access code', true);
    return;
  }

  // Search local conversations for matching code
  let targetConv = conversations.find(c => c.inviteCode && c.inviteCode.toUpperCase() === code);

  if (!targetConv) {
    // If not found in memory, try to find from localStorage
    const saved = localStorage.getItem('stark_conversations');
    if (saved) {
      try {
        const list = JSON.parse(saved);
        targetConv = list.find(c => c.inviteCode && c.inviteCode.toUpperCase() === code);
      } catch(e) {}
    }
  }

  if (!targetConv) {
    showToast(`Session code "${code}" not located. Ensure the host has initiated collaboration.`, true);
    return;
  }

  const persona = window.starkApi.getActivePersona();
  const effectiveName = guestName || persona.name;
  const role = targetConv.defaultRole || 'EDITOR';

  // Add participant to the target conversation
  let part = targetConv.participants.find(p => p.username.toLowerCase() === effectiveName.toLowerCase());
  if (!part) {
    part = {
      id: 'part_' + Math.random().toString(36).substring(2, 9),
      userId: persona.id,
      username: effectiveName,
      email: persona.email,
      role: role,
      status: 'ONLINE',
      joinedAt: new Date().toISOString()
    };
    targetConv.participants.push(part);
  }

  targetConv.isCollaborative = true;
  saveConversations();

  window.starkApi.broadcastEvent({
    type: 'PARTICIPANT_JOINED',
    conversationId: targetConv.id,
    participant: part
  });

  closeModal('modal-join-session');
  selectConversation(targetConv.id);
  switchView('view-chat');
  showToast(`Connected to shared transmission: "${targetConv.title}" (${role})`);
}

// --- ATTACHMENT TRAY MANAGEMENT ---
function triggerFileInput() {
  document.getElementById('file-input-hidden')?.click();
}

function handleFileSelected(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    pendingAttachments.push({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      isImage: file.type.startsWith('image/'),
      fileObj: file
    });
  }

  renderPendingAttachments();
  e.target.value = '';
}

function triggerImagePicker() {
  document.getElementById('image-input-hidden')?.click();
}

function handleImageSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    pendingAttachments.push({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      isImage: true,
      dataUrl: event.target.result
    });
    renderPendingAttachments();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
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
    chip.className = 'tray-file-chip';
    chip.innerHTML = `
      <span>${att.isImage ? '🖼️' : '📎'} ${escapeHtml(att.name)}</span>
      <button class="btn-remove-tray-file" onclick="removePendingAttachment(${idx})">&times;</button>
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

// --- MARKDOWN & TEXT UTILITIES ---
function parseMarkdown(md) {
  if (!md) return '';
  let html = md;

  html = html.replace(/```([a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const l = lang || 'text';
    const escapedCode = escapeHtml(code.trim());
    return `
      <div class="code-block-wrap">
        <div class="code-header">
          <span class="code-lang">${l}</span>
          <button class="btn-copy-code" onclick="copyCodeFromBlock(this)">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Code</span>
          </button>
        </div>
        <pre><code class="language-${l}">${escapedCode}</code></pre>
      </div>
    `;
  });

  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" class="msg-image-thumb" />');

  html = html.replace(/^\s*\*\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\s*\-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/sim, '<ul>$1</ul>');
  html = html.replace(/\n\n/g, '</p><p>');

  return html;
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/[#*`_~]/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .trim();
}

function copyCodeFromBlock(btn) {
  const codeElem = btn.closest('.code-block-wrap').querySelector('code');
  if (codeElem) {
    navigator.clipboard.writeText(codeElem.innerText).then(() => {
      const span = btn.querySelector('span');
      span.textContent = 'Copied!';
      setTimeout(() => span.textContent = 'Copy Code', 2000);
      showToast('Code block copied to clipboard');
    });
  }
}

function copyMessageText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Transmission copied to clipboard');
  });
}

function speakMessageText(cleanText) {
  if (window.AndroidBridge && typeof window.AndroidBridge.speak === 'function') {
    window.AndroidBridge.speak(cleanText);
    showToast('Audio playback initiated (Native Core)');
    return;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
    showToast('Audio playback initiated (Web Voice)');
  } else {
    showToast('Speech synthesis not supported on this host');
  }
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '\\\'')
    .replace(/\n/g, ' ');
}
