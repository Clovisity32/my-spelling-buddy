import { useEffect, useRef, useState } from "react";
import { toneNumbersToMarks } from "../pinyin.js";

const PINYIN_HINT_RE = /[a-zü]+[1-5]/i;
// Any CJK ideograph. A word already written in characters needs no separate
// "what to say" text — a Mandarin voice reads it correctly as-is. It's only
// Latin-script words (pinyin, English) where the two can differ.
const HAN_RE = /[㐀-䶿一-鿿豈-﫿]/;

export default function ListEditor({ listId, onNavigate }) {
  const [list, setList] = useState(null);
  const [words, setWords] = useState([]);
  const [text, setText] = useState("");
  const [speechText, setSpeechText] = useState("");
  const [recordState, setRecordState] = useState("idle"); // idle | starting | recording
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [pendingAudio, setPendingAudio] = useState(null); // {blob,mime} or {useTts:true,...}
  const [recordError, setRecordError] = useState(null);
  const [playingWordId, setPlayingWordId] = useState(null);
  const [ttsLang, setTtsLang] = useState("zh");
  const [ttsVoiceURI, setTtsVoiceURI] = useState("");
  const [chineseVoices, setChineseVoices] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null); // {word, timerId}
  const recorderRef = useRef(null);
  const textInputRef = useRef(null);
  const recordIntervalRef = useRef(null);

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

  // Give the mic back when the parent leaves this screen, and finalize any
  // delete still waiting on its undo window, rather than losing it.
  useEffect(() => {
    return () => {
      window.__audio.releaseMicrophone();
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, []);

  async function toggleShuffle() {
    const next = !list.shuffle;
    await window.__storage.setListShuffle(listId, next);
    refresh();
  }

  async function toggleRecord() {
    if (recordState === "idle") {
      setRecordError(null);
      setRecordState("starting");
      try {
        recorderRef.current = await window.__audio.startRecording();
        setRecordState("recording");
        setRecordSeconds(0);
        window.__audio.playRecordStartCue();
        recordIntervalRef.current = setInterval(
          () => setRecordSeconds((s) => s + 1),
          1000,
        );
      } catch {
        setRecordState("idle");
        setRecordError(
          "Couldn't access the microphone. Check your browser's microphone permission and try again.",
        );
      }
    } else if (recordState === "recording") {
      clearInterval(recordIntervalRef.current);
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
    window.__audio.speakWord(spokenText, ttsLang, ttsVoiceURI || null);
  }

  function resetSoundChoice() {
    setPendingAudio(null);
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
      speechText: speechText.trim() || null,
    });
    setText("");
    setSpeechText("");
    setPendingAudio(null);
    refresh();
    textInputRef.current?.focus();
  }

  function handleTextKeyDown(e) {
    if (e.key === "Enter" && text.trim() && pendingAudio) {
      e.preventDefault();
      addWord();
    }
  }

  // Delete is undoable: hide it from the list immediately, but only
  // actually remove it from storage after a few seconds with no Undo. A
  // second delete while one is already pending finalizes the first rather
  // than losing track of it.
  function requestDelete(word) {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timerId);
      window.__storage.deleteWord(listId, pendingDelete.word.id);
    }
    setWords((ws) => ws.filter((w) => w.id !== word.id));
    const timerId = setTimeout(() => {
      window.__storage.deleteWord(listId, word.id);
      setPendingDelete(null);
    }, 4000);
    setPendingDelete({ word, timerId });
  }

  function undoDelete() {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timerId);
    setPendingDelete(null);
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
        spokenText,
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
      window.__audio.speakWordEntry(word);
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

  const looksLikePinyin = PINYIN_HINT_RE.test(text);
  // What the app's voice will actually say, previews included.
  const spokenText = speechText.trim() || text.trim();
  // Offered only for Latin-script words: a word already typed in characters
  // is spoken correctly as-is, and an English word has nothing to add.
  const canAddCharacters = !!text.trim() && !HAN_RE.test(text);
  // The specific broken case worth warning about: a pinyin answer set to be
  // read by the app's voice with no characters given. The engine gets
  // romanization it can't pronounce, and the tones are silently lost.
  const pinyinWithoutCharacters =
    ttsLang === "zh" && canAddCharacters && !speechText.trim();
  const recordLabel =
    recordState === "recording"
      ? `⏺ Stop (${recordSeconds}s)`
      : recordState === "starting"
        ? "Starting…"
        : "🎙 Your voice";

  return (
    <div className="flex h-screen flex-col overflow-hidden p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold text-slate-700">{list.name}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow">
            <input
              type="checkbox"
              checked={!!list.shuffle}
              onChange={toggleShuffle}
            />
            🔀 Shuffle order when Chloe practises
          </label>
          <button
            type="button"
            onClick={() => onNavigate("lists", { mode: "manage" })}
            className="rounded-2xl bg-slate-200 px-6 py-3 text-lg font-semibold text-slate-600 transition active:scale-95 hover:bg-slate-300"
          >
            Back to lists
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-4 shadow">
          {/* Step 1: the word */}
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              1. Type the word
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={textInputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder="Word, phrase, character, or pinyin"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                className="min-w-[16rem] flex-1 rounded-xl border px-4 py-2"
              />
              {looksLikePinyin && (
                <button
                  type="button"
                  onClick={() => setText(toneNumbersToMarks(text))}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold transition active:scale-95"
                >
                  ni3 hao3 → nǐ hǎo
                </button>
              )}
            </div>
          </div>

          {/* Step 1b: what the app should say, when that differs from the
              answer. Only Latin-script words get this — see canAddCharacters. */}
          {canAddCharacters && (
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                1b. Chinese characters — optional
              </span>
              <input
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                placeholder="你好"
                aria-label="Chinese characters for audio"
                className="min-w-[16rem] rounded-xl border px-4 py-2"
              />
              <p className="mt-1 text-xs text-slate-400">
                Chloe still writes "{text.trim()}" — this is only what the app's
                voice says. Leave blank for English words.
              </p>
            </div>
          )}

          {/* Step 2: how Chloe hears it */}
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              2. How should Chloe hear it?
            </span>
            {pendingAudio ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-4 py-2">
                <span className="font-semibold text-emerald-700">
                  {pendingAudio.useTts
                    ? "✓ The app will read it aloud"
                    : "✓ Your recording is ready"}
                </span>
                <button
                  type="button"
                  onClick={playPending}
                  className="rounded-lg bg-white px-3 py-1 text-sm font-semibold shadow transition active:scale-95"
                >
                  {pendingAudio.useTts ? "Preview" : "Play preview"}
                </button>
                <button
                  type="button"
                  onClick={resetSoundChoice}
                  className="text-sm font-semibold text-slate-500 underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-3">
                <button
                  type="button"
                  onClick={toggleRecord}
                  disabled={recordState === "starting"}
                  className={`rounded-xl px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-60 ${recordState === "recording" ? "animate-pulse bg-rose-500" : "bg-sky-500"}`}
                >
                  {recordLabel}
                </button>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={useTtsForWord}
                    disabled={!text.trim()}
                    title="Have the app read the word aloud instead of recording your own voice"
                    className="rounded-xl bg-violet-500 px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-40"
                  >
                    🔊 App reads it
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
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
                      <select
                        value={ttsVoiceURI}
                        onChange={(e) => setTtsVoiceURI(e.target.value)}
                        className="rounded-xl border px-3 py-2 text-sm"
                        aria-label="Chinese voice"
                      >
                        <option value="">Best available (Mandarin)</option>
                        {chineseVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                            {v.localService ? "" : " — needs download"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {ttsLang === "zh" && chineseVoices.length === 0 && (
                    <p className="max-w-md text-xs text-amber-700">
                      This device has no Mandarin voice installed, so "App reads
                      it" will fall back to an English voice. Record your own
                      voice instead, or add one in Settings → Accessibility →
                      Spoken Content → Voices → Chinese.
                    </p>
                  )}
                  {pinyinWithoutCharacters && chineseVoices.length > 0 && (
                    <p className="max-w-md text-xs text-amber-700">
                      The app's voice reads Chinese characters, not pinyin — it
                      can't pronounce "{text.trim()}" with the right tones. Add
                      the characters above, or record your voice.
                    </p>
                  )}
                </div>
              </div>
            )}
            {recordError && (
              <p className="mt-2 text-sm text-rose-600">{recordError}</p>
            )}
          </div>

          {/* Step 3: add */}
          <div>
            <button
              type="button"
              onClick={addWord}
              disabled={!text.trim() || !pendingAudio}
              className="rounded-xl bg-emerald-500 px-6 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-40"
            >
              3. Add word
            </button>
            {(!text.trim() || !pendingAudio) && (
              <p className="mt-1 text-xs text-slate-400">
                {!text.trim()
                  ? "Type a word first."
                  : 'Record your voice or tap "App reads it" above, then Add word.'}
              </p>
            )}
          </div>
        </div>

        <ul className="flex flex-col gap-2 overflow-hidden">
          {words.map((word, i) => (
            <li
              key={word.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow"
            >
              <span className="text-lg">
                {word.text}
                {word.speechText && (
                  <span className="ml-2 text-base text-slate-500">
                    (says {word.speechText})
                  </span>
                )}
                <span
                  className={`ml-2 text-xs font-semibold ${word.useTts ? "text-violet-500" : "text-sky-500"}`}
                >
                  {word.useTts ? "🔊 app voice" : "🎙 your voice"}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playWord(word)}
                  className={`rounded-lg px-3 py-1 transition active:scale-95 hover:bg-slate-300 ${playingWordId === word.id ? "bg-sky-300" : "bg-slate-200"}`}
                >
                  {playingWordId === word.id ? "🔊 Playing…" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg bg-slate-200 px-3 py-1 transition active:scale-95 hover:bg-slate-300 disabled:opacity-30"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === words.length - 1}
                  className="rounded-lg bg-slate-200 px-3 py-1 transition active:scale-95 hover:bg-slate-300 disabled:opacity-30"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(word)}
                  className="rounded-lg bg-rose-200 px-3 py-1 transition active:scale-95 hover:bg-rose-300"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {pendingDelete && (
        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-800 px-5 py-3 text-white shadow-lg">
          <span>Deleted "{pendingDelete.word.text}"</span>
          <button
            type="button"
            onClick={undoDelete}
            className="font-semibold text-sky-300 underline"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
