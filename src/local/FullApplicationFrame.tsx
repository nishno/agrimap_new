import React, { useState, useEffect } from "react";
import { isLocalRuntime } from "./runtime";
import { UiVersionMode, getUiVersionMode } from "../utils/version";
import "./full-application.css";

export function FullApplicationFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const [versionMode, setVersionState] = useState<UiVersionMode>(() => getUiVersionMode());
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const handleVersionChange = (e: any) => {
      if (e.detail?.mode) setVersionState(e.detail.mode);
    };
    window.addEventListener('agrimap-ui-version-changed', handleVersionChange);
    return () => window.removeEventListener('agrimap-ui-version-changed', handleVersionChange);
  }, []);

  const isModern = versionMode === 'modern' || location.pathname.startsWith('/modern');

  useEffect(() => {
    const failed = (e: any) => setSaveError(e.detail);
    const saved = () => setSaveError("");
    window.addEventListener("agrimap-local-save-error", failed);
    window.addEventListener("agrimap-local-save-confirmed", saved);
    return () => {
      window.removeEventListener("agrimap-local-save-error", failed);
      window.removeEventListener("agrimap-local-save-confirmed", saved);
    };
  }, []);

  return (
    <div
      className={`agrimap-full ${isModern ? "agrimap-modern" : ""}`}
      onClickCapture={async (event) => {
        const anchor = (event.target as HTMLElement).closest("a");
        if (
          !isLocalRuntime ||
          !anchor ||
          !["/modern", "/classic", "/local"].includes(
            new URL(anchor.href).pathname,
          )
        )
          return;
        event.preventDefault();
        try {
          const result = await (window as any).__AGRIMAP_FLUSH__?.();
          if (result === false) return;
          await (await import("./documentAdapter")).awaitLocalWrites();
          location.assign(anchor.href);
        } catch {
          setSaveError(
            "Cannot switch yet: a save failed. Reconnect to the server and retry.",
          );
        }
      }}
    >
      {saveError && (
        <div role="alert" className="farm-save-error">
          {saveError}
        </div>
      )}
      <div className="agrimap-app-content">{children}</div>
    </div>
  );
}
