// Native
import { autoUpdater } from "electron-updater";
import getPlatform from "./getPlatform";
import { join } from "path";
import log from "electron-log";
import { format } from "url";
import fs from "fs";

import { execPath, modelsPath } from "./binaries";
// Packages
import {
  BrowserWindow,
  app,
  ipcMain,
  dialog,
  shell,
  MessageBoxOptions,
  protocol,
} from "electron";

import prepareNext from "electron-next";
import isDev from "electron-is-dev";
import commands from "./commands";
import { ChildProcessWithoutNullStreams } from "child_process";
import doubleUpscayl from "./utils/listener/doubleUpscayl";
import folderUpscayl from "./utils/listener/folderUpscayl";
import imageUpscayl from "./utils/listener/imageUpscayl";
import customModelsSelect from "./utils/listener/customModelsSelect";
import getModelsList from "./utils/listener/getModelsList";
import selectFile from "./utils/listener/selectFile";
import selectFolder from "./utils/listener/selectFolder";

let childProcesses: {
  process: ChildProcessWithoutNullStreams;
  kill: () => boolean;
}[] = [];

log.initialize({ preload: true });

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

// Path variables for file and folder selection
let imagePath: string | undefined = undefined;
let folderPath: string | undefined = undefined;
let customModelsFolderPath: string | undefined = undefined;
let outputFolderPath: string | undefined = undefined;
let saveOutputFolder = false;
let quality = 100;

let stopped = false;

// Slashes for use in directory names
const slash: string = getPlatform() === "win" ? "\\" : "/";

// Prepare the renderer once the app is ready
let mainWindow: BrowserWindow | null = null;
app.on("ready", async () => {
  await prepareNext("./renderer");

  log.info("🚀 UPSCAYL EXEC PATH: ", execPath(""));
  log.info("🚀 MODELS PATH: ", modelsPath);

  mainWindow = new BrowserWindow({
    icon: join(__dirname, "build", "icon.png"),
    width: 1300,
    height: 940,
    minHeight: 500,
    minWidth: 500,
    show: false,
    backgroundColor: "#171717",
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
      preload: join(__dirname, "preload.js"),
    },
  });
  const url = isDev
    ? "http://localhost:8000"
    : format({
        pathname: join(__dirname, "../renderer/out/index.html"),
        protocol: "file:",
        slashes: true,
      });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(url);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.webContents.setZoomFactor(1);
  });

  app.whenReady().then(() => {
    protocol.registerFileProtocol("file", (request, callback) => {
      const pathname = decodeURI(request.url.replace("file:///", ""));
      callback(pathname);
    });
  });

  if (!isDev) {
    autoUpdater.checkForUpdates();
  }

  // <------------------------Save Last Paths----------------------------->
  // GET LAST IMAGE PATH TO LOCAL STORAGE
  mainWindow.webContents
    .executeJavaScript('localStorage.getItem("lastImagePath");', true)
    .then((lastImagePath: string | null) => {
      if (lastImagePath && lastImagePath.length > 0) {
        imagePath = lastImagePath;
      }
    });
  // GET LAST FOLDER PATH TO LOCAL STORAGE
  mainWindow.webContents
    .executeJavaScript('localStorage.getItem("lastFolderPath");', true)
    .then((lastFolderPath: string | null) => {
      if (lastFolderPath && lastFolderPath.length > 0) {
        folderPath = lastFolderPath;
      }
    });
  // GET LAST CUSTOM MODELS FOLDER PATH TO LOCAL STORAGE
  mainWindow.webContents
    .executeJavaScript(
      'localStorage.getItem("lastCustomModelsFolderPath");',
      true
    )
    .then((lastCustomModelsFolderPath: string | null) => {
      if (lastCustomModelsFolderPath && lastCustomModelsFolderPath.length > 0) {
        customModelsFolderPath = lastCustomModelsFolderPath;
      }
    });
  // GET LAST CUSTOM MODELS FOLDER PATH TO LOCAL STORAGE
  mainWindow.webContents
    .executeJavaScript('localStorage.getItem("lastOutputFolderPath");', true)
    .then((lastOutputFolderPath: string | null) => {
      if (lastOutputFolderPath && lastOutputFolderPath.length > 0) {
        outputFolderPath = lastOutputFolderPath;
      }
    });
  // GET LAST SAVE OUTPUT FOLDER (BOOLEAN) TO LOCAL STORAGE
  mainWindow.webContents
    .executeJavaScript('localStorage.getItem("rememberOutputFolder");', true)
    .then((lastSaveOutputFolder: boolean | null) => {
      if (lastSaveOutputFolder !== null) {
        saveOutputFolder = lastSaveOutputFolder;
      }
    });
  // GET IMAGE QUALITY (NUMBER) TO LOCAL STORAGE
  mainWindow.webContents
    .executeJavaScript('localStorage.getItem("quality");', true)
    .then((lastSavedQuality: string | null) => {
      if (lastSavedQuality !== null) {
        quality = parseInt(lastSavedQuality);
      }
    });
});

// Quit the app once all windows are closed
app.on("window-all-closed", app.quit);

log.log("🚃 App Path: ", app.getAppPath());

const logit = (...args: any) => {
  log.log(...args);
  if (!mainWindow) return;
  mainWindow.webContents.send(commands.LOG, args.join(" "));
};

// Default models
const defaultModels = [
  "realesrgan-x4plus",
  "remacri",
  "ultramix_balanced",
  "ultrasharp",
  "realesrgan-x4plus-anime",
];

// ! DONT FORGET TO RESTART THE APP WHEN YOU CHANGE CODE HERE

//------------------------Get Model Names-----------------------------//
const getModels = (folderPath: string) => {
  let models: string[] = [];
  let isValid = false;

  // READ CUSTOM MODELS FOLDER
  fs.readdirSync(folderPath).forEach((file) => {
    // log.log("Files in Folder: ", file);
    if (
      file.endsWith(".param") ||
      file.endsWith(".PARAM") ||
      file.endsWith(".bin") ||
      file.endsWith(".BIN")
    ) {
      isValid = true;
      const modelName = file.substring(0, file.lastIndexOf(".")) || file;
      if (!models.includes(modelName)) {
        models.push(modelName);
      }
    }
  });

  if (!isValid) {
    logit("❌ Invalid Custom Model Folder Detected");
    const options: MessageBoxOptions = {
      type: "error",
      title: "Invalid Folder",
      message:
        "The selected folder does not contain valid model files. Make sure you select the folder that ONLY contains '.param' and '.bin' files.",
      buttons: ["OK"],
    };
    dialog.showMessageBoxSync(options);
    return null;
  }

  logit("🔎 Detected Custom Models: ", models);
  return models;
};

//------------------------Open Folder-----------------------------//
ipcMain.on(commands.OPEN_FOLDER, async (event, payload) => {
  logit("📂 Opening Folder: ", payload);
  shell.openPath(payload);
});

//------------------------Stop Command-----------------------------//
ipcMain.on(commands.STOP, async (event, payload) => {
  stopped = true;

  childProcesses.forEach((child) => {
    logit("🛑 Stopping Upscaling Process", child.process.pid);
    child.kill();
  });
});

if (mainWindow) {
  selectFolder({
    folderPath,
    logit,
  });
  selectFile({
    mainWindow,
    imagePath,
    logit,
  });
  getModelsList({
    mainWindow,
    customModelsFolderPath,
    logit,
    getModels,
  });
  customModelsSelect({
    mainWindow,
    customModelsFolderPath,
    logit,
    slash,
    getModels,
  });
  imageUpscayl({
    mainWindow,
    slash,
    logit,
    childProcesses,
    stopped,
    modelsPath,
    customModelsFolderPath,
    saveOutputFolder,
    outputFolderPath,
    quality,
    defaultModels,
    folderPath,
  });
  folderUpscayl({
    mainWindow,
    logit,
    childProcesses,
    stopped,
    modelsPath,
    customModelsFolderPath,
    saveOutputFolder,
    outputFolderPath,
    defaultModels,
  });
  doubleUpscayl({
    mainWindow,
    slash,
    logit,
    childProcesses,
    stopped,
    modelsPath,
    customModelsFolderPath,
    saveOutputFolder,
    outputFolderPath,
    quality,
    defaultModels,
  });
}

//------------------------Auto-Update Code-----------------------------//
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.on("update-downloaded", (event) => {
  autoUpdater.autoInstallOnAppQuit = false;
  const dialogOpts: MessageBoxOptions = {
    type: "info",
    buttons: ["Install update", "No Thanks"],
    title: "New Upscayl Update",
    message: event.releaseName as string,
    detail:
      "A new version has been downloaded. Restart the application to apply the updates.",
  };
  logit("✅ Update Downloaded");
  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      autoUpdater.quitAndInstall();
    } else {
      logit("🚫 Update Installation Cancelled");
    }
  });
});
