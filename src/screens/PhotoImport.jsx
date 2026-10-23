import { useEffect, useRef, useState } from "react";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { WRITE_AS, WRITE_AS_KINDS } from "../writeAs.js";

// Steps: key (first time only) → pick a photo → cover her name → reading →
// review the words → create the list. From review, "Add another page" loops
// back to pick; each page's words are appended to the same list.
export default function PhotoImport({ onNavigate }) {
  const [step, setStep] = useState("loading");
  const [apiKey, setApiKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [file, setFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [covers, setCovers] = useState([]);
  const [drag, setDrag] = useState(null); // box being drawn, as fractions
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [rows, setRows] = useState([]);
  const [alsoChars, setAlsoChars] = useState(false);
  const [saving, setSaving] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    window.__storage.getAiKey().then((k) => {
      setApiKey(k);
      setStep(k ? "pick" : "key");
    });
  }, []);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function saveKey() {
    if (!keyDraft.trim()) return;
    await window.__storage.setAiKey(keyDraft);
    setApiKey(keyDraft.trim());
    setKeyDraft("");
    setStep("pick");
  }

  async function forgetKey() {
    await window.__storage.setAiKey("");
    setApiKey("");
    setStep("key");
  }

  function choose(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFile(f);
    setCovers([]);
    setError(null);
    setStep("cover");
  }

  // Drawing a cover box with a finger or mouse; stored as fractions of the
  // photo so it lines up whatever size the picture is shown at.
  function point(e) {
    const r = boxRef.current.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }
  function down(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  }
  function move(e) {
    if (!drag) return;
    const p = point(e);
    setDrag({ ...drag, x1: p.x, y1: p.y });
  }
  function up() {
    if (!drag) return;
    const c = {
      x: Math.min(drag.x0, drag.x1),
      y: Math.min(drag.y0, drag.y1),
      w: Math.abs(drag.x1 - drag.x0),
      h: Math.abs(drag.y1 - drag.y0),
    };
    if (c.w > 0.02 && c.h > 0.01) setCovers((cs) => [...cs, c]);
    setDrag(null);
  }

  async function read() {
    setError(null);
    setStep("reading");
    try {
      const out = await window.__import.readListPhoto(file, apiKey, covers);
      const words = window.__import.normalizeWords(out.words);
      if (!words.length)
        throw {
          kind: "other",
          message:
            "The reader found no words on that photo. Make sure the whole sheet is in the picture and try again.",
        };
      // Later pages add to the words already read; the first page names the list.
      setRows((rs) => [...rs, ...words]);
      setName(
        (n) =>
          n.trim() ||
          out.title?.trim() ||
          `Spelling ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      );
      setStep("review");
    } catch (err) {
      setError(
        err?.kind
          ? { kind: err.kind, message: err.message }
          : {
              kind: "other",
              message: `Something went wrong reading the photo${err?.message ? ` (${err.message})` : ""}. Try again.`,
            },
      );
      setStep("cover");
    }
  }

  const setRow = (i, patch) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function create() {
    const clean = rows.filter((r) => r.text.trim());
    if (!clean.length || !name.trim()) return;
    setSaving(true);
    const list = await window.__storage.createList(name.trim());
    const add = (text, writeAs, speechText = null) =>
      window.__storage.addWord(list.id, {
        text,
        useTts: true,
        ttsLang: writeAs === "english" ? "en" : "zh",
        speechText,
        writeAs,
      });
    for (const r of clean) {
      await add(
        r.text.trim(),
        r.writeAs,
        r.writeAs === "pinyin" ? r.speechText?.trim() || null : null,
      );
      if (alsoChars && r.writeAs === "pinyin" && r.speechText?.trim())
        await add(r.speechText.trim(), "hanzi");
    }
    onNavigate("editor", { listId: list.id });
  }

  const shown = drag && {
    x: Math.min(drag.x0, drag.x1),
    y: Math.min(drag.y0, drag.y1),
    w: Math.abs(drag.x1 - drag.x0),
    h: Math.abs(drag.y1 - drag.y0),
  };
  const pct = (c) => ({
    left: `${c.x * 100}%`,
    top: `${c.y * 100}%`,
    width: `${c.w * 100}%`,
    height: `${c.h * 100}%`,
  });

  return (
    <Screen>
      <PageHeader
        title="New list from a photo"
        onBack={() => onNavigate("lists", { mode: "manage" })}
      />
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {step === "key" && (
          <div className="card max-w-lg space-y-3">
            <p className="text-slate-700">
              Photos are read by Claude. Paste your Anthropic API key once; it
              stays on this device only and is never put in a backup file.
            </p>
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="Anthropic API key"
              aria-label="Anthropic API key"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 px-4 py-2"
            />
            <button
              type="button"
              onClick={saveKey}
              disabled={!keyDraft.trim()}
              className="btn btn-primary btn-sm"
            >
              Save key
            </button>
          </div>
        )}

        {step === "pick" && (
          <div className="card max-w-lg space-y-3">
            <p className="text-slate-700">
              {rows.length
                ? "Take or choose the next page. Its words will be added to the same list."
                : "Take a clear photo of the whole spelling sheet, or choose one you already have. Next you can cover her name before anything is sent. If the words run over to a second page, you can add it afterwards."}
            </p>
            <label className="btn btn-primary btn-sm inline-block cursor-pointer">
              📷 Take or choose a photo
              <input
                type="file"
                accept="image/*"
                aria-label="Photo of the spelling list"
                onChange={choose}
                className="sr-only"
              />
            </label>
            {rows.length > 0 ? (
              <div>
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="btn btn-secondary btn-sm"
                >
                  Back to the words
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={forgetKey}
                  className="text-sm text-slate-500 underline"
                >
                  Remove the saved key
                </button>
              </div>
            )}
          </div>
        )}

        {step === "cover" && photoUrl && (
          <div className="space-y-3">
            <p className="text-slate-700">
              Drag a box over her <b>name and class</b> to hide them. Hidden
              areas are blacked out on this device before the photo is sent to
              Anthropic to be read. The photo is not saved.
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 px-4 py-2 text-rose-700"
              >
                {error.message}
                {error.kind === "key" && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={forgetKey}
                      className="font-semibold underline"
                    >
                      Enter a different key
                    </button>
                  </>
                )}
              </p>
            )}
            <div
              ref={boxRef}
              data-testid="cover-area"
              className="relative mx-auto w-full max-w-md touch-none select-none"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
            >
              <img
                src={photoUrl}
                alt="Your spelling sheet"
                draggable={false}
                className="block w-full rounded-xl"
              />
              {covers.map((c, i) => (
                <div
                  key={i}
                  data-cover
                  className="absolute bg-black"
                  style={pct(c)}
                />
              ))}
              {shown && (
                <div className="absolute bg-black/60" style={pct(shown)} />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCovers((cs) => cs.slice(0, -1))}
                disabled={!covers.length}
                className="btn btn-secondary btn-sm"
              >
                Undo last box
              </button>
              <button
                type="button"
                onClick={() => setStep("pick")}
                className="btn btn-secondary btn-sm"
              >
                Choose a different photo
              </button>
              <button
                type="button"
                onClick={read}
                className="btn btn-primary btn-sm"
              >
                Read the words
              </button>
            </div>
          </div>
        )}

        {step === "reading" && (
          <p role="status" className="text-lg text-slate-600">
            Reading the words… this takes a few seconds.
          </p>
        )}

        {step === "review" && (
          <div className="space-y-3">
            <p className="text-slate-700">
              Check each word against the sheet and fix anything that looks
              wrong, then create the list.
            </p>
            <label className="block">
              <span className="text-sm text-slate-500">List name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="List name"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2 sm:max-w-sm"
              />
            </label>
            <ul className="space-y-2">
              {rows.map((r, i) => (
                <li
                  key={i}
                  className="card-tight flex flex-wrap items-center gap-2"
                >
                  <span className="w-6 text-sm text-slate-400">{i + 1}</span>
                  <select
                    value={r.writeAs}
                    onChange={(e) => setRow(i, { writeAs: e.target.value })}
                    aria-label={`Chloe writes for word ${i + 1}`}
                    className="rounded-lg border border-slate-300 px-2 py-1"
                  >
                    {WRITE_AS_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {WRITE_AS[k].short}
                      </option>
                    ))}
                  </select>
                  <input
                    value={r.text}
                    onChange={(e) => setRow(i, { text: e.target.value })}
                    aria-label={`Word ${i + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1 text-lg"
                  />
                  {r.writeAs === "pinyin" && (
                    <input
                      value={r.speechText || ""}
                      onChange={(e) =>
                        setRow(i, { speechText: e.target.value })
                      }
                      placeholder="汉字"
                      aria-label={`Characters for word ${i + 1}`}
                      className="w-32 rounded-lg border border-slate-300 px-3 py-1 text-lg"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setRows((rs) => rs.filter((_, j) => j !== i))
                    }
                    aria-label={`Remove word ${i + 1}`}
                    className="btn btn-danger btn-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() =>
                setRows((rs) => [
                  ...rs,
                  { text: "", speechText: null, writeAs: "english" },
                ])
              }
              className="btn btn-secondary btn-sm"
            >
              Add a word
            </button>{" "}
            <button
              type="button"
              onClick={() => setStep("pick")}
              className="btn btn-secondary btn-sm"
            >
              📷 Add another page
            </button>
            {rows.some((r) => r.writeAs === "pinyin") && (
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={alsoChars}
                  onChange={(e) => setAlsoChars(e.target.checked)}
                />
                Also practise the characters (汉字) for each pinyin word
              </label>
            )}
            <div>
              <button
                type="button"
                onClick={create}
                disabled={
                  saving || !name.trim() || !rows.some((r) => r.text.trim())
                }
                className="btn btn-go"
              >
                {`Create list (${rows.filter((r) => r.text.trim()).length} words)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}
