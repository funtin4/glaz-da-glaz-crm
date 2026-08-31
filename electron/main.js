const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const isMac = process.platform === 'darwin';

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    title: 'Glaz Da Glaz CRM',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

function createMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }]
          }
        ]
      : []),
    {
      label: 'Файл',
      submenu: [
        { role: isMac ? 'close' : 'quit', label: isMac ? 'Закрыть' : 'Выход' }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Обновить' },
        { role: 'forceReload', label: 'Обновить полностью' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Масштаб 100%' },
        { role: 'zoomIn', label: 'Увеличить' },
        { role: 'zoomOut', label: 'Уменьшить' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полный экран' }
      ]
    },
    {
      label: 'Помощь',
      submenu: [
        {
          label: 'Напоминание о резервной копии',
          click: (_menuItem, browserWindow) => {
            if (browserWindow) {
              browserWindow.webContents.executeJavaScript(
                "alert('Данные хранятся на этом компьютере. Перед переносом на другой ПК или переустановкой используйте кнопку \"Сохранить базу\".');"
              );
            }
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});
