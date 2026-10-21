// What she is asked to write for a word: the Chinese characters, the hanyu
// pinyin, or an English word. A spoken pinyin word sounds the same as its
// characters, so without being told she may write the wrong form.
//
// A parent can set it on each word (`word.writeAs`). Older words have none, so
// it is worked out from the content — never from where a word sits in a list.
const HAN_RE = /[㐀-䶿一-鿿豈-﫿]/;
const TONE_MARK_RE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i;
const TONE_NUMBER_RE = /[a-zü]+[1-5]/i;

export const WRITE_AS = {
  hanzi: {
    label: "Chinese characters",
    short: "汉字",
    badge: "✍️ Write the Chinese characters 汉字",
    cue: "写汉字",
    tone: "bg-rose-100 text-rose-700",
  },
  pinyin: {
    label: "Hanyu pinyin",
    short: "拼音",
    badge: "✍️ Write the hanyu pinyin 拼音",
    cue: "写拼音",
    tone: "bg-sky-100 text-sky-700",
  },
  english: {
    label: "English",
    short: "English",
    badge: "✍️ Write the English word",
    cue: null,
    tone: "bg-emerald-100 text-emerald-700",
  },
};

export const WRITE_AS_KINDS = Object.keys(WRITE_AS);

// Characters → hanzi. Latin letters with tone marks or tone numbers, or with
// characters given for the voice (the pinyin-word case), → pinyin. Anything
// else is an English word.
export function inferWriteAs({ text = "", speechText = null } = {}) {
  if (HAN_RE.test(text)) return "hanzi";
  if (TONE_MARK_RE.test(text) || TONE_NUMBER_RE.test(text)) return "pinyin";
  if (speechText && HAN_RE.test(speechText)) return "pinyin";
  return "english";
}

export const writeAsOf = (word) =>
  WRITE_AS_KINDS.includes(word?.writeAs) ? word.writeAs : inferWriteAs(word);
