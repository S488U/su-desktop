const path = require("path");
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const fs = require("fs");
const https = require("https");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        title: 'Dunite Application',
        width: 1000,
        height: 700,
        icon: path.join(__dirname, 'assets', 'win', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        }
    });

    mainWindow.loadURL('https://su.dunite.tech');

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
        mainWindow.loadFile(path.join(__dirname, 'assets', 'error.html'));
    });

    mainWindow.webContents.on('did-finish-load', () => {
        checkForUpdates();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function loadUrl(url, title) {
    mainWindow.setTitle(title);
    mainWindow.loadURL(url);
}

function loadFile(filePath) {
    mainWindow.loadFile(filePath);
}

function createUpdateDialog() {
    let updateWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
        frame: false,
        parent: mainWindow,
        modal: true
    });

    updateWindow.loadFile('updateDialog.html');

    updateWindow.on('closed', () => {
        updateWindow = null;
    });
}

function checkForUpdates() {
    https.get('https://dunite.tech/app/su-dunite-app.json', (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            try {
                const versionInfo = JSON.parse(data);
                const currentVersion = app.getVersion();
                if (versionInfo.version !== currentVersion) {
                    createUpdateDialog();
                }
            } catch (error) {
                console.error('Failed to parse version info:', error.message);
            }
        });
    }).on('error', (err) => {
        console.error('Error checking for updates:', err.message);
    });
}

ipcMain.on('update-app', () => {
    downloadUpdate();
});

ipcMain.on('update-later', () => {
    console.log("User chose to update later.");
});

function downloadUpdate() {
    const file = fs.createWriteStream(path.join(app.getPath("userData"), 'dunite.exe'));

    https.get('https://dunite.tech/app/dunite.exe', (response) => {
        response.pipe(file);

        file.on('finish', () => {
            file.close(() => {
                mainWindow.webContents.send('update-status', 'Download completed. Restarting the application...');
                app.quit();
            });
        });
    }).on('error', (err) => {
        fs.unlinkSync(path.join(app.getPath("userData"), 'dunite.exe'));
        console.error('Error downloading the update:', err.message);
    });
}

const menu = [
    { role: "fileMenu" },
    { label: "Dunite", click: () => loadUrl('https://dunite.tech', 'Dunite') },
    { label: "Study Material", click: () => loadUrl('https://su.dunite.tech', 'SU Study Material | Dunite') },
    { label: "CTF", click: () => loadUrl('https://ctf.dunite.tech/', 'CTF | Dunite') },
    { label: "Base64", click: () => loadUrl('https://ctf.dunite.tech/Base64/', 'Base64 | Dunite') },
    {
        label: "Other Pages",
        submenu: [
            { label: "Project Spot", click: () => loadUrl('https://projectspot.dunite.tech', 'Project Spot | Dunite') },
            { label: "Survey", click: () => loadUrl('https://survey.dunite.tech', 'Survey | Dunite') },
        ],
    },
    {
        label: "About",
        click: () => loadFile(path.join(__dirname, 'assets', 'about.html'))
    }
];

const menuTemplate = Menu.buildFromTemplate(menu);
Menu.setApplicationMenu(menuTemplate);

app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
