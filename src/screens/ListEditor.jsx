import { useEffect, useRef, useState } from "react";
import { toneNumbersToMarks } from "../pinyin.js";

export default function ListEditor({ listId, onNavigate }) {
  const [list, setList] = useState(null);
  const [words, setWords] = useState([]);
  const [text, setText] = useState("");
  const [recordState, setRecordState] = useState("idle"); // idle | starting | recording
  const [pendingAudio, setPendingAudio] = useState(null); // {blob,mime} or {useTts:true}
  const [recordError, setRecordError] = useState(null);
  const [playingWordId, setPlayingWordId] = useState(null);
  const [ttsLang, setTtsLang] = useState("zh");
  const [ttsVoiceURI, setTtsVoiceURI] = useState("");
  const [chineseVoices, setChineseVoices] = useState([]);
  const recorderRef = useRef(null);

  async function refresh() {
    setList(await window.__storage.getList(listId));
    setWords(await window.__storage.getWords(listId));
  }

  useEffect(() => {
    refresh();
  }, [listId]);

  // Which Chinese voices actually exist is entirely up to the device —
  // load whatever the browser reports (voice lists arrive asynchronously
  // on first visit in most browsers) so a parent can audition them and
  // pick whichever sounds closest to what they want, rather than the app
  // guessing at an accent that may not be installed.
  useEffect(() => {
    function updateVoices() {
      setChineseVoices(window.__audio.getChineseVoices());
    }
    updateVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
      return () =>
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          updateVoices,
        );
    }
    return undefined;
  }, []);

  // Give the mic back when the parent leaves this screen, rather than
  // holding the OS mic indicator on for the rest of the app session — the
  // stream is cached and reused across recordings while here specifically
  // to cut the start-up lag between "tap Record" and audio actually
  // capturing (worst on short pinyin syllables, which lose their opening
  // sound if speech starts before the mic is truly ready).
  useEffect(() => {
    return () => window.__audio.releaseMicrophone();
  }, []);

  async function toggleRecord() {
    if (recordState === "idle") {
      setRecordError(null);
      setRecordState("starting");
      try {
        recorderRef.current = await window.__audio.startRecording();
        setRecordState("recording");
        window.__audio.playRecordStartCue();
      } catch {
        setRecordState("idle");
        setRecordError(
          "Couldn't access the microphone. Check your browser's microphone permission and try again.",
        );
      }
    } else if (recordState === "recording") {
      const { blob, mime } = await recorderRef.current.stop();
      setPendingAudio({ blob, mime });
      setRecordState("idle");
    }
  }

  function useTtsForWord() {
    if (!text.trim()) return;
    setRecordError(null);
    setPendingAudio({
      useTts: true,
      ttsLang,
      ttsVoiceURI: ttsVoiceURI || null,
    });
    window.__audio.speakWord(text.trim(), ttsLang, ttsVoiceURI || null);
  }

  async function addWord() {
    if (!text.trim() || !pendingAudio) return;
    await window.__storage.addWord(listId, {
      text: text.trim(),
      audioBlob: pendingAudio.useTts ? null : pendingAudio.blob,
      audioMime: pendingAudio.useTts ? null : pendingAudio.mime,
      useTts: !!pendingAudio.useTts,
      ttsLang: pendingAudio.useTts ? pendingAudio.ttsLang : "zh",
      ttsVoiceURI: pendingAudio.useTts ? pendingAudio.ttsVoiceURI : null,
    });
    setText("");
    setPendingAudio(null);
    refresh();
  }

  async function removeWord(wordId) {
    await window.__storage.deleteWord(listId, wordId);
    refresh();
  }

  async function move(index, dir) {
    const order = words.map((w) => w.id);
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    [order[index], order[j]] = [order[j], order[index]];
    await window.__storage.reorderWords(listId, order);
    refresh();
  }

  function playPending() {
    if (!pendingAudio) return;
    if (pendingAudio.useTts) {
      window.__audio.speakWord(
        text.trim(),
        pendingAudio.ttsLang,
        pendingAudio.ttsVoiceURI,
      );
    } else {
      window.__audio.playRecordedAudio(pendingAudio.blob);
    }
  }

  function playWord(word) {
    setPlayingWordId(word.id);
    if (word.useTts) {
      window.__audio.speakWord(word.text, word.ttsLang, word.ttsVoiceURI);
      setTimeout(
        () => setPlayingWordId((id) => (id === word.id ? null : id)),
        1200,
      );
    } else if (word.audioBlob) {
      window.__audio.playRecordedAudio(word.audioBlob);
      setTimeout(
        () => setPlayingWordId((id) => (id === word.id ? null : id)),
        800,
      );
    } else {
      setPlayingWordId(null);
    }
  }

  if (!list) return null;

  const recordLabel =
    recordState === "recording"
      ? "Stop recording"
      : recordState === "starting"
        ? "Starting…"
        : "Record";

  return (
    <div className="min-h-screen p-6">
      <h2 className="mb-4 text-3xl font-bold text-slate-700">{list.name}</h2>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Word, phrase, character, or pinyin (ni3 hao3)"
          className="min-w-[16rem] flex-1 rounded-xl border px-4 py-2"
        />
        <button
          type="button"
          onClick={() => setText(toneNumbersToMarks(text))}
          disabled={!text.trim()}
          title="Type pinyin with tone numbers (ni3 hao3), then tap this to convert to tone marks (nǐ hǎo)"
          className="rounded-xl bg-slate-200 px-4 py-2 font-semibold transition active:scale-95 disabled:opacity-40"
        >
          1→ā tone marks
        </button>
        <button
          type="button"
          onClick={toggleRecord}
          disabled={recordState === "starting"}
          className={`rounded-xl px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-60 ${recordState === "recording" ? "bg-rose-500" : "bg-sky-500"}`}
        >
          {recordLabel}
        </button>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTtsLang("zh")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${ttsLang === "zh" ? "bg-white shadow" : "text-slate-500"}`}
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => setTtsLang("en")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${ttsLang === "en" ? "bg-white shadow" : "text-slate-500"}`}
          >
            EN
          </button>
        </div>
        {ttsLang === "zh" && chineseVoices.length > 0 && (
          <div className="flex flex-col gap-1">
            <select
              value={ttsVoiceURI}
              onChange={(e) => setTtsVoiceURI(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              aria-label="Chinese voice"
            >
              <option value="">Best available</option>
              {chineseVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}){v.localService ? "" : " — needs download"}
                </option>
              ))}
            </select>
            {chineseVoices.some((v) => !v.localService) && (
              <p className="max-w-xs text-xs text-amber-600">
                Voices marked "needs download" often silently play in a
                different voice until downloaded: iPad Settings → Accessibility
                → Spoken Content → Voices → Chinese.
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={useTtsForWord}
          disabled={!text.trim()}
          title="Have the app read the word aloud instead of recording your own voice"
          className="rounded-xl bg-violet-500 px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-40"
        >
          🔊 Read it for me
        </button>
        {recordError && <p className="text-sm text-rose-600">{recordError}</p>}
        {pendingAudio && (
          <button
            type="button"
            onClick={playPending}
            className="rounded-xl bg-slate-200 px-4 py-2 transition active:scale-95"
          >
            {pendingAudio.useTts ? "Preview" : "Play preview"}
          </button>
        )}
        <button
          type="button"
          onClick={addWord}
          disabled={!text.trim() || !pendingAudio}
          className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-40"
        >
          Add word
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {words.map((word, i) => (
          <li
            key={word.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow"
          >
            <span className="text-lg">
              {word.text}
              {word.useTts && (
                <span className="ml-2 text-xs font-semibold text-violet-500">
                  🔊 spoken
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playWord(word)}
                className={`rounded-lg px-3 py-1 transition active:scale-95 ${playingWordId === word.id ? "bg-sky-300" : "bg-slate-200"}`}
              >
                {playingWordId === word.id ? "🔊 Playing…" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="rounded-lg bg-slate-200 px-3 py-1 transition active:scale-95"
              >
                Up
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="rounded-lg bg-slate-200 px-3 py-1 transition active:scale-95"
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => removeWord(word.id)}
                className="rounded-lg bg-rose-200 px-3 py-1 transition active:scale-95"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "manage" })}
        className="mt-8 rounded-2xl bg-slate-200 px-6 py-3 text-lg font-semibold text-slate-600 transition active:scale-95"
      >
        Back to lists
      </button>
    </div>
  );
}
