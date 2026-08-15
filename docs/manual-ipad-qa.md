# Manual iPad QA

Run these by hand on the actual device after deploying — the automated
Playwright suite runs in headless Chromium and cannot exercise Apple
Pencil input, real microphone permission prompts, or Safari/Chrome-iOS
audio-unlock quirks.

- [ ] Apple Pencil writes on the whiteboard; a palm resting on the screen
      while writing does not add stray marks.
- [ ] With "No pencil today?" off, a finger touch does not draw. With it
      on, finger drawing works.
- [ ] A parent can record a word over the deployed HTTPS URL and play it
      back immediately.
- [ ] The save chime, fanfare, and happy tick all play audibly in both
      Safari and Chrome on the iPad.
- [ ] Add to Home Screen from Safari; relaunch from the Home Screen icon
      and confirm it opens full-screen (no browser chrome).
- [ ] After installing, close the app, wait, reopen it, and confirm
      previously saved lists/recordings/attempts are still present.
