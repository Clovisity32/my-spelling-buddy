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
// Which actual voices exist is entirely up to the device/OS — this picks
// the best match it can from what's really installed rather than assuming
// a specific accent is available. iOS does not currently ship a dedicated
// Singapore-Mandarin voice; zh-SG is tried first in case the device has
// one anyway (some Android/Chrome installs do), then falls back through
// zh-HK/zh-CN/zh-TW/any "zh" voice. getChineseVoices() lets a screen offer
// a picker so a parent can audition whichever Chinese voices their own
// device actually has and choose the one that sounds best.
const ZH_LANG_PREFERENCE = ["zh-sg", "zh-hk", "zh-cn", "zh-tw"];

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

export function getChineseVoices() {
  return loadVoices().filter((v) => v.lang?.toLowerCase().startsWith("zh"));
}

function pickVoice(lang) {
  const voices = loadVoices();
  if (lang === "zh") {
    for (const pref of ZH_LANG_PREFERENCE) {
      const match = voices.find((v) => v.lang?.toLowerCase() === pref);
      if (match) return match;
    }
    return voices.find((v) => v.lang?.toLowerCase().startsWith("zh")) || null;
  }
  return voices.find((v) => v.lang?.toLowerCase().startsWith("en")) || null;
}

export function speakWord(text, lang = "zh", voiceURI = null) {
  if (!isSpeechSynthesisSupported() || !text) return;
  window.speechSynthesis.cancel(); // don't let overlapping taps queue up
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = loadVoices();
  const voice = voiceURI
    ? voices.find((v) => v.voiceURI === voiceURI)
    : pickVoice(lang);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = lang === "zh" ? "zh-CN" : "en-US";
  }
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
