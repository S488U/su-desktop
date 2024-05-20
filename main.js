const path = require("path");
const { app, BrowserWindow, Menu, dialog } = require("electron");

let windowCounters = {
  suWindow: 0,
  duploaderWindow: 0,
  projectSpotWindow: 0,
  surveyWindow: 0,
  CTFWindow: 0,
  base64Window: 0
};

const MAX_INSTANCES = 4;

function createWindow(type, url, title) {
  if (windowCounters[type] >= MAX_INSTANCES) {
    dialog.showErrorBox("Window Limit Reached", `You have opened enough ${title} windows.`);
    return;
  }

  const window = new BrowserWindow({
    title: title,
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'assets', 'win', 'icon.ico')
  });

  window.loadURL(url);
  window.on('closed', () => {
    windowCounters[type]--;
  });

  windowCounters[type]++;
}

// Create the SU Duploader Main Window
function createSuWindow() {
  createWindow('suWindow', 'https://su.duploader.tech', 'SU Study Material | Duploader');
}

// Create Duploader Window
function createDuploadertWindow() {
  createWindow('duploaderWindow', 'https://duploader.tech', 'Duploader');
}

// Create Project Spot Window
function createProjectSpotWindow() {
  createWindow('projectSpotWindow', 'https://projectspot.duploader.tech', 'Project Spot | Duploader');
}

// Create Survey Window
function createSurveyWindow() {
  createWindow('surveyWindow', 'https://survey.duploader.tech', 'Survey | Duploader');
}

// Create CTF Window
function createCTFWindow() {
  createWindow('CTFWindow', 'https://ctf.duploader.tech/', 'CTF | Duploader');
}

// Create Base64 Window
function createBase64Window() {
  createWindow('base64Window', 'https://ctf.duploader.tech/Base64/', 'Base64 | Duploader');
}

const menu = [
  {
    role: "fileMenu",
  },
  {
    label: "Duploader",
    click: createDuploadertWindow,
  },
  {
    label: "CTF",
    click: createCTFWindow,
  },
  {
    label: "Base64",
    click: createBase64Window,
  },
  {
    label: "Other Pages",
    submenu: [
      {
        label: "Project Spot",
        click: createProjectSpotWindow,
      },
      {
        label: "Survey",
        click: createSurveyWindow,
      },
    ],
  },
];

const menuTemplate = Menu.buildFromTemplate(menu);
Menu.setApplicationMenu(menuTemplate);

app.on('ready', createSuWindow);

app.on('window-all-closed', () => {
  if (!app.isQuiting) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSuWindow();
  }
});
