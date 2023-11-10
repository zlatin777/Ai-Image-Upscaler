import { useAtom, useAtomValue } from "jotai";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { Tooltip } from "react-tooltip";
import { themeChange } from "theme-change";
import { modelsListAtom } from "../../../atoms/modelsListAtom";
import useLog from "../../hooks/useLog";
import {
  noImageProcessingAtom,
  outputPathAtom,
  progressAtom,
  scaleAtom,
} from "../../../atoms/userSettingsAtom";
import { featureFlags } from "@common/feature-flags";

interface IProps {
  selectImageHandler: () => Promise<void>;
  selectFolderHandler: () => Promise<void>;
  handleModelChange: (e: any) => void;
  outputHandler: () => Promise<void>;
  upscaylHandler: () => Promise<void>;
  batchMode: boolean;
  setBatchMode: React.Dispatch<React.SetStateAction<boolean>>;
  imagePath: string;
  doubleUpscayl: boolean;
  setDoubleUpscayl: React.Dispatch<React.SetStateAction<boolean>>;
  dimensions: {
    width: number | null;
    height: number | null;
  };
  setSaveImageAs: React.Dispatch<React.SetStateAction<string>>;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  setGpuId: React.Dispatch<React.SetStateAction<string>>;
}

function LeftPaneImageSteps({
  selectImageHandler,
  selectFolderHandler,
  handleModelChange,
  outputHandler,
  upscaylHandler,
  batchMode,
  setBatchMode,
  imagePath,
  doubleUpscayl,
  setDoubleUpscayl,
  dimensions,
  setSaveImageAs,
  model,
  setModel,
  setGpuId,
}: IProps) {
  const [currentModel, setCurrentModel] = useState<{
    label: string;
    value: string;
  }>({
    label: null,
    value: null,
  });

  const modelOptions = useAtomValue(modelsListAtom);
  const scale = useAtomValue(scaleAtom);
  const noImageProcessing = useAtomValue(noImageProcessingAtom);
  const [outputPath, setOutputPath] = useAtom(outputPathAtom);
  const [progress, setProgress] = useAtom(progressAtom);

  const { logit } = useLog();

  useEffect(() => {
    themeChange(false);

    if (!localStorage.getItem("saveImageAs")) {
      logit("⚙️ Setting saveImageAs to png");
      localStorage.setItem("saveImageAs", "png");
    } else {
      const currentlySavedImageFormat = localStorage.getItem("saveImageAs");
      logit(
        "⚙️ Getting saveImageAs from localStorage: ",
        currentlySavedImageFormat
      );
      setSaveImageAs(currentlySavedImageFormat);
    }

    if (!localStorage.getItem("model")) {
      setCurrentModel(modelOptions[0]);
      setModel(modelOptions[0].value);
      localStorage.setItem("model", JSON.stringify(modelOptions[0]));
      logit("🔀 Setting model to", modelOptions[0].value);
    } else {
      const currentlySavedModel = JSON.parse(
        localStorage.getItem("model")
      ) as (typeof modelOptions)[0];
      setCurrentModel(currentlySavedModel);
      setModel(currentlySavedModel.value);
      logit(
        "⚙️ Getting model from localStorage: ",
        JSON.stringify(currentlySavedModel)
      );
    }

    if (!localStorage.getItem("gpuId")) {
      localStorage.setItem("gpuId", "");
      logit("⚙️ Setting gpuId to empty string");
    } else {
      const currentlySavedGpuId = localStorage.getItem("gpuId");
      setGpuId(currentlySavedGpuId);
      logit("⚙️ Getting gpuId from localStorage: ", currentlySavedGpuId);
    }
  }, []);

  useEffect(() => {
    logit("🔀 Setting model to", currentModel.value);
  }, [currentModel]);

  const getUpscaleResolution = useCallback(() => {
    const newDimensions = {
      width: dimensions.width,
      height: dimensions.height,
    };

    let doubleScale = parseInt(scale) * parseInt(scale);
    let singleScale = parseInt(scale);

    if (noImageProcessing) {
      let initialScale = 4;
      if (model.includes("x1")) {
        initialScale = 1;
      } else if (model.includes("x2")) {
        initialScale = 2;
      } else if (model.includes("x3")) {
        initialScale = 3;
      } else {
        initialScale = 4;
      }
      doubleScale = initialScale * initialScale;
      singleScale = initialScale;
    }

    if (doubleUpscayl) {
      const newWidth = dimensions.width * doubleScale;
      const newHeight = dimensions.height * doubleScale;
      if (newWidth < 32768 || newHeight < 32768) {
        newDimensions.width = newWidth;
        newDimensions.height = newHeight;
      } else {
        newDimensions.width = 32384;
        newDimensions.height = 32384;
      }
    } else {
      newDimensions.width = dimensions.width * singleScale;
      newDimensions.height = dimensions.height * singleScale;
    }

    return newDimensions;
  }, [dimensions.width, dimensions.height, doubleUpscayl, scale]);

  return (
    <div
      className={`animate-step-in animate flex h-screen flex-col gap-7 overflow-y-auto p-5 overflow-x-hidden`}>
      {/* BATCH OPTION */}
      <div className="flex flex-row items-center gap-2">
        <input
          type="checkbox"
          className="toggle"
          defaultChecked={batchMode}
          onClick={() => {
            setOutputPath("");
            setProgress("");
            setBatchMode((oldValue) => !oldValue);
          }}></input>
        <p
          className="mr-1 inline-block cursor-help text-sm"
          data-tooltip-id="tooltip"
          data-tooltip-content="This will let you Upscayl all files in a folder at once">
          Batch Upscayl
        </p>
      </div>

      {/* STEP 1 */}
      <div data-tooltip-id="tooltip" data-tooltip-content={imagePath}>
        <p className="step-heading">Step 1</p>
        <button
          className="btn-primary btn"
          onClick={!batchMode ? selectImageHandler : selectFolderHandler}>
          Select {batchMode ? "Folder" : "Image"}
        </button>
      </div>

      {/* STEP 2 */}
      <div className="animate-step-in group">
        <p className="step-heading">Step 2</p>
        <p className="mb-2 text-sm">Select Model</p>

        <Select
          options={modelOptions}
          components={{
            IndicatorSeparator: () => null,
            DropdownIndicator: () => null,
          }}
          onChange={(e) => {
            handleModelChange(e);
            setCurrentModel({ label: e.label, value: e.value });
          }}
          className="react-select-container group-active:w-full focus:w-full group-hover:w-full transition-all"
          classNamePrefix="react-select"
          value={currentModel}
        />

        {!batchMode && (
          <div className="mt-4 flex items-center gap-1">
            <input
              type="checkbox"
              className="checkbox"
              checked={doubleUpscayl}
              onChange={(e) => {
                if (e.target.checked) {
                  setDoubleUpscayl(true);
                } else {
                  setDoubleUpscayl(false);
                }
              }}
            />
            <p
              className="cursor-pointer text-sm"
              onClick={(e) => {
                setDoubleUpscayl(!doubleUpscayl);
              }}>
              Double Upscayl
            </p>
            <button
              className="badge-info badge cursor-help"
              data-tooltip-id="tooltip"
              data-tooltip-content="Enable this option to get a 16x upscayl (we just run upscayl twice). Note that this may not always work properly with all images, for example, images with really large resolutions.">
              i
            </button>
          </div>
        )}
      </div>

      {/* STEP 3 */}
      <div
        className="animate-step-in"
        data-tooltip-content={outputPath}
        data-tooltip-id="tooltip">
        <div className="step-heading flex items-center gap-2">
          <span>Step 3</span>
          {!outputPath && featureFlags.APP_STORE_BUILD && (
            <div className="text-xs">
              <span className="bg-base-200 font-medium uppercase text-base-content/50 rounded-btn px-2">
                Not selected
              </span>
            </div>
          )}
        </div>
        {!batchMode && !featureFlags.APP_STORE_BUILD && (
          <p className="mb-2 text-sm">
            Defaults to {!batchMode ? "Image's" : "Folder's"} path
          </p>
        )}
        <button className="btn-primary btn" onClick={outputHandler}>
          Set Output Folder
        </button>
      </div>

      {/* STEP 4 */}
      <div className="animate-step-in">
        <p className="step-heading">Step 4</p>
        {dimensions.width && dimensions.height && (
          <p className="mb-2 text-sm">
            Upscayl from{" "}
            <span className="font-bold">
              {dimensions.width}x{dimensions.height}
            </span>{" "}
            to{" "}
            <span className="font-bold">
              {getUpscaleResolution().width}x{getUpscaleResolution().height}
            </span>
          </p>
        )}
        <button
          className="btn-accent btn"
          onClick={
            progress.length > 0 || !outputPath
              ? () => alert("Please select an output folder first")
              : upscaylHandler
          }>
          {progress.length > 0 ? "Upscayling⏳" : "Upscayl"}
        </button>
      </div>

      <Tooltip className="max-w-sm" id="tooltip" />
    </div>
  );
}

export default LeftPaneImageSteps;
