// Tidies what the photo reader returned into rows ready to review. Pure, so
// it is tested without a photo or a network call.
import { toneNumbersToMarks } from "../pinyin.js";
import { WRITE_AS_KINDS, inferWriteAs } from "../writeAs.js";

const HAN = "㐀-䶿一-鿿豈-﫿";
const HAN_GAP_RE = new RegExp(`([${HAN}])\\s+(?=[${HAN}])`, "g");
const BRACKETS_RE = /[()（）[\]【】]/g;

// Worksheets space the characters out ("上   课"); she writes them together.
const joinHan = (s) => s.replace(HAN_GAP_RE, "$1");
const clean = (s) =>
  joinHan(String(s ?? "").replace(BRACKETS_RE, ""))
    .replace(/\s+/g, " ")
    .trim();

export function normalizeWords(raw) {
  const rows = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    let text = clean(item?.text);
    if (!text) continue;
    const speechText = clean(item?.speechText) || null;
    if (/[1-5]/.test(text) && /^[a-zA-ZüÜ1-5\s]+$/.test(text))
      text = toneNumbersToMarks(text);
    const writeAs = WRITE_AS_KINDS.includes(item?.writeAs)
      ? item.writeAs
      : inferWriteAs({ text, speechText });
    const key = `${writeAs}:${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      text,
      speechText: writeAs === "pinyin" ? speechText : null,
      writeAs,
    });
  }
  return rows;
}
