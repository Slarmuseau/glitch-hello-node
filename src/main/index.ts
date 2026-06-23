import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { openDatabase } from './db/database'
import { isGeinitialiseerd, markGeinitialiseerd } from './db/repo'
import { seedDemoData } from './services/seed'
import { registerIpc } from './ipc'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'Tapwijs',
    backgroundColor: '#fbf7f1',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('be.tothemoonandback.tapwijs')

  // Open the local SQLite database in the OS user-data folder, which the owner
  // can find and back up. Seed the demo once on a fresh install.
  const dbPath = join(app.getPath('userData'), 'tapwijs.sqlite')
  openDatabase(dbPath)
  if (!isGeinitialiseerd()) {
    try {
      seedDemoData()
    } catch (e) {
      console.error('Demo seed mislukt:', e)
    }
    markGeinitialiseerd()
  }

  registerIpc()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
