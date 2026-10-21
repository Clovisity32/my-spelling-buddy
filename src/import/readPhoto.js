// Reads a photographed spelling list with Claude and returns { title, words }.
// The photo is shrunk here first, with any areas the parent covered painted
// black, then sent once and never stored. The call goes straight from this
// device to Anthropic with the parent's own key.
const MODEL = "claude-sonnet-5-5";
const MAX_SIDE = 1800;

const PROMPT = `This is a photo of a child's school spelling / dictation sheet. Read out the words she must spell and call submit_list.

Rules:
- A box labelled 学拼音 means she writes PINYIN. For each item set writeAs "pinyin", text = the pinyin WITH tone marks (e.g. "shàng kè", "jiǎng gù shi"), speechText = the Chinese characters printed in brackets under it, written without spaces (e.g. "上课").
- A box labelled 学汉字 means she writes CHINESE CHARACTERS. Set writeAs "hanzi", text = the characters without spaces (e.g. "每个老师"). Leave speechText empty. If a large pinyin sentence with its characters in brackets is printed as a prompt (not in the numbered table), ignore it.
- An English table: take ONLY the Word column. writeAs "english". Ignore the header row, the Definition and Sentence columns and pictures.
- Keep the numbered order. Skip empty cells.
- Ignore the school name, grade, lesson heading, name, class, date, captions such as "because..." and decorative pictures. Black rectangles are areas that were hidden on purpose.
- title: a short list name from the lesson or unit heading plus the date if printed, e.g. "第十七课 21 Oct" or "Unit 14 The Broken Bangle".
Copy tone marks exactly as printed. If a character is unclear, give your best reading.`;

const TOOL = {
  name: "submit_list",
  description: "The words to be spelled, in order.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      words: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            speechText: { type: "string" },
            writeAs: { type: "string", enum: ["hanzi", "pinyin", "english"] },
          },
          required: ["text", "writeAs"],
        },
      },
    },
    required: ["words"],
  },
};

// covers: [{ x, y, w, h }] as fractions (0..1) of the photo.
async function shrinkToJpeg(file, covers) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  ctx.fillStyle = "#000";
  for (const c of covers)
    ctx.fillRect(
      c.x * canvas.width,
      c.y * canvas.height,
      c.w * canvas.width,
      c.h * canvas.height,
    );
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

export class ReadError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // "key" | "offline" | "busy" | "other"
  }
}

export async function readListPhoto(file, apiKey, covers = []) {
  let data;
  try {
    data = await shrinkToJpeg(file, covers);
  } catch {
    throw new ReadError(
      "other",
      "That picture couldn't be opened. Try taking it again.",
    );
  }
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new ReadError(
      "offline",
      "Couldn't reach the internet. Connect and try again.",
    );
  }
  if (res.status === 401 || res.status === 403)
    throw new ReadError(
      "key",
      "That key was not accepted. Check it and try again.",
    );
  if (res.status === 429 || res.status >= 500)
    throw new ReadError(
      "busy",
      "The reader is busy right now. Wait a minute and try again.",
    );
  if (!res.ok) {
    // Show what the service said (never the key) so a wrong model name or a
    // rejected request can be told apart from a blurry photo.
    const body = await res.json().catch(() => null);
    const why = body?.error?.message ? `: ${body.error.message}` : "";
    throw new ReadError(
      "other",
      `The photo couldn't be read (error ${res.status}${why}).`,
    );
  }
  const json = await res.json();
  const call = json.content?.find((b) => b.type === "tool_use");
  if (!call?.input)
    throw new ReadError(
      "other",
      `No words came back (${json.stop_reason || "no reason given"}). Try a clearer picture.`,
    );
  return { title: call.input.title || "", words: call.input.words || [] };
}
