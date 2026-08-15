// Reads a word aloud with the browser's built-in speech synthesis, as an
// alternative to a parent recording their own voice. Picks a language for
// the voice based on whether the text contains Chinese characters — a
// Chinese voice reading English text (or vice versa) mispronounces badly.
// Romanized pinyin (Latin script, no Hanzi) is the weak case: neither an
// English nor a Chinese voice reads tone-marked syllables well, so a
// parent's own recording is still the better choice for pinyin specifically.
const CJK_RE = /[一-鿿]/;

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakWord(text) {
  if (!isSpeechSynthesisSupported() || !text) return;
  window.speechSynthesis.cancel(); // don't let overlapping taps queue up
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = CJK_RE.test(text) ? "zh-CN" : "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
