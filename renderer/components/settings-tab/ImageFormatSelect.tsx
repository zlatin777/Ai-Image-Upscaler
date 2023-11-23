import { noImageProcessingAtom } from "@/atoms/userSettingsAtom";
import { useAtomValue } from "jotai";
import React, { useEffect } from "react";

type ImageFormatSelectProps = {
  batchMode: boolean;
  saveImageAs: string;
  setExportType: (arg: string) => void;
};

export function ImageFormatSelect({
  batchMode,
  saveImageAs,
  setExportType,
}: ImageFormatSelectProps) {
  const noImageProcessing = useAtomValue(noImageProcessingAtom);

  useEffect(() => {
    if (noImageProcessing) {
      setExportType("png");
    }
  }, [noImageProcessing]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-1">
        <p className="text-sm font-medium">SAVE IMAGE AS</p>
        {/* <p className="badge-primary badge text-[10px] font-medium">
          EXPERIMENTAL
        </p> */}
      </div>
      <div className="flex flex-col gap-2">
        {batchMode && <p className="text-xs text-base-content/80"></p>}
        {noImageProcessing && (
          <p className="text-xs text-base-content/80">
            {batchMode && "Only PNG is supported in Batch Upscayl."} Only PNGs
            are saved without image processing to preserve image quality.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {/* PNG */}
          <button
            className={`btn ${saveImageAs === "png" && "btn-primary"}`}
            onClick={() => setExportType("png")}>
            PNG
          </button>
          {/* JPG */}
          <button
            className={`btn ${saveImageAs === "jpg" && "btn-primary"}`}
            onClick={() => setExportType("jpg")}
            disabled={noImageProcessing}>
            JPG
          </button>
          {/* WEBP
          <button
            className={`btn ${
              saveImageAs === "webp" && "btn-primary"
            }`}
            onClick={() => setExportType("webp")}>
            WEBP
          </button> */}
        </div>
      </div>
    </div>
  );
}
