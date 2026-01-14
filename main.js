const { app, BrowserWindow, Menu, ipcMain, shell, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const axios = require("axios");

// Force Dark Theme for native interfaces (Menus, etc.)
nativeTheme.themeSource = 'dark';

// --- Configuration ---
const APP_URL = 'https://plexaur.com';
const VERSION_JSON_URL = 'https://blog.plexaur.com/app/package-version.json';

let mainWindow;
let updateWindow;
let updateUrl = ''; // Stores the URL found in the JSON

// --- Helpers ---
function getIconPath() {
    if (process.platform === 'win32') {
        return path.join(__dirname, 'assets', 'win', 'icon.ico');
    }
    // Linux/Mac usually prefer png or icns
    if (process.platform === 'darwin') {
        return path.join(__dirname, 'assets', 'mac', 'icon.icns');
    }
    return path.join(__dirname, 'assets', 'linux', 'icon.png'); // Fallback or specific linux path
}

// --- 1. Main Window ---
function createWindow() {
    mainWindow = new BrowserWindow({
        title: 'Plexaur Application',
        width: 1200,
        height: 800,
        show: false, // Don't show until ready
        icon: getIconPath(),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadURL(APP_URL);

    // Show window only when content is ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        checkForUpdates(); // Check for updates only once when window is ready
    });

    // Open external links in Default Browser (Chrome/Firefox)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    mainWindow.webContents.on('did-fail-load', () => {
        mainWindow.loadFile(path.join(__dirname, 'assets', 'error.html'));
        mainWindow.show(); // Ensure window shows even if loading fails
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- 2. Update Dialog ---
function createUpdateDialog() {
    if (updateWindow) return; // Prevent duplicates

    updateWindow = new BrowserWindow({
        width: 450,
        height: 350,
        resizable: false,
        parent: mainWindow,
        modal: true,
        frame: false,
        transparent: true, // Required for rounded corners/transparency
        show: false, // Don't show until ready
        icon: getIconPath(),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Use absolute path to ensure it loads correctly in packaged app
    updateWindow.loadFile(path.join(__dirname, 'updateDialog.html'));

    updateWindow.once('ready-to-show', () => {
        updateWindow.show();
    });

    updateWindow.on('closed', () => {
        updateWindow = null;
    });
}

// --- 3. IPC Handlers ---

ipcMain.on('update-later', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
});

ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
});

ipcMain.on('update-app', () => {
    // Platform Specific Logic
    if (process.platform === 'win32') {
        // Windows: Auto-download and install
        downloadUpdateForWindows();
    } else {
        // Linux (Debian, Arch, AppImage): Open Browser
        // We cannot reliably know if they need .deb, .pacman or .AppImage automatically
        // so we send them to the download page.
        if (updateUrl) {
            shell.openExternal(updateUrl);
        }
        if (updateWindow) updateWindow.close();
    }
});

// --- 4. Update Logic ---

async function checkForUpdates() {
    try {
        const response = await axios.get(VERSION_JSON_URL);
        const versionInfo = response.data;
        const currentVersion = app.getVersion();

        if (versionInfo.version !== currentVersion) {
            // Store the URLs based on platform
            if (process.platform === 'win32') {
                updateUrl = versionInfo.win_url;
            } else {
                updateUrl = versionInfo.url;
            }
            createUpdateDialog();
        }
    } catch (error) {
        console.error('Update Check Error:', error.message);
    }
}

async function downloadUpdateForWindows() {
    if (updateWindow) updateWindow.webContents.send('update-status', 'Downloading update...');

    const destPath = path.join(os.tmpdir(), 'plexaur-setup.exe');

    try {
        const response = await axios({
            method: 'get',
            url: updateUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            if (updateWindow) updateWindow.webContents.send('update-status', 'Installing...');
            // Run the EXE
            shell.openPath(destPath).then(() => {
                setTimeout(() => app.quit(), 1000);
            });
        });

        writer.on('error', (err) => {
            console.error("File write error", err);
            if (updateWindow) updateWindow.webContents.send('update-status', 'Error saving file.');
        });

    } catch (error) {
        console.error("Download error", error);
        if (updateWindow) updateWindow.webContents.send('update-status', 'Error downloading.');
    }
}

// --- 5. Menus ---
function loadUrl(url) {
    if (mainWindow) mainWindow.loadURL(url);
}

const menuTemplate = [
    { role: "fileMenu" },
    { label: "Plexaur", click: () => loadUrl('https://plexaur.com') },
    { label: "Blog", click: () => loadUrl('https://blog.plexaur.com') },
    { label: "CTF", click: () => loadUrl('https://ctf.plexaur.com/') },
    {
        label: "Tools",
        submenu: [
            { label: "Base64", click: () => loadUrl('https://ctf.plexaur.com/base64') },
            { label: "Edit Images", click: () => loadUrl('https://ctf.plexaur.com/invert') },
            { label: "PCAP/CAP inspector", click: () => loadUrl('https://ctf.plexaur.com/pcap') },
            { label: "OCR", click: () => loadUrl('https://ocr.plexaur.com/') },
            { label: "Steganography", click: () => loadUrl('https://ctf.plexaur.com/steg') },
            { label: "PDF Merger", click: () => loadUrl('https://pdf.plexaur.com/') },
        ],
    },
    {
        label: "Help",
        submenu: [
            {
                label: "About",
                click: () => mainWindow.loadFile(path.join(__dirname, 'assets', 'about.html'))
            }
        ]
    }
];

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

// --- 6. App Lifecycle ---
app.on('ready', createWindow);

app.on('window-all-closed', () => {
    // On Mac, it's common to keep app active, but for this app we quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});