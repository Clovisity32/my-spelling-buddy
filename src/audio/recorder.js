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

export async function startRecording() {
  if (!isRecordingSupported()) {
    throw new Error("Recording is not supported on this device.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new window.MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined,
  );
  const chunks = [];
  recorder.addEventListener("dataavailable", (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  });

  function stopTracks() {
    stream.getTracks().forEach((t) => t.stop());
  }

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
            stopTracks();
            resolve({ blob, mime: blob.type });
          },
          { once: true },
        );
        recorder.stop();
      });
    },
    cancel() {
      if (recorder.state !== "inactive") recorder.stop();
      stopTracks();
    },
  };
}
