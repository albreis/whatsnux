const { app, BrowserWindow, BrowserView, session, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const WHATSAPP_URL = 'https://web.whatsapp.com/';
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DATA_DIR = path.join(app.getPath('userData'), 'profiles');
const SESSIONS_FILE = path.join(app.getPath('userData'), 'sessions.json');

let mainWindow = null;
let tray = null;

// ─────────────────────────────────────────────────────────────────────────────
// Persistência de sessões
// ─────────────────────────────────────────────────────────────────────────────

function loadSessionsConfig() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
  } catch { /* ignora */ }
  return [{ id: 'session_default', name: 'Sessão 1' }];
}

function saveSessionsConfig(sessions) {
  fs.mkdirSync(path.dirname(SESSIONS_FILE), { recursive: true });
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Janela principal
// ─────────────────────────────────────────────────────────────────────────────

function createMainWindow() {
  // Remove menu bar completamente
  Menu.setApplicationMenu(null);

  const appIcon = nativeImage.createFromPath(path.join(__dirname, 'icons', 'icon.png'));

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Whatsnux',
    icon: appIcon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');

  mainWindow.on('close', (e) => {
    if (tray && !app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// System Tray
// ─────────────────────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, 'icons', 'icon.png');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // Ícone fallback 16x16 verde
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Whatsnux');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar / Ocultar',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Gerenciamento de BrowserViews (uma por sessão)
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Map<string, Electron.BrowserView>} */
const views = new Map();
let activeViewId = null;

function getPartitionPath(sessionId) {
  return path.join(DATA_DIR, sessionId);
}

function createSessionView(sessionId) {
  const partitionDir = getPartitionPath(sessionId);
  fs.mkdirSync(partitionDir, { recursive: true });

  const ses = session.fromPartition(`persist:${sessionId}`, {
    cache: true,
  });

  // Configura caminhos de armazenamento explícitos para persistir sessão
  if (typeof ses.setStoragePath === 'function') {
    ses.setStoragePath(partitionDir);
  }

  // Configurações de permissão (notificações, mídia, etc.)
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = [
      'notifications',
      'media',
      'mediaKeySystem',
      'geolocation',
      'clipboard-read',
      'clipboard-sanitized-write',
    ];
    callback(allowed.includes(permission));
  });

  ses.setUserAgent(USER_AGENT);

  const view = new BrowserView({
    webPreferences: {
      session: ses,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
    },
  });

  // Abre links externos no navegador padrão
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.includes('whatsapp.com') && !url.includes('whatsapp.net')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  view.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    const isWhatsApp =
      parsed.hostname.includes('whatsapp.com') ||
      parsed.hostname.includes('whatsapp.net');
    if (!isWhatsApp && parsed.protocol !== 'blob:' && parsed.protocol !== 'data:') {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Informa o renderer sobre mudanças de título (para badge de não lidos)
  view.webContents.on('page-title-updated', (_event, title) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('session-title-updated', sessionId, title);
    }
  });

  view.webContents.loadURL(WHATSAPP_URL);
  views.set(sessionId, view);
  return view;
}

function showView(sessionId) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Esconde a view ativa atual
  if (activeViewId && views.has(activeViewId)) {
    mainWindow.removeBrowserView(views.get(activeViewId));
  }

  let view = views.get(sessionId);
  if (!view) {
    view = createSessionView(sessionId);
  }

  mainWindow.addBrowserView(view);
  activeViewId = sessionId;
  resizeActiveView();
}

function resizeActiveView() {
  if (!activeViewId || !views.has(activeViewId) || !mainWindow) return;
  const view = views.get(activeViewId);
  const bounds = mainWindow.getContentBounds();
  // Reserva 42px no topo para a barra de abas do renderer
  const TAB_BAR_HEIGHT = 42;
  view.setBounds({
    x: 0,
    y: TAB_BAR_HEIGHT,
    width: bounds.width,
    height: bounds.height - TAB_BAR_HEIGHT,
  });
}

async function destroyView(sessionId) {
  const view = views.get(sessionId);
  if (!view) return;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeBrowserView(view);
  }

  // Flush completo antes de destruir
  try {
    const ses = view.webContents.session;
    await ses.cookies.flushStore();
    if (ses.flushStorageData) ses.flushStorageData();
  } catch { /* vista já destruída */ }

  view.webContents?.close?.();
  views.delete(sessionId);
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC handlers
// ─────────────────────────────────────────────────────────────────────────────

function setupIPC() {
  // Retorna a lista de sessões salvas
  ipcMain.handle('get-sessions', () => {
    return loadSessionsConfig();
  });

  // Salva a lista de sessões
  ipcMain.handle('save-sessions', (_event, sessions) => {
    saveSessionsConfig(sessions);
  });

  // Mostra uma BrowserView (troca de aba)
  ipcMain.handle('show-session', (_event, sessionId) => {
    showView(sessionId);
  });

  // Cria nova sessão
  ipcMain.handle('create-session', (_event, sessionId, name) => {
    const sessions = loadSessionsConfig();
    sessions.push({ id: sessionId, name });
    saveSessionsConfig(sessions);
    showView(sessionId);
  });

  // Remove sessão
  ipcMain.handle('remove-session', (_event, sessionId) => {
    destroyView(sessionId);
    let sessions = loadSessionsConfig();
    sessions = sessions.filter((s) => s.id !== sessionId);
    saveSessionsConfig(sessions);
  });

  // Rename sessão
  ipcMain.handle('rename-session', (_event, sessionId, newName) => {
    const sessions = loadSessionsConfig();
    const s = sessions.find((x) => x.id === sessionId);
    if (s) s.name = newName;
    saveSessionsConfig(sessions);
  });

  // Recarregar sessão
  ipcMain.handle('reload-session', (_event, sessionId) => {
    const view = views.get(sessionId);
    if (view) view.webContents.reload();
  });

  // Esconde a BrowserView ativa (para mostrar modais no renderer)
  ipcMain.handle('hide-active-view', () => {
    if (activeViewId && views.has(activeViewId) && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.removeBrowserView(views.get(activeViewId));
    }
  });

  // Re-exibe a BrowserView ativa
  ipcMain.handle('show-active-view', () => {
    if (activeViewId && views.has(activeViewId) && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.addBrowserView(views.get(activeViewId));
      resizeActiveView();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Single instance lock
// ─────────────────────────────────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  setupIPC();

  mainWindow.on('resize', resizeActiveView);
  mainWindow.on('maximize', resizeActiveView);
  mainWindow.on('unmaximize', resizeActiveView);

  // Flush periódico de cookies/storage a cada 60 segundos
  setInterval(() => {
    for (const [, view] of views) {
      try {
        view.webContents.session.cookies.flushStore().catch(() => {});
      } catch { /* ignorar */ }
    }
  }, 60_000);

  // Quando o renderer está pronto, ele pede as sessões e chama show-session
});

app.on('before-quit', async () => {
  // Flush de cookies e storage de todas as sessões antes de sair
  const flushPromises = [];
  for (const [, view] of views) {
    try {
      const ses = view.webContents.session;
      flushPromises.push(ses.cookies.flushStore().catch(() => {}));
      flushPromises.push(ses.flushStorageData?.() || Promise.resolve());
    } catch { /* vista já destruída */ }
  }
  await Promise.allSettled(flushPromises);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'linux' || !tray) {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});
