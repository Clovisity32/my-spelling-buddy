// Converts tone-number pinyin ("ni3 hao3", "nv3") to tone-mark pinyin
// ("nǐ hǎo", "nǚ") — the notation any keyboard can type, since typing
// diacritics like ǎ/ǒ/ǚ directly isn't supported by iOS's regular or
// Chinese-Pinyin keyboards. "v" is the standard keyboard stand-in for ü.
const TONE_MARKS = {
  a: ["a", "ā", "á", "ǎ", "à"],
  e: ["e", "ē", "é", "ě", "è"],
  i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"],
  u: ["u", "ū", "ú", "ǔ", "ù"],
  ü: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
};

function markVowel(syllable, tone) {
  const lower = syllable.toLowerCase();
  let vowelIndex = -1;
  if (lower.includes("a")) vowelIndex = lower.indexOf("a");
  else if (lower.includes("e")) vowelIndex = lower.indexOf("e");
  else if (lower.includes("ou")) vowelIndex = lower.indexOf("o");
  else {
    // Last vowel in the syllable — handles "iu" -> u, "ui" -> i.
    for (let i = lower.length - 1; i >= 0; i--) {
      if ("aeiouvü".includes(lower[i])) {
        vowelIndex = i;
        break;
      }
    }
  }
  if (vowelIndex === -1) return syllable;
  const raw = lower[vowelIndex];
  const vowelChar = raw === "v" ? "ü" : raw;
  const marked = TONE_MARKS[vowelChar]?.[tone];
  if (!marked) return syllable;
  return (
    syllable.slice(0, vowelIndex) + marked + syllable.slice(vowelIndex + 1)
  );
}

export function toneNumbersToMarks(text) {
  return text.replace(/([a-zA-Zü]+)([1-5])/g, (match, syllable, toneStr) => {
    const tone = Number(toneStr);
    if (tone === 5) return syllable; // neutral tone, no mark
    return markVowel(syllable, tone);
  });
}
