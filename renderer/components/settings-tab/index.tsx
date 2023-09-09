import { ThemeSelect } from "./ThemeSelect";
import { SaveOutputFolderToggle } from "./SaveOutputFolderToggle";
import { GpuIdInput } from "./GpuIdInput";
import { CustomModelsFolderSelect } from "./CustomModelsFolderSelect";
import { LogArea } from "./LogArea";
import { ImageScaleSelect } from "./ImageScaleSelect";
import { ImageFormatSelect } from "./ImageFormatSelect";
import { DonateButton } from "./DonateButton";
import React, { useEffect, useState } from "react";
import { themeChange } from "theme-change";
import { useAtom, useAtomValue } from "jotai";
import { customModelsPathAtom, scaleAtom } from "../../atoms/userSettingsAtom";
import { modelsListAtom } from "../../atoms/modelsListAtom";
import useLog from "../hooks/useLog";
import { QualityInput } from "./QualityInput";
import ToggleOverwrite from "./ToggleOverwrite";
import { UpscaylCloudModal } from "../UpscaylCloudModal";
import { ResetSettings } from "./ResetSettings";

interface IProps {
  batchMode: boolean;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  saveImageAs: string;
  setSaveImageAs: React.Dispatch<React.SetStateAction<string>>;
  quality: number;
  setQuality: React.Dispatch<React.SetStateAction<number>>;
  gpuId: string;
  setGpuId: React.Dispatch<React.SetStateAction<string>>;
  logData: string[];
  overwrite: boolean;
  setOverwrite: (arg: any) => void;
  os: "linux" | "mac" | "win" | undefined;
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  setDontShowCloudModal: React.Dispatch<React.SetStateAction<boolean>>;
}

function SettingsTab({
  batchMode,
  setModel,
  quality,
  setQuality,
  gpuId,
  setGpuId,
  saveImageAs,
  setSaveImageAs,
  logData,
  overwrite,
  setOverwrite,
  os,
  show,
  setShow,
  setDontShowCloudModal,
}: IProps) {
  // STATES
  const [currentModel, setCurrentModel] = useState<{
    label: string;
    value: string;
  }>({
    label: null,
    value: null,
  });
  const [rememberOutputFolder, setRememberOutputFolder] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [customModelsPath, setCustomModelsPath] = useAtom(customModelsPathAtom);
  const modelOptions = useAtomValue(modelsListAtom);
  const [scale, setScale] = useAtom(scaleAtom);

  const { logit } = useLog();

  useEffect(() => {
    themeChange(false);

    if (!localStorage.getItem("saveImageAs")) {
      logit("⚙️ Setting saveImageAs to png");
      localStorage.setItem("saveImageAs", "png");
    } else {
      const currentlySavedImageFormat = localStorage.getItem("saveImageAs");
      logit(
        "⚙️ Getting saveImageAs from localStorage",
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
        "⚙️ Getting model from localStorage",
        JSON.stringify(currentlySavedModel)
      );
    }

    if (!localStorage.getItem("gpuId")) {
      localStorage.setItem("gpuId", "");
      logit("⚙️ Setting gpuId to empty string");
    } else {
      const currentlySavedGpuId = localStorage.getItem("gpuId");
      setGpuId(currentlySavedGpuId);
      logit("⚙️ Getting gpuId from localStorage", currentlySavedGpuId);
    }

    if (!localStorage.getItem("rememberOutputFolder")) {
      logit("⚙️ Setting rememberOutputFolder to false");
      localStorage.setItem("rememberOutputFolder", "false");
    } else {
      const currentlySavedRememberOutputFolder = localStorage.getItem(
        "rememberOutputFolder"
      );
      logit(
        "⚙️ Getting rememberOutputFolder from localStorage",
        currentlySavedRememberOutputFolder
      );
      setRememberOutputFolder(
        currentlySavedRememberOutputFolder === "true" ? true : false
      );
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("quality")) {
      logit("⚙️ Setting quality to 100%");
      localStorage.setItem("quality", JSON.stringify(quality));
    } else {
      const currentlySavedQuality = localStorage.getItem("quality");
      logit("⚙️ Getting quality from localStorage", quality);
      if (currentlySavedQuality) {
        setQuality(JSON.parse(currentlySavedQuality));
      }
    }
  }, []);

  // HANDLERS
  const setExportType = (format: string) => {
    setSaveImageAs(format);
    localStorage.setItem("saveImageAs", format);
  };

  const handleQualityChange = (e) => {
    setQuality(e.target.value);
    localStorage.setItem("quality", e.target.value);
  };

  const handleGpuIdChange = (e) => {
    setGpuId(e.target.value);
    localStorage.setItem("gpuId", e.target.value);
  };

  const copyOnClickHandler = () => {
    navigator.clipboard.writeText(logData.join("\n"));
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="animate-step-in animate flex h-screen flex-col gap-7 overflow-y-auto p-5 overflow-x-hidden">
      <div className="flex flex-col gap-2 text-sm font-medium">
        <p>Having issues?</p>
        <a
          className="btn-primary btn"
          href="https://github.com/upscayl/upscayl/wiki/"
          target="_blank">
          Read Wiki Guide
        </a>
        <DonateButton />
      </div>

      <LogArea
        copyOnClickHandler={copyOnClickHandler}
        isCopied={isCopied}
        logData={logData}
      />

      {/* THEME SELECTOR */}
      <ThemeSelect />

      {/* IMAGE FORMAT BUTTONS */}
      <ImageFormatSelect
        batchMode={batchMode}
        saveImageAs={saveImageAs}
        setExportType={setExportType}
      />

      {/* IMAGE SCALE */}
      <ImageScaleSelect scale={scale} setScale={setScale} />

      <QualityInput
        quality={quality}
        handleQualityChange={handleQualityChange}
      />

      <SaveOutputFolderToggle
        rememberOutputFolder={rememberOutputFolder}
        setRememberOutputFolder={setRememberOutputFolder}
      />

      <ToggleOverwrite overwrite={overwrite} setOverwrite={setOverwrite} />

      {/* GPU ID INPUT */}
      <GpuIdInput gpuId={gpuId} handleGpuIdChange={handleGpuIdChange} />

      {/* CUSTOM MODEL */}
      <CustomModelsFolderSelect
        customModelsPath={customModelsPath}
        setCustomModelsPath={setCustomModelsPath}
      />

      {/* RESET SETTINGS */}
      <ResetSettings />

      <button
        className="mb-5 rounded-btn p-1 mx-5 bg-success shadow-lg shadow-success/40 text-slate-50 animate-pulse text-sm"
        onClick={() => {
          setShow(true);
        }}>
        Introducing Upscayl Cloud
      </button>

      <UpscaylCloudModal
        show={show}
        setShow={setShow}
        setDontShowCloudModal={setDontShowCloudModal}
      />
    </div>
  );
}

export default SettingsTab;
