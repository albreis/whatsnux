// ─────────────────────────────────────────────────────────────────────────────
// Renderer — gerencia a barra de abas no topo
// ─────────────────────────────────────────────────────────────────────────────

const tabsContainer = document.getElementById('tabs-container');
const btnAdd = document.getElementById('btn-add-tab');

// Modal elements
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalOk = document.getElementById('modal-ok');
const modalCancel = document.getElementById('modal-cancel');

let sessions = [];
let activeSessionId = null;

// ─── Modal helpers ───────────────────────────────────────────────────────────

async function showModal(title, defaultValue, { showInput = true, okText = 'OK', cancelText = 'Cancelar' } = {}) {
  // Esconde a BrowserView para que o modal fique acessível
  await window.api.hideActiveView();

  return new Promise((resolve) => {

    modalTitle.textContent = title;
    modalInput.value = defaultValue || '';
    modalInput.style.display = showInput ? '' : 'none';
    modalOk.textContent = okText;
    modalCancel.textContent = cancelText;
    modalOverlay.classList.remove('hidden');

    if (showInput) {
      setTimeout(() => { modalInput.focus(); modalInput.select(); }, 50);
    } else {
      setTimeout(() => modalOk.focus(), 50);
    }

    function cleanup() {
      modalOverlay.classList.add('hidden');
      modalOk.removeEventListener('click', onOk);
      modalCancel.removeEventListener('click', onCancel);
      modalInput.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onEsc);
      // Re-exibe a BrowserView
      window.api.showActiveView();
    }

    function onOk() {
      cleanup();
      resolve(showInput ? modalInput.value : true);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    function onKey(e) {
      if (e.key === 'Enter') { e.preventDefault(); onOk(); }
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    }

    function onEsc(e) {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    }

    modalOk.addEventListener('click', onOk);
    modalCancel.addEventListener('click', onCancel);
    modalInput.addEventListener('keydown', onKey);
    if (!showInput) document.addEventListener('keydown', onEsc);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function _sanitize(text) {
  const el = document.createElement('span');
  el.textContent = text;
  return el.innerHTML;
}

// ─── Render tabs ─────────────────────────────────────────────────────────────

function renderTabs() {
  tabsContainer.innerHTML = '';

  sessions.forEach((s) => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (s.id === activeSessionId ? ' active' : '');
    tab.dataset.id = s.id;

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = s.displayName || s.name;
    label.title = s.name;

    // Clique → trocar de aba
    label.addEventListener('click', () => switchTab(s.id));

    // Duplo clique → renomear
    label.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      renameTab(s.id);
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Fechar sessão';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(s.id);
    });

    tab.appendChild(label);
    tab.appendChild(closeBtn);
    tabsContainer.appendChild(tab);
  });
}

// ─── Ações ───────────────────────────────────────────────────────────────────

async function switchTab(sessionId) {
  activeSessionId = sessionId;
  renderTabs();
  await window.api.showSession(sessionId);
}

async function addTab() {
  const name = await showModal('Nome da sessão:', `Sessão ${sessions.length + 1}`);
  if (!name || !name.trim()) return;

  const id = generateId();
  sessions.push({ id, name: name.trim(), displayName: name.trim() });
  await window.api.createSession(id, name.trim());
  activeSessionId = id;
  renderTabs();
}

async function closeTab(sessionId) {
  if (sessions.length <= 1) {
    await showModal('Não é possível fechar a última sessão.', null, { showInput: false, cancelText: '' });
    return;
  }
  const sessionName = sessions.find((s) => s.id === sessionId)?.name;
  const ok = await showModal(`Fechar a sessão "${sessionName}"?\nOs dados de login serão mantidos.`, null, { showInput: false, okText: 'Fechar', cancelText: 'Cancelar' });
  if (!ok) return;

  await window.api.removeSession(sessionId);
  sessions = sessions.filter((s) => s.id !== sessionId);

  if (activeSessionId === sessionId) {
    activeSessionId = sessions[0]?.id || null;
    if (activeSessionId) await window.api.showSession(activeSessionId);
  }

  renderTabs();
}

async function renameTab(sessionId) {
  const s = sessions.find((x) => x.id === sessionId);
  if (!s) return;
  const name = await showModal('Novo nome:', s.name);
  if (!name || !name.trim()) return;
  s.name = name.trim();
  s.displayName = name.trim();
  await window.api.renameSession(sessionId, name.trim());
  renderTabs();
}

// ─── Título com badge de não lidos ───────────────────────────────────────────

window.api.onTitleUpdated((sessionId, title) => {
  const s = sessions.find((x) => x.id === sessionId);
  if (!s) return;

  const match = title.match(/\((\d+)\)/);
  s.displayName = match ? `(${match[1]}) ${s.name}` : s.name;
  renderTabs();

  if (sessionId === activeSessionId) {
    document.title = `${title} - Whatsnux`;
  }
});

// ─── Atalhos de teclado ──────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  // Ctrl+T → nova aba
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    addTab();
  }

  // Ctrl+W → fechar aba
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (activeSessionId) closeTab(activeSessionId);
  }

  // Ctrl+R / F5 → recarregar
  if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
    e.preventDefault();
    if (activeSessionId) window.api.reloadSession(activeSessionId);
  }

  // Ctrl+1..9 → aba N
  if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    const idx = parseInt(e.key, 10) - 1;
    if (idx < sessions.length) switchTab(sessions[idx].id);
  }
});

// ─── Init ────────────────────────────────────────────────────────────────────

btnAdd.addEventListener('click', addTab);

(async () => {
  sessions = await window.api.getSessions();
  sessions.forEach((s) => { s.displayName = s.displayName || s.name; });
  activeSessionId = sessions[0]?.id || null;
  renderTabs();
  if (activeSessionId) await window.api.showSession(activeSessionId);
})();
