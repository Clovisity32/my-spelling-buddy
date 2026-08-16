import { useEffect, useRef, useState } from "react";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";

export default function ParentMenu({ onNavigate }) {
  const [childName, setChildName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [backupMessage, setBackupMessage] = useState(null);
  const [stickersEnabled, setStickersEnabledState] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => setChildName(await window.__storage.getChildName()))();
    (async () =>
      setStickersEnabledState(await window.__storage.getStickersEnabled()))();
  }, []);

  async function toggleStickers() {
    const next = !stickersEnabled;
    // Update the checkbox first, persist after — otherwise the checkbox
    // stays at its old (React-controlled) state for the length of the
    // IndexedDB write and visibly flickers back before catching up.
    setStickersEnabledState(next);
    await window.__storage.setStickersEnabled(next);
  }

  async function saveName() {
    if (!nameDraft.trim()) return;
    await window.__storage.setChildName(nameDraft.trim());
    setChildName(nameDraft.trim());
    setEditingName(false);
  }

  async function handleExport() {
    const data = await window.__storage.exportData();
    const blob = new Blob([JSON.stringify(data)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spelling-buddy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Backup downloaded.");
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await window.__storage.importData(data);
      setChildName(await window.__storage.getChildName());
      setBackupMessage("Backup restored.");
    } catch {
      setBackupMessage(
        "That file couldn't be read — make sure it's a Spelling Buddy backup.",
      );
    }
    e.target.value = "";
  }

  return (
    <Screen max="max-w-2xl">
      {/* Back moved from the bottom of the stack into the standard header,
          so every screen in the app now dismisses from the same place. */}
      <PageHeader title="Parents" onBack={() => onNavigate("home")} />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto py-2">
        <div className="card w-full max-w-sm">
          <p className="t-label mb-2">Child's name</p>
          {editingName ? (
            <div className="flex gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2"
                autoFocus
              />
              <button
                type="button"
                onClick={saveName}
                className="btn btn-primary btn-sm"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-slate-800">
                {childName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setNameDraft(childName);
                  setEditingName(true);
                }}
                className="btn btn-secondary btn-sm"
              >
                Change
              </button>
            </div>
          )}
        </div>

        <div className="card w-full max-w-sm">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Sticker rewards
              </span>
              <span className="block text-xs text-slate-400">
                Off for now — turn on to show the sticker collection.
              </span>
            </span>
            <input
              type="checkbox"
              checked={stickersEnabled}
              onChange={toggleStickers}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "manage" })}
          className="btn btn-primary btn-lg w-full max-w-sm"
        >
          Manage Spelling Lists
        </button>
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "review" })}
          className="btn btn-lg w-full max-w-sm bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus-visible:ring-amber-500"
        >
          Review {childName}'s Work
        </button>

        <div className="flex w-full max-w-sm flex-col gap-2">
          <p className="t-label">Backup</p>
          <p className="text-xs text-slate-400">
            Lists, recordings, and practice history live on this device only.
            Save a backup somewhere safe, and install this app to your Home
            Screen so it isn't cleared automatically.
          </p>
          <div className="flex gap-2">
            {/* Deliberately not "Export/Import backup" — "backup" contains
                "back" as a substring, which collided with every plain
                "Back" nav button under accessible-name matching. */}
            <button
              type="button"
              onClick={handleExport}
              className="btn btn-secondary btn-sm flex-1"
            >
              Save to a file
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary btn-sm flex-1"
            >
              Restore from a file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          {backupMessage && (
            <p className="text-sm text-slate-500">{backupMessage}</p>
          )}
        </div>
      </div>
    </Screen>
  );
}
