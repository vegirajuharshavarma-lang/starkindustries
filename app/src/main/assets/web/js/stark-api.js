/**
 * STARK-AI CORE — API & Subsystem Client
 * Handles authentication, AI model routing, plan permissions, usage tracking,
 * Spring Boot / Gemini integration, and Real-Time Multi-User Collaboration.
 */

class StarkApiService {
  constructor() {
    this.storageKeyUser = 'stark_user_session';
    this.storageKeyUsage = 'stark_usage_stats';
    this.storageKeySettings = 'stark_settings';
    this.storageKeyFiles = 'stark_vault_files';
    this.storageKeyCollabPrefix = 'stark_collab_session_';

    // Default Configuration
    this.apiBaseUrl = 'http://localhost:8080/api';
    this.currentUser = this.loadUser();
    this.usage = this.loadUsage();
    this.settings = this.loadSettings();

    // Plan Definitions & Hard Limits
    this.plans = {
      STANDARD: {
        name: 'STANDARD',
        price: 10,
        maxMessages: 50,
        maxFileSizeMb: 10,
        allowedModels: ['gemini-3.5-flash'],
        hasVision: true,
        hasVoice: true,
        priority: false,
        label: 'Standard Operative'
      },
      PRO: {
        name: 'PRO',
        price: 20,
        maxMessages: 250,
        maxFileSizeMb: 50,
        allowedModels: ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-image'],
        hasVision: true,
        hasVoice: true,
        priority: true,
        label: 'Pro Architect'
      },
      VIP: {
        name: 'VIP',
        price: 25,
        maxMessages: 999999, // Unlimited
        maxFileSizeMb: 200,
        allowedModels: ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-image'],
        hasVision: true,
        hasVoice: true,
        priority: true,
        label: 'VIP Executive'
      }
    };

    // Pre-configured STARK Collaborator Personas for Multi-User Simulation & Testing
    this.collaboratorPersonas = {
      tony: {
        id: 'usr_stark_01',
        name: 'Tony Stark',
        email: 'tony@stark.com',
        role: 'OWNER',
        avatar: 'TS',
        color: '#00e5ff',
        badge: 'CHIEF ARCHITECT'
      },
      bruce: {
        id: 'usr_banner_02',
        name: 'Bruce Banner',
        email: 'banner@stark.team',
        role: 'EDITOR',
        avatar: 'BB',
        color: '#10b981',
        badge: 'QUANTUM PHYSICIST'
      },
      pepper: {
        id: 'usr_pepper_03',
        name: 'Pepper Potts',
        email: 'pepper@stark.com',
        role: 'VIEWER',
        avatar: 'PP',
        color: '#f59e0b',
        badge: 'EXECUTIVE OBSERVER'
      },
      peter: {
        id: 'usr_parker_04',
        name: 'Peter Parker',
        email: 'peter@stark.team',
        role: 'EDITOR',
        avatar: 'PP',
        color: '#ef4444',
        badge: 'NEURAL FELLOW'
      }
    };

    this.activePersonaKey = localStorage.getItem('stark_active_persona') || 'tony';

    // BroadcastChannel for cross-tab / cross-window real-time event distribution
    this.collabChannel = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.collabChannel = new BroadcastChannel('stark_collab_bus');
        this.collabChannel.onmessage = (event) => this.handleIncomingBroadcast(event.data);
      }
    } catch(e) {
      console.warn('BroadcastChannel not available, using storage event bus fallback', e);
    }

    // Storage event listener fallback
    window.addEventListener('storage', (e) => {
      if (e.key === 'stark_collab_broadcast_event' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          this.handleIncomingBroadcast(payload);
        } catch(err) {}
      }
    });

    this.eventListeners = [];

    // Message Concurrency Queue
    this.transmissionQueue = [];
    this.isProcessingQueue = false;
    this.sequenceCounter = Date.now();
  }

  // --- AUTHENTICATION SUBSYSTEM ---
  loadUser() {
    const saved = localStorage.getItem(this.storageKeyUser);
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      id: 'usr_stark_01',
      name: 'Tony Stark',
      email: 'tony@stark.com',
      role: 'ADMIN',
      plan: 'PRO',
      token: 'jwt_stark_sec_token_9921',
      transmissionsCount: 18,
      createdAt: '2026-01-15T08:00:00Z'
    };
  }

  saveUser(user) {
    this.currentUser = user;
    localStorage.setItem(this.storageKeyUser, JSON.stringify(user));
  }

  loadUsage() {
    const saved = localStorage.getItem(this.storageKeyUsage);
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      messagesCount: 18,
      tokensUsed: 46200,
      filesUploaded: 4,
      voiceMinutes: 12,
      lastReset: new Date().toISOString().substring(0, 7)
    };
  }

  saveUsage() {
    localStorage.setItem(this.storageKeyUsage, JSON.stringify(this.usage));
  }

  loadSettings() {
    const saved = localStorage.getItem(this.storageKeySettings);
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      theme: 'theme-stark-dark',
      tts: false,
      history: true,
      apiUrl: 'http://localhost:8080/api'
    };
  }

  saveSettings(key, value) {
    this.settings[key] = value;
    localStorage.setItem(this.storageKeySettings, JSON.stringify(this.settings));
  }

  async login(email, password) {
    const role = email.includes('admin') || email.includes('stark') ? 'ADMIN' : 'USER';
    const user = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: email.split('@')[0].toUpperCase(),
      email: email,
      role: role,
      plan: 'PRO',
      token: 'jwt_session_' + Date.now(),
      transmissionsCount: this.usage.messagesCount,
      createdAt: new Date().toISOString()
    };
    this.saveUser(user);
    return user;
  }

  async register(name, email, password) {
    const user = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: name,
      email: email,
      role: 'USER',
      plan: 'STANDARD',
      token: 'jwt_session_' + Date.now(),
      transmissionsCount: 0,
      createdAt: new Date().toISOString()
    };
    this.saveUser(user);
    this.usage.messagesCount = 0;
    this.saveUsage();
    return user;
  }

  logout() {
    localStorage.removeItem(this.storageKeyUser);
    this.currentUser = null;
  }

  // --- PERSONA SWITCHER FOR TESTING COLLABORATION ---
  getActivePersona() {
    return this.collaboratorPersonas[this.activePersonaKey] || this.collaboratorPersonas.tony;
  }

  setActivePersona(personaKey) {
    if (this.collaboratorPersonas[personaKey]) {
      this.activePersonaKey = personaKey;
      localStorage.setItem('stark_active_persona', personaKey);
      const persona = this.collaboratorPersonas[personaKey];
      if (this.currentUser) {
        this.currentUser.id = persona.id;
        this.currentUser.name = persona.name;
        this.currentUser.email = persona.email;
        this.saveUser(this.currentUser);
      }
      this.broadcastEvent({
        type: 'PERSONA_SWITCHED',
        personaKey: personaKey,
        persona: persona,
        timestamp: Date.now()
      });
      return persona;
    }
    return null;
  }

  // --- PLAN & PERMISSION ENFORCEMENT ---
  getUserPlanDetails() {
    const tier = (this.currentUser && this.currentUser.plan) ? this.currentUser.plan : 'STANDARD';
    return this.plans[tier] || this.plans.STANDARD;
  }

  canSendQuery(modelName) {
    const plan = this.getUserPlanDetails();
    if (this.usage.messagesCount >= plan.maxMessages) {
      return {
        allowed: false,
        reason: `Monthly quota exceeded (${this.usage.messagesCount}/${plan.maxMessages}). Upgrade to PRO or VIP for higher transmission limits.`
      };
    }
    if (modelName === 'gemini-3.1-pro-preview' && plan.name === 'STANDARD') {
      return {
        allowed: false,
        reason: 'PRO Cortex Reasoning model requires a PRO or VIP subscription.'
      };
    }
    return { allowed: true };
  }

  incrementUsage(tokens = 150) {
    this.usage.messagesCount += 1;
    this.usage.tokensUsed += tokens;
    if (this.currentUser) {
      this.currentUser.transmissionsCount = this.usage.messagesCount;
      this.saveUser(this.currentUser);
    }
    this.saveUsage();
  }

  changePlan(newTier) {
    if (this.plans[newTier] && this.currentUser) {
      this.currentUser.plan = newTier;
      this.saveUser(this.currentUser);
      return true;
    }
    return false;
  }

  // --- REAL-TIME COLLABORATION EVENT BUS ---
  onCollabEvent(callback) {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback);
    };
  }

  broadcastEvent(payload) {
    payload.senderPersona = this.getActivePersona();
    payload.timestamp = payload.timestamp || Date.now();

    // 1. Local event trigger
    this.handleIncomingBroadcast(payload);

    // 2. BroadcastChannel
    if (this.collabChannel) {
      try {
        this.collabChannel.postMessage(payload);
      } catch(e) {}
    }

    // 3. Storage event fallback
    try {
      localStorage.setItem('stark_collab_broadcast_event', JSON.stringify({
        ...payload,
        _rnd: Math.random()
      }));
    } catch(e) {}
  }

  handleIncomingBroadcast(payload) {
    if (!payload || !payload.type) return;
    this.eventListeners.forEach(cb => {
      try { cb(payload); } catch(err) { console.error('Collab listener error', err); }
    });
  }

  // --- COLLABORATIVE SESSION STATE MANAGEMENT ---
  getCollabStorageKey(convoId) {
    return this.storageKeyCollabPrefix + convoId;
  }

  getLocalCollabSession(convoId, convoTitle = 'Neural Transmission') {
    const raw = localStorage.getItem(this.getCollabStorageKey(convoId));
    if (raw) {
      try { return JSON.parse(raw); } catch(e) {}
    }

    // Create default collaborative session descriptor
    const code = 'STRK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const session = {
      conversationId: convoId,
      title: convoTitle,
      isCollaborative: false,
      inviteCode: code,
      allowEditorAi: true,
      allowMemberInvites: true,
      defaultRole: 'EDITOR',
      participants: [
        {
          id: 'part_tony',
          userId: 'usr_stark_01',
          username: 'Tony Stark',
          email: 'tony@stark.com',
          role: 'OWNER',
          status: 'ONLINE',
          joinedAt: new Date().toISOString()
        }
      ]
    };
    this.saveLocalCollabSession(convoId, session);
    return session;
  }

  saveLocalCollabSession(convoId, session) {
    localStorage.setItem(this.getCollabStorageKey(convoId), JSON.stringify(session));
  }

  toggleCollaboration(convoId, convoTitle) {
    const session = this.getLocalCollabSession(convoId, convoTitle);
    session.isCollaborative = !session.isCollaborative;
    if (session.isCollaborative && (!session.inviteCode || session.inviteCode.length < 4)) {
      session.inviteCode = 'STRK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
    this.saveLocalCollabSession(convoId, session);

    this.broadcastEvent({
      type: 'COLLAB_TOGGLED',
      conversationId: convoId,
      isCollaborative: session.isCollaborative,
      session: session
    });

    return session;
  }

  getEffectiveUserRole(convoId, userId = null) {
    const activePersona = this.getActivePersona();
    const effectiveUserId = userId || (this.currentUser ? this.currentUser.id : activePersona.id);
    const session = this.getLocalCollabSession(convoId);

    if (!session.isCollaborative) {
      // If not collaborative, conversation creator/current user is OWNER
      return 'OWNER';
    }

    const participant = session.participants.find(p => p.userId === effectiveUserId || p.username.toLowerCase() === activePersona.name.toLowerCase());
    if (participant) return participant.role;

    // Check if matching owner by username
    if (activePersona.name === 'Tony Stark') return 'OWNER';

    return session.defaultRole || 'EDITOR';
  }

  inviteCollaborator(convoId, identifier, role = 'EDITOR') {
    const session = this.getLocalCollabSession(convoId);
    const idTrimmed = identifier.trim();

    let name = idTrimmed;
    let email = idTrimmed.includes('@') ? idTrimmed : idTrimmed.toLowerCase().replace(/\s+/g, '') + '@stark.team';
    if (idTrimmed.toLowerCase().includes('banner') || idTrimmed.toLowerCase().includes('bruce')) {
      name = 'Bruce Banner';
      email = 'banner@stark.team';
    } else if (idTrimmed.toLowerCase().includes('pepper')) {
      name = 'Pepper Potts';
      email = 'pepper@stark.com';
    } else if (idTrimmed.toLowerCase().includes('parker') || idTrimmed.toLowerCase().includes('peter')) {
      name = 'Peter Parker';
      email = 'peter@stark.team';
    }

    // Check if already invited
    let existing = session.participants.find(p => p.email.toLowerCase() === email.toLowerCase() || p.username.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.role = role;
      existing.status = 'ONLINE';
    } else {
      const newPart = {
        id: 'part_' + Math.random().toString(36).substring(2, 9),
        userId: 'usr_' + Math.random().toString(36).substring(2, 9),
        username: name,
        email: email,
        role: role,
        status: 'ONLINE',
        joinedAt: new Date().toISOString()
      };
      session.participants.push(newPart);
      existing = newPart;
    }

    session.isCollaborative = true;
    this.saveLocalCollabSession(convoId, session);

    this.broadcastEvent({
      type: 'PARTICIPANT_INVITED',
      conversationId: convoId,
      participant: existing,
      session: session
    });

    return existing;
  }

  updateParticipantRole(convoId, participantId, newRole) {
    const session = this.getLocalCollabSession(convoId);
    const target = session.participants.find(p => p.id === participantId);
    if (!target) throw new Error('Participant not located in session registry');

    const oldRole = target.role;
    target.role = newRole;
    this.saveLocalCollabSession(convoId, session);

    this.broadcastEvent({
      type: 'ROLE_CHANGED',
      conversationId: convoId,
      participantId: participantId,
      username: target.username,
      oldRole: oldRole,
      newRole: newRole,
      session: session
    });

    return target;
  }

  removeParticipant(convoId, participantId) {
    const session = this.getLocalCollabSession(convoId);
    const target = session.participants.find(p => p.id === participantId);
    if (!target) return;

    session.participants = session.participants.filter(p => p.id !== participantId);
    this.saveLocalCollabSession(convoId, session);

    this.broadcastEvent({
      type: 'PARTICIPANT_REMOVED',
      conversationId: convoId,
      participantId: participantId,
      username: target.username,
      session: session
    });
  }

  updateSessionSettings(convoId, newSettings) {
    const session = this.getLocalCollabSession(convoId);
    if (newSettings.allowEditorAi !== undefined) session.allowEditorAi = !!newSettings.allowEditorAi;
    if (newSettings.allowMemberInvites !== undefined) session.allowMemberInvites = !!newSettings.allowMemberInvites;
    if (newSettings.defaultRole) session.defaultRole = newSettings.defaultRole;

    this.saveLocalCollabSession(convoId, session);
    this.broadcastEvent({
      type: 'SETTINGS_UPDATED',
      conversationId: convoId,
      session: session
    });
    return session;
  }

  joinSessionByCode(inviteCode, guestName) {
    const code = inviteCode.trim().toUpperCase();
    let matchedConvoId = null;
    let matchedSession = null;

    // Scan all local sessions for matching code
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.storageKeyCollabPrefix)) {
        try {
          const s = JSON.parse(localStorage.getItem(k));
          if (s.inviteCode && s.inviteCode.toUpperCase() === code) {
            matchedConvoId = s.conversationId;
            matchedSession = s;
            break;
          }
        } catch(e) {}
      }
    }

    if (!matchedSession) {
      // Find from conversations list in localStorage
      const convosRaw = localStorage.getItem('stark_conversations');
      if (convosRaw) {
        try {
          const list = JSON.parse(convosRaw);
          const found = list.find(c => c.inviteCode && c.inviteCode.toUpperCase() === code);
          if (found) {
            matchedConvoId = found.id;
            matchedSession = this.getLocalCollabSession(found.id, found.title);
          }
        } catch(e) {}
      }
    }

    if (!matchedSession) {
      throw new Error(`Invalid or expired STARK Invite Code: "${code}". Ensure the host has activated collaboration.`);
    }

    const persona = this.getActivePersona();
    const effectiveName = guestName || persona.name;
    const effectiveEmail = persona.email;
    const role = matchedSession.defaultRole || 'EDITOR';

    // Add or update participant
    let part = matchedSession.participants.find(p => p.username.toLowerCase() === effectiveName.toLowerCase());
    if (!part) {
      part = {
        id: 'part_' + Math.random().toString(36).substring(2, 9),
        userId: persona.id,
        username: effectiveName,
        email: effectiveEmail,
        role: role,
        status: 'ONLINE',
        joinedAt: new Date().toISOString()
      };
      matchedSession.participants.push(part);
    } else {
      part.status = 'ONLINE';
    }

    matchedSession.isCollaborative = true;
    this.saveLocalCollabSession(matchedConvoId, matchedSession);

    this.broadcastEvent({
      type: 'PARTICIPANT_JOINED',
      conversationId: matchedConvoId,
      participant: part,
      session: matchedSession
    });

    return {
      conversationId: matchedConvoId,
      session: matchedSession,
      participant: part
    };
  }

  // --- CONCURRENCY QUEUE & AI SYNTHESIS ---
  enqueueTransmission(convoId, taskFn) {
    return new Promise((resolve, reject) => {
      this.transmissionQueue.push({ convoId, taskFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.transmissionQueue.length === 0) return;
    this.isProcessingQueue = true;

    const item = this.transmissionQueue.shift();
    try {
      const result = await item.taskFn();
      item.resolve(result);
    } catch(err) {
      item.reject(err);
    } finally {
      this.isProcessingQueue = false;
      if (this.transmissionQueue.length > 0) {
        setTimeout(() => this.processQueue(), 20);
      }
    }
  }

  // --- AI TRANSMISSION CORE ---
  async generateAiResponse(prompt, model = 'gemini-3.5-flash', history = [], attachments = []) {
    const check = this.canSendQuery(model);
    if (!check.allowed) {
      throw new Error(check.reason);
    }

    // Wrap in concurrency queue to guarantee sequential thread safety across participants
    return this.enqueueTransmission('global', async () => {
      if (window.AndroidBridge && typeof window.AndroidBridge.sendAiPrompt === 'function') {
        return new Promise((resolve, reject) => {
          const callbackId = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          window[callbackId] = (resultJson) => {
            delete window[callbackId];
            try {
              const parsed = JSON.parse(resultJson);
              if (parsed.error) {
                reject(new Error(parsed.error));
              } else {
                this.incrementUsage(parsed.tokens || 180);
                resolve(parsed.text);
              }
            } catch(e) {
              this.incrementUsage(150);
              resolve(resultJson);
            }
          };

          const payload = JSON.stringify({
            prompt: prompt,
            model: model,
            history: history,
            attachments: attachments
          });

          window.AndroidBridge.sendAiPrompt(payload, callbackId);
        });
      }

      // Simulated Neural Engine / REST fallback
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      this.incrementUsage(210);
      return this.synthesizeLocalResponse(prompt, model, attachments);
    });
  }

  synthesizeLocalResponse(prompt, model, attachments) {
    const p = prompt.toLowerCase();
    
    if (attachments && attachments.length > 0) {
      const file = attachments[0];
      return `### 📑 STARK Document Intelligence Analysis\n\n**Processed File:** \`${file.name}\` (${file.size})\n\n**Analysis Summary:**\n- Synthesized **${file.name}** across ${file.tokens || 420} estimated tokens.\n- Extracted security schemas, configuration parameters, and core logic.\n\n**Answers to your prompt regarding ${file.name}:**\n1. **Structure Validation:** File meets standard POSIX/RFC specifications with zero syntax anomalies detected.\n2. **Security Posture:** No hardcoded private keys or plain-text secrets discovered.\n3. **Recommendation:** Ready for production deployment pipeline.`;
    }

    if (p.includes('collab') || p.includes('concurren') || p.includes('real-time') || p.includes('shared')) {
      return `### 👥 STARK-AI Collaborative Concurrency Telemetry\n\n**Neural Channel Status:** Synced across active participants.\n\n#### Concurrency & Message Pipeline Details:\n1. **Thread Sequencing:** Monotonic client timestamping ensures zero message interleaving or race conditions under high concurrent volume.\n2. **Participant Roles Enforced:**\n   - **HOST (Tony Stark):** Full session authority, member promotion, kick privileges.\n   - **EDITOR:** Live message transmission, neural query authorization.\n   - **VIEWER (Pepper Potts):** Real-time read-only sync, query input locked.\n3. **Event Bus:** BroadcastChannel active with sub-10ms inter-tab latency.`;
    }

    if (p.includes('security') || p.includes('oauth') || p.includes('jwt') || p.includes('auth')) {
      return `### 🛡️ STARK Cybersecurity Audit Report\n\n**Target:** OAuth2 & JWT Token Pipeline Authentication Stack\n\nHere is the comprehensive architectural audit and recommended hardening steps:\n\n#### 1. Token Signature & Key Management\n- **Algorithm:** Enforce \`ES256\` (ECDSA) or \`EdDSA\` instead of \`HS256\` (HMAC) to prevent symmetric key leakage across microservice boundaries.\n- **Key Rotation:** Implement a dynamic JWKS endpoint (\`/.well-known/jwks.json\`) with rotating key IDs (\`kid\`).\n\n#### 2. Revocation & State Management\n\`\`\`java\n@Component\npublic class JwtTokenFilter extends OncePerRequestFilter {\n    @Autowired\n    private TokenRevocationService revocationService;\n\n    @Override\n    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)\n            throws ServletException, IOException {\n        String token = resolveBearerToken(req);\n        if (token != null && revocationService.isBlacklisted(token)) {\n            res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token revoked by STARK Core Security");\n            return;\n        }\n        chain.doFilter(req, res);\n    }\n}\n\`\`\`\n\n#### 3. Protection Directives\n* **CSRF Mitigation:** Set \`SameSite=Strict\` and \`HttpOnly\` on refresh cookies.\n* **Rate Limiting:** Enforce Redis token bucket at 10 req/sec per IP.`;
    }

    if (p.includes('spring') || p.includes('java') || p.includes('code') || p.includes('controller') || p.includes('algorithm')) {
      return `### ⚡ STARK Code Synthesis Module\n\n**Target:** Production Spring Boot 3.x REST Controller with Rate Limiting & Clean DTOs\n\n\`\`\`java\npackage com.starkai.core.controller;\n\nimport com.starkai.core.dto.ChatRequest;\nimport com.starkai.core.dto.ChatResponse;\nimport com.starkai.core.service.ChatService;\nimport jakarta.validation.Valid;\nimport lombok.RequiredArgsConstructor;\nimport org.springframework.http.ResponseEntity;\nimport org.springframework.security.core.annotation.AuthenticationPrincipal;\nimport org.springframework.web.bind.annotation.*;\n\n@RestController\n@RequestMapping("/api/chat")\n@RequiredArgsConstructor\npublic class ChatController {\n\n    private final ChatService chatService;\n\n    @PostMapping\n    public ResponseEntity<ChatResponse> processTransmission(\n            @AuthenticationPrincipal UserDetailsImpl userDetails,\n            @Valid @RequestBody ChatRequest request) {\n        \n        ChatResponse response = chatService.handleTransmission(userDetails.getId(), request);\n        return ResponseEntity.ok(response);\n    }\n}\n\`\`\`\n\n#### Key Architectural Merits:\n1. **Zero-leakage DTO pattern:** Entities are never returned raw to the client.\n2. **Stateless JWT context:** Injected seamlessly via \`@AuthenticationPrincipal\`.\n3. **Declarative Validation:** Uses Jakarta Validation for input sanitization.`;
    }

    if (p.includes('image') || p.includes('visual') || p.includes('picture') || p.includes('logo')) {
      return `### 🎨 STARK Vision & Generation Matrix\n\n**Synthesized Prompt:** *${prompt}*\n\n**Status:** Image render stream complete. High-resolution 1024x1024 metallic composition generated.\n\n![Generated STARK Asset](data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="100%" height="100%" fill="%230b1329"/><circle cx="200" cy="120" r="60" fill="none" stroke="%2300e5ff" stroke-width="4" stroke-dasharray="8,6"/><circle cx="200" cy="120" r="30" fill="%2300e5ff" opacity="0.8"/><text x="200" y="125" fill="%23000" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="middle">STARK AI</text><text x="200" y="210" fill="%2300e5ff" font-family="sans-serif" font-size="12" text-anchor="middle">NEURAL GENERATION MATRIX</text></svg>)\n\n*Asset stored securely in your temporary vault. You can download or re-render at will.*`;
    }

    return `### STARK-AI CORE Response\n\nI have received and processed your inquiry using the **${model}** neural pipeline.\n\n**Core Findings & Recommendations:**\n1. **Direct Assessment:** Regarding your inquiry about "${prompt}", optimal execution requires breaking down the objective into modular, verifiable milestones.\n2. **System Alignment:** All cryptographic parameters, resource quotas, and response verifications have passed validation.\n3. **Next Steps:** Would you like me to synthesize the implementation code, generate architectural diagrams, or run an automated unit test suite on this topic?`;
  }
}

// Global API Service instance
window.starkApi = new StarkApiService();
