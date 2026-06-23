"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";
import {
  DropdownPortal,
  DropdownRoot,
  DropdownTrigger,
  VegaDropdownContent,
  VegaDropdownItem,
} from "@/components/ui/VegaDropdownMenu";
import { Check, ChevronDown } from "lucide-react";

function renderLabel(device, fallback) {
  return device?.label || fallback;
}

function OverlayDeviceSelect({
  value,
  options,
  placeholder,
  onChange,
  ariaLabel,
  rtl = false,
}) {
  const current = options.find((option) => option.value === value);
  const label = current?.label ?? placeholder;

  return (
    <DropdownRoot dir={rtl ? "rtl" : "ltr"}>
      <DropdownTrigger asChild>
        <button
          type="button"
          className="vs-select-trigger inline-flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl text-sm text-start !border-white/15 !bg-black/55 !text-white dark:!border-white/15 dark:!bg-black/55 dark:!text-white"
          aria-label={ariaLabel}
        >
          <span className="min-w-0 truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        </button>
      </DropdownTrigger>
      <DropdownPortal>
        <VegaDropdownContent select scroll align={rtl ? "start" : "end"}>
          <VegaDropdownItem
            variant={!value ? "selected" : "default"}
            className="justify-between gap-3 text-sm font-semibold"
            onSelect={() => onChange("")}
          >
            <span>{placeholder}</span>
            {!value ? (
              <Check className="h-3.5 w-3.5 shrink-0 vega-brand-text opacity-100" aria-hidden />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
          </VegaDropdownItem>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <VegaDropdownItem
                key={option.value}
                variant={selected ? "selected" : "default"}
                className="justify-between gap-3 text-sm font-semibold"
                onSelect={() => onChange(option.value)}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {selected ? (
                  <Check className="h-3.5 w-3.5 shrink-0 vega-brand-text opacity-100" aria-hidden />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
              </VegaDropdownItem>
            );
          })}
        </VegaDropdownContent>
      </DropdownPortal>
    </DropdownRoot>
  );
}

export default function CallDevicePanel({
  open = true,
  className = "",
  audioInputs = [],
  videoInputs = [],
  audioOutputs = [],
  selectedAudioInputId = "",
  selectedVideoInputId = "",
  selectedAudioOutputId = "",
  isVideoCall = false,
  showSpeakerOutput = false,
  onChangeAudioInput,
  onChangeVideoInput,
  onChangeAudioOutput,
}) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  const audioOptions = useMemo(
    () =>
      audioInputs.map((device, index) => ({
        value: device.deviceId,
        label: renderLabel(device, `${t("callMicrophone")} ${index + 1}`),
      })),
    [audioInputs, t],
  );

  const videoOptions = useMemo(
    () =>
      videoInputs.map((device, index) => ({
        value: device.deviceId,
        label: renderLabel(device, `${t("callCamera")} ${index + 1}`),
      })),
    [t, videoInputs],
  );

  const speakerOptions = useMemo(
    () =>
      audioOutputs.map((device, index) => ({
        value: device.deviceId,
        label: renderLabel(device, `${t("callSpeaker")} ${index + 1}`),
      })),
    [audioOutputs, t],
  );

  if (!open) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md ring-1 ring-white/5",
        className,
      )}
    >
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          {t("callDevices")}
        </p>
        <p className="mt-1 text-xs text-white/55">{t("callDevicesHint")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-white/75">
          <span>{t("callMicrophone")}</span>
          <OverlayDeviceSelect
            value={selectedAudioInputId}
            options={audioOptions}
            placeholder={t("callUseDefaultDevice")}
            onChange={(next) => onChangeAudioInput?.(next)}
            ariaLabel={t("callMicrophone")}
            rtl={rtl}
          />
        </label>

        {isVideoCall ? (
          <label className="grid gap-1.5 text-xs font-medium text-white/75">
            <span>{t("callCamera")}</span>
            <OverlayDeviceSelect
              value={selectedVideoInputId}
              options={videoOptions}
              placeholder={t("callUseDefaultDevice")}
              onChange={(next) => onChangeVideoInput?.(next)}
              ariaLabel={t("callCamera")}
              rtl={rtl}
            />
          </label>
        ) : null}

        {showSpeakerOutput && speakerOptions.length > 0 ? (
          <label
            className={cn(
              "grid gap-1.5 text-xs font-medium text-white/75",
              !isVideoCall ? "sm:col-span-2" : "",
            )}
          >
            <span>{t("callSpeaker")}</span>
            <OverlayDeviceSelect
              value={selectedAudioOutputId}
              options={speakerOptions}
              placeholder={t("callUseDefaultDevice")}
              onChange={(next) => onChangeAudioOutput?.(next)}
              ariaLabel={t("callSpeaker")}
              rtl={rtl}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
