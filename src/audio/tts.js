// Reads a word aloud with the browser's built-in speech synthesis, as an
// alternative to a parent recording their own voice.
//
// lang is "zh" or "en" — chosen explicitly by the parent when adding the
// word, not auto-detected from the text: pinyin ("ni3 hao3"/"nǐ hǎo") and
// English words are both Latin-script, so there's no reliable way to tell
// them apart from the characters alone. Getting this wrong (defaulting
// romanized pinyin to an English voice) is what made pinyin playback sound
// "English" rather than Mandarin.
//
// Which actual voices exist is entirely up to the device/OS. Mandarin is
// tagged "zh" (or, on some engines, the ISO 639-3 code "cmn") — Cantonese
// is a DIFFERENT spoken language, not just a regional accent of Mandarin.
// Pinyin romanization is specifically for Mandarin pronunciation, so a
// Cantonese voice reading it is wrong regardless of how "authentically
// Chinese" it sounds. Cantonese/Hong Kong voices are excluded entirely —
// never offered in the picker, never auto-selected, not even as a last
// resort if no Mandarin voice exists (falls back to a plain "zh-CN" lang
// request and lets the OS pick its own default instead).
//
// A first version of this file only rejected a lang tag if it started
// with the literal string "zh-hk" — but real engines commonly report Hong
// Kong Cantonese with a script subtag included, e.g. "zh-Hant-HK" (Android
// Chrome's system TTS does this), which does NOT start with "zh-hk" and
// slipped straight through as "Mandarin". isCantoneseVoice() below checks
// for an "HK" region or "yue" language code anywhere in the tag (plus the
// voice's own name, since some engines only say "Cantonese"/"Hong Kong"
// there and not in the BCP-47 tag at all) instead of anchoring to one
// exact tag shape — verified against a simulated zh-Hant-HK voice.
import { toneNumbersToMarks } from "../pinyin.js";

const REGION_PREFERENCE = ["sg", "cn", "tw"]; // Singapore > Mainland > Taiwan

function isCantoneseVoice(voice) {
  const lang = (voice.lang || "").toLowerCase();
  const name = (voice.name || "").toLowerCase();
  return (
    lang.includes("hk") ||
    lang.includes("yue") ||
    name.includes("cantonese") ||
    name.includes("hong kong")
  );
}

function isMandarinVoice(voice) {
  const lang = (voice.lang || "").toLowerCase();
  if (!lang.startsWith("zh") && !lang.startsWith("cmn")) return false;
  return !isCantoneseVoice(voice);
}

// Which BCP-47 region subtag (sg/cn/tw) a Mandarin voice's lang carries,
// tolerant of a script subtag in between (zh-CN, zh-Hans-CN, cmn-CN all
// match "cn"). Returns null if none of the three appear.
function regionOf(lang) {
  const l = (lang || "").toLowerCase();
  for (const r of REGION_PREFERENCE) {
    if (l.includes(`-${r}`) || l.includes(`_${r}`)) return r;
  }
  return null;
}

let cachedVoices = [];

function loadVoices() {
  if (!isSpeechSynthesisSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) cachedVoices = voices;
  return cachedVoices;
}

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

if (isSpeechSynthesisSupported()) {
  loadVoices();
  // Voice lists load asynchronously on first page visit in most browsers.
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
}

// Mandarin voices only — Cantonese/Hong Kong is never offered here, so it
// can never be picked from this list by a parent expecting "Chinese".
export function getChineseVoices() {
  // Built explicitly rather than via {...v}: SpeechSynthesisVoice's fields
  // are accessor properties on the prototype, not own enumerable
  // properties on each instance, so a spread silently drops them all.
  return loadVoices()
    .filter(isMandarinVoice)
    .map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      localService: v.localService,
    }));
}

function pickVoice(lang) {
  const voices = loadVoices();
  if (lang === "zh") {
    const mandarinVoices = voices.filter(isMandarinVoice);
    for (const region of REGION_PREFERENCE) {
      const match = mandarinVoices.find((v) => regionOf(v.lang) === region);
      if (match) return match;
    }
    // No exact-region match — any other Mandarin voice beats none at all.
    // Cantonese is deliberately not tried here: better to fall through to
    // a plain "zh-CN" lang request (letting the OS pick its own default)
    // than to ever hand back a different spoken language.
    return mandarinVoices[0] || null;
  }
  return voices.find((v) => v.lang?.toLowerCase().startsWith("en")) || null;
}

// Normalizes pinyin text right before it's spoken, regardless of how it was
// typed or stored:
//  - Raw tone-number pinyin ("san1") left unconverted reads as digits/odd
//    syllables to a TTS engine — always run it through toneNumbersToMarks
//    here rather than relying on a parent remembering to tap the "ni3 hao3
//    -> nǐ hǎo" button in the editor before choosing "App reads it".
//  - Mixed/upper-case letters (mobile keyboards auto-capitalize the first
//    letter typed; caps lock produces a run of them) make some engines
//    read the word as a spelled-out acronym ("S, A, N") instead of a
//    normal syllable. Pinyin carries no meaningful case, so lower-casing
//    before conversion sidesteps this regardless of how the text reached
//    us — the conversion regex itself is already case-insensitive, so
//    this only changes what gets spoken, not what toneNumbersToMarks can
//    match.
function pinyinForSpeech(text) {
  return toneNumbersToMarks(text.toLowerCase());
}

export function speakWord(text, lang = "zh", voiceURI = null, rate = 0.9) {
  if (!isSpeechSynthesisSupported() || !text) return;
  window.speechSynthesis.cancel(); // don't let overlapping taps queue up
  const spokenText = lang === "zh" ? pinyinForSpeech(text) : text;
  const utterance = new SpeechSynthesisUtterance(spokenText);
  // Re-fetch fresh voice objects right before speaking rather than reusing
  // ones handed in earlier — some browsers only reliably honor
  // utterance.voice when it's a voice object from the most recent
  // getVoices() call.
  const voices = loadVoices();
  const voice = voiceURI
    ? voices.find((v) => v.voiceURI === voiceURI)
    : pickVoice(lang);
  if (voice) {
    try {
      utterance.voice = voice;
    } catch {
      // A voice reference gone stale between listing and speaking — fall
      // through to the plain lang-only request below rather than throwing
      // out of an unawaited, uncaught call site.
    }
    utterance.lang = voice.lang;
  } else {
    utterance.lang = lang === "zh" ? "zh-CN" : "en-US";
  }
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

// Speaks a stored word. Prefers its speechText (the Chinese characters a
// parent supplied for a pinyin word) over the answer text itself, because
// a Mandarin engine reads characters and not romanization — see
// storage/index.js's addWord. Every screen that plays a saved word goes
// through here so they can't drift apart on which field wins.
//
// `slow` is the practice-screen "hint" — noticeably slower than the normal
// 0.9 rate, so a child can try to sound the word out syllable by syllable.
export function speakWordEntry(word, { slow = false } = {}) {
  if (!word) return;
  speakWord(
    word.speechText || word.text,
    word.ttsLang,
    word.ttsVoiceURI,
    slow ? 0.5 : 0.9,
  );
}

// True when the device has no Mandarin voice at all. speakWord falls back
// to a bare "zh-CN" lang request in that case, which on a stock iPad means
// the default *English* voice reads the text — audibly wrong, and with
// nothing on screen to explain why. The editor uses this to warn instead.
export function hasMandarinVoice() {
  return loadVoices().some(isMandarinVoice);
}
