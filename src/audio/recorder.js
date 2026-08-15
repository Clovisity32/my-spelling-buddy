// MediaRecorder wrapper. iOS Safari records audio/mp4, not audio/webm — the
// candidate list is tried in order via isTypeSupported() and the mime that
// actually won is stored alongside the blob (storage/index.js's audioMime
// field), because hardcoding webm would silently produce a file iOS
// couldn't have recorded or other browsers couldn't necessarily play back.
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

export function isRecordingSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"
  );
}

function pickMimeType() {
  for (const candidate of MIME_CANDIDATES) {
    if (window.MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

// getUserMedia() has real latency (permission check, hardware/driver
// init) — re-acquiring the mic fresh for every single word recording was
// the cause of a noticeable start-up lag, worst on short pinyin syllables
// where the first fraction of a second (spent still acquiring the stream)
// was silently lost. Caching the stream across recordings in one editing
// session pays that cost once instead of per-word. releaseMicrophone()
// lets a screen give the mic back explicitly (e.g. on unmount) rather
// than leaving the OS mic indicator on indefinitely.
let cachedStream = null;

async function getStream() {
  if (
    cachedStream &&
    cachedStream.getTracks().some((t) => t.readyState === "live")
  ) {
    return cachedStream;
  }
  cachedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return cachedStream;
}

export function releaseMicrophone() {
  if (cachedStream) {
    cachedStream.getTracks().forEach((t) => t.stop());
    cachedStream = null;
  }
}

export async function startRecording() {
  if (!isRecordingSupported()) {
    throw new Error("Recording is not supported on this device.");
  }
  const stream = await getStream();
  const mimeType = pickMimeType();
  const recorder = new window.MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined,
  );
  const chunks = [];
  recorder.addEventListener("dataavailable", (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  });

  recorder.start();

  return {
    stop() {
      return new Promise((resolve) => {
        recorder.addEventListener(
          "stop",
          () => {
            const blob = new Blob(chunks, {
              type: recorder.mimeType || mimeType || "audio/webm",
            });
            resolve({ blob, mime: blob.type });
          },
          { once: true },
        );
        recorder.stop();
      });
    },
    cancel() {
      if (recorder.state !== "inactive") recorder.stop();
    },
  };
}
