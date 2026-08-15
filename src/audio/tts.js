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
// is a DIFFERENT spoken language, tagged "zh-HK"/"yue", not just a regional
// accent of Mandarin. Pinyin romanization is specifically for Mandarin
// pronunciation, so a Cantonese voice reading it is wrong regardless of how
// "authentically Chinese" it sounds — this preference list ranks Mandarin
// variants first and Cantonese (zh-HK/yue) last, used only if no Mandarin
// voice exists at all. iOS/Android do not currently ship a dedicated
// Singapore-Mandarin voice as standard; zh-SG/cmn-SG are tried first in
// case a device has one anyway, then mainland/Taiwan Mandarin, then
// Cantonese as a last resort. getChineseVoices() lets a screen offer a
// picker so a parent can audition whichever voices their own device
// actually has and choose the one that sounds best — it flags Cantonese
// voices distinctly so "sounds completely different" isn't mistaken for
// "sounds better."
const MANDARIN_LANG_PREFERENCE = [
  "zh-sg",
  "cmn-sg",
  "zh-cn",
  "cmn-cn",
  "cmn-hans-cn",
  "zh-tw",
  "cmn-tw",
  "cmn-hant-tw",
];
const CANTONESE_LANG_PREFERENCE = ["zh-hk", "yue-hk", "yue"];

function isMandarinLang(lang) {
  const l = lang?.toLowerCase() || "";
  return (l.startsWith("zh") && !l.startsWith("zh-hk")) || l.startsWith("cmn");
}

function isCantoneseLang(lang) {
  const l = lang?.toLowerCase() || "";
  return l.startsWith("zh-hk") || l.startsWith("yue");
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

// Cantonese voices are included (a parent may deliberately want one) but
// each is tagged so the picker can label it distinctly from Mandarin.
export function getChineseVoices() {
  // Built explicitly rather than via {...v}: SpeechSynthesisVoice's fields
  // are accessor properties on the prototype, not own enumerable
  // properties on each instance, so a spread silently drops them all.
  return loadVoices()
    .filter((v) => isMandarinLang(v.lang) || isCantoneseLang(v.lang))
    .map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      isCantonese: isCantoneseLang(v.lang),
    }));
}

function pickVoice(lang) {
  const voices = loadVoices();
  if (lang === "zh") {
    for (const pref of MANDARIN_LANG_PREFERENCE) {
      const match = voices.find((v) => v.lang?.toLowerCase() === pref);
      if (match) return match;
    }
    const anyMandarin = voices.find((v) => isMandarinLang(v.lang));
    if (anyMandarin) return anyMandarin;
    // No Mandarin voice at all on this device — Cantonese is at least
    // Chinese, so it's a better fallback than an English voice.
    for (const pref of CANTONESE_LANG_PREFERENCE) {
      const match = voices.find((v) => v.lang?.toLowerCase() === pref);
      if (match) return match;
    }
    return null;
  }
  return voices.find((v) => v.lang?.toLowerCase().startsWith("en")) || null;
}

export function speakWord(text, lang = "zh", voiceURI = null) {
  if (!isSpeechSynthesisSupported() || !text) return;
  window.speechSynthesis.cancel(); // don't let overlapping taps queue up
  const utterance = new SpeechSynthesisUtterance(text);
  // Re-fetch fresh voice objects right before speaking rather than reusing
  // ones handed in earlier — some browsers only reliably honor
  // utterance.voice when it's a voice object from the most recent
  // getVoices() call.
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
