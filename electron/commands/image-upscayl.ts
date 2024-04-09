import fs from "fs";
import { modelsPath } from "../utils/get-resource-paths";
import COMMAND from "../../common/commands";
import {
  savedCompression,
  savedCustomModelsPath,
  customWidth,
  savedBatchUpscaylFolderPath,
  noImageProcessing,
  savedOutputPath,
  rememberOutputFolder,
  setChildProcesses,
  setCompression,
  setNoImageProcessing,
  setStopped,
  stopped,
  useCustomWidth,
} from "../utils/config-variables";
import { getSingleImageArguments } from "../utils/get-arguments";
import logit from "../utils/logit";
import slash from "../utils/slash";
import { spawnUpscayl } from "../utils/spawn-upscayl";
import { parse } from "path";
import { getMainWindow } from "../main-window";
import { ImageUpscaylPayload } from "../../common/types/types";
import { ImageFormat } from "../utils/types";
import getModelScale from "../../common/check-model-scale";
import showNotification from "../utils/show-notification";
import { DEFAULT_MODELS } from "../../common/models-list";

const imageUpscayl = async (event, payload: ImageUpscaylPayload) => {
  const mainWindow = getMainWindow();

  if (!mainWindow) {
    logit("No main window found");
    return;
  }

  setNoImageProcessing(payload.noImageProcessing);
  setCompression(parseInt(payload.compression));

  // GET VARIABLES
  const model = payload.model as string;
  const gpuId = payload.gpuId as string;
  const saveImageAs = payload.saveImageAs as ImageFormat;
  const overwrite = payload.overwrite as boolean;
  let inputDir = (payload.imagePath.match(/(.*)[\/\\]/)?.[1] || "") as string;
  let outputDir: string | undefined =
    savedBatchUpscaylFolderPath || (payload.outputPath as string);
  if (
    rememberOutputFolder === true &&
    savedOutputPath &&
    savedOutputPath?.length > 0
  ) {
    logit("🧠 Using saved output path");
    outputDir = savedOutputPath;
  }
  const isDefaultModel = DEFAULT_MODELS.includes(model);
  logit("Is Default Model? : ", isDefaultModel);
  const fullfileName = payload.imagePath.replace(/^.*[\\\/]/, "") as string;
  const fileName = parse(fullfileName).name;
  const fileExt = parse(fullfileName).ext;
  const desiredScale = useCustomWidth
    ? customWidth || payload.scale
    : payload.scale;

  const outFile =
    outputDir +
    slash +
    fileName +
    "_upscayl_" +
    desiredScale +
    (useCustomWidth ? "px_" : "x_") +
    model +
    "." +
    saveImageAs;

  // UPSCALE
  if (fs.existsSync(outFile) && !overwrite) {
    // If already upscayled, just output that file
    logit("✅ Already upscayled at: ", outFile);
    mainWindow.webContents.send(
      COMMAND.UPSCAYL_DONE,
      outFile.replace(
        /([^/\\]+)$/i,
        encodeURIComponent(outFile.match(/[^/\\]+$/i)![0]),
      ),
    );
  } else {
    logit(
      "✅ Upscayl Variables: ",
      JSON.stringify({
        model,
        gpuId,
        saveImageAs,
        inputDir,
        outputDir,
        fullfileName,
        fileName,
        scale: desiredScale,
        desiredScale,
        outFile,
        compression: savedCompression,
      }),
    );
    const upscayl = spawnUpscayl(
      getSingleImageArguments({
        inputDir,
        fullfileName,
        outFile,
        modelsPath: isDefaultModel
          ? modelsPath
          : savedCustomModelsPath ?? modelsPath,
        model,
        scale: desiredScale,
        gpuId,
        saveImageAs,
      }),
      logit,
    );

    setChildProcesses(upscayl);

    setStopped(false);
    let isAlpha = false;
    let failed = false;

    const onData = (data: string) => {
      logit("image upscayl: ", data.toString());
      mainWindow.setProgressBar(parseFloat(data.slice(0, data.length)) / 100);
      data = data.toString();
      mainWindow.webContents.send(COMMAND.UPSCAYL_PROGRESS, data.toString());
      if (data.includes("invalid gpu") || data.includes("failed")) {
        logit("❌ INVALID GPU OR FAILED");
        upscayl.kill();
        failed = true;
      }
      if (data.includes("has alpha channel")) {
        logit("📢 INCLUDES ALPHA CHANNEL, CHANGING OUTFILE NAME!");
        isAlpha = true;
      }
    };
    const onError = (data) => {
      if (!mainWindow) return;
      mainWindow.setProgressBar(-1);
      mainWindow.webContents.send(COMMAND.UPSCAYL_PROGRESS, data.toString());
      failed = true;
      upscayl.kill();
      return;
    };
    const onClose = async () => {
      if (!failed && !stopped) {
        logit("💯 Done upscaling");
        logit("♻ Scaling and converting now...");
        if (noImageProcessing) {
          logit("🚫 Skipping scaling and converting");
          mainWindow.setProgressBar(-1);
          mainWindow.webContents.send(
            COMMAND.UPSCAYL_DONE,
            outFile.replace(
              /([^/\\]+)$/i,
              encodeURIComponent(outFile.match(/[^/\\]+$/i)![0]),
            ),
          );
          return;
        }
        mainWindow.webContents.send(COMMAND.SCALING_AND_CONVERTING);
        // Free up memory
        upscayl.kill();
        try {
          mainWindow.setProgressBar(-1);
          mainWindow.webContents.send(
            COMMAND.UPSCAYL_DONE,
            outFile.replace(
              /([^/\\]+)$/i,
              encodeURIComponent(outFile.match(/[^/\\]+$/i)![0]),
            ),
          );
          showNotification("Upscayl", "Image upscayled successfully!");
        } catch (error) {
          logit(
            "❌ Error processing (scaling and converting) the image. Please report this error on GitHub.",
            error,
          );
          upscayl.kill();
          mainWindow.webContents.send(
            COMMAND.UPSCAYL_ERROR,
            "Error processing (scaling and converting) the image. Please report this error on Upscayl GitHub Issues page.\n" +
              error,
          );
          showNotification("Upscayl Failure", "Failed to upscale image!");
        }
      }
    };

    upscayl.process.stderr.on("data", onData);
    upscayl.process.on("error", onError);
    upscayl.process.on("close", onClose);
  }
};

export default imageUpscayl;
