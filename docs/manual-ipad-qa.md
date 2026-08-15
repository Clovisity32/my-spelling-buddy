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

## Layout and safe areas

These need a real device: `env(safe-area-inset-*)` is zero in a desktop
browser, so the automated `tests/layout.spec.js` checks cannot see them.

- [ ] In the Home Screen (standalone) app, no title or button sits under the
      status bar or the home indicator, in either orientation.
- [ ] On the practice screen, after tapping Save, the whiteboard toolbar
      stays fully visible and nothing above the footer shifts.
- [ ] The white board area matches exactly where the pencil actually draws —
      no white margin that looks drawable but isn't.
- [ ] Rotate the iPad mid-word: the drawing stays on the board and the canvas
      re-fits to the new shape.
- [ ] Both orientations: nothing is clipped and no page scrolls except the
      parent Review screen.
