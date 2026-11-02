import {LanguageSwitch} from './EntryControls';
import {useLanguage} from '../contexts/LanguageContext';
import React, { useState, useEffect } from "react";
import { isLocalRuntime, localSession, localRequest } from "./runtime";
import { MODERN_UI_VERSION, UiVersionMode, getUiVersionMode, setUiVersionMode } from "../utils/version";
import "./full-application.css";

const BackupPanel = React.lazy(() => import("./BackupPanel"));

export function FullApplicationFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, language } = useLanguage();
  const [versionMode, setVersionState] = useState<UiVersionMode>(() => getUiVersionMode());
  const [backup, setBackup] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const handleVersionChange = (e: any) => {
      if (e.detail?.mode) setVersionState(e.detail.mode);
    };
    window.addEventListener('agrimap-ui-version-changed', handleVersionChange);
    return () => window.removeEventListener('agrimap-ui-version-changed', handleVersionChange);
  }, []);

  const isModern = versionMode === 'modern' || location.pathname.startsWith('/modern');

  const handleToggleVersion = () => {
    const nextMode: UiVersionMode = isModern ? 'classic' : 'modern';
    setUiVersionMode(nextMode);
    setVersionState(nextMode);
  };

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
      <div
        className="farm-runtime-bar"
        role="region"
        aria-label="Application connection"
      >
        <span>
          <b>{isModern ? MODERN_UI_VERSION.toLowerCase() : "sonik g2.0.1.3"}</b> ·{" "}
          {isLocalRuntime
            ? `${localSession()?.farm.name} · Local server`
            : (language === 'ka' ? 'ღრუბლოვანი აპლიკაცია' : 'Cloud application')}
        </span>
        <nav aria-label="Application controls">
          <LanguageSwitch />
          {!isLocalRuntime && (
            <>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-registration-modal'))}
                className="hover:underline bg-transparent border-0 text-inherit cursor-pointer text-xs"
              >
                {t('entry.cloud_register') || (language === 'ka' ? 'Firebase-ით რეგისტრაცია' : 'Register with Firebase')}
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
                className="hover:underline bg-transparent border-0 text-inherit cursor-pointer text-xs"
              >
                {t('entry.cloud_login') || (language === 'ka' ? 'ღრუბლოვან ანგარიშში შესვლა' : 'Cloud Account Login')}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleToggleVersion}
            className="hover:underline bg-transparent border-0 text-inherit cursor-pointer text-xs"
          >
            {isModern
              ? (language === 'ka' ? 'კლასიკურ ინტერფეისზე გადასვლა' : 'Switch to Classic')
              : (language === 'ka' ? 'თანამედროვე ინტერფეისზე გადასვლა' : 'Switch to Modern')}
          </button>
          {isLocalRuntime && <a href="/local">Local accounts & records</a>}
          {isLocalRuntime && localSession()?.user.role === "owner" && (
            <button onClick={() => setBackup(true)}>Cloud backup</button>
          )}
        </nav>
      </div>
      {saveError && (
        <div role="alert" className="farm-save-error">
          {saveError}
        </div>
      )}
      <div className="agrimap-app-content">{children}</div>
      {backup && (
        <React.Suspense
          fallback={<p role="status">Loading backup controls…</p>}
        >
          <BackupPanel onClose={() => setBackup(false)} />
        </React.Suspense>
      )}
    </div>
  );
}
