# Whatsnux

[![Release](https://img.shields.io/github/v/release/whatsnux/whatsnux?style=flat-square)](https://github.com/whatsnux/whatsnux/releases/latest)
[![License](https://img.shields.io/github/license/whatsnux/whatsnux?style=flat-square)](LICENSE)

Wrapper desktop para o [WhatsApp Web](https://web.whatsapp.com/) com suporte a **múltiplas sessões simultâneas**.  
Cada sessão é isolada (cookies/dados separados), permitindo múltiplas contas ao mesmo tempo.

## Downloads

| Formato | Download |
|---------|----------|
| **AppImage** | [Última release](https://github.com/whatsnux/whatsnux/releases/latest) |
| **.deb** (Debian/Ubuntu) | [Última release](https://github.com/whatsnux/whatsnux/releases/latest) |
| **.rpm** (Fedora/openSUSE) | [Última release](https://github.com/whatsnux/whatsnux/releases/latest) |
| **Snap Store** | `sudo snap install whatsnux` |
| **Flathub** | _em breve_ |
| **Windows Installer** | [Última release](https://github.com/whatsnux/whatsnux/releases/latest) |
| **Windows Portable** | [Última release](https://github.com/whatsnux/whatsnux/releases/latest) |

## Versão Electron

### Requisitos

- **Node.js** >= 18

### Executar

```bash
cd electron
npm install
npm start
```

### Build (AppImage / .deb / .rpm / .snap)

```bash
cd electron
npm run build:linux     # Todos os formatos Linux
npm run build:appimage  # Apenas AppImage
npm run build:deb       # Apenas .deb
npm run build:rpm       # Apenas .rpm
npm run build:snap      # Apenas .snap
npm run build:win       # Windows (NSIS + portable)
```

Os artefatos ficam em `electron/dist/`.

---

## Versão Qt (C++)

### Requisitos (Ubuntu/Debian)

```bash
# Qt 5
sudo apt install qtwebengine5-dev cmake build-essential

# Qt 6
sudo apt install qt6-webengine-dev cmake build-essential
```

### Compilar e executar

```bash
cd qt
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -j$(nproc)
./whatsnux
```

---

## Funcionalidades (ambas versões)

- **Múltiplas sessões** em abas separadas
- **Login persistente** entre reinicializações
- **Notificações** aceitas automaticamente
- **System tray** — minimiza para bandeja
- **Links externos** abertos no navegador padrão
- **Badge de não lidos** no título da aba

## Atalhos

| Atalho | Ação |
|--------|------|
| `Ctrl+T` | Nova sessão |
| `Ctrl+W` | Fechar aba |
| `Ctrl+1..9` | Ir para aba N |
| `F5` / `Ctrl+R` | Recarregar |
| Duplo clique na aba | Renomear |
Comment=WhatsApp Web multi-sessão
Exec=whatsnux
Icon=internet-chat
Categories=Network;InstantMessaging;
StartupWMClass=whatsnux
```
