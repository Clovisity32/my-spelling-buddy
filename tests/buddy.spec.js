import { test, expect } from "@playwright/test";

async function seedList(page, name) {
  await page.goto("/");
  await page.evaluate(async (listName) => {
    const list = await window.__storage.createList(listName);
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "owl",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
  }, name);
  await page.goto("/");
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText(name).click();
}

async function scribble(page) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  const at = (dx, dy) => ({
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + dx,
    clientY: box.y + dy,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerdown", at(10, 10));
  await canvas.dispatchEvent("pointermove", at(60, 60));
  await canvas.dispatchEvent("pointerup", at(60, 60));
}

test("Buddy waves on Home and reacts to a tap with a giggle", async ({
  page,
}) => {
  await page.goto("/");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  await expect(buddy).toBeVisible();
  await expect(buddy).toHaveAttribute("data-buddy-mood", "wave");

  await page.evaluate(() => {
    window.__giggles = 0;
    window.__audio.playBuddyGiggle = () => window.__giggles++;
    window.__audio.buddySay = () => {};
  });
  await buddy.click();
  await expect(buddy).toHaveAttribute("data-buddy-mood", /^r-/);
  expect(await page.evaluate(() => window.__giggles)).toBe(1);
  // Reaction ends and Buddy goes back to waving.
  await expect(buddy).toHaveAttribute("data-buddy-mood", "wave");
});

test("on the practice screen Buddy listens, goes slow for the hint, and cheers on Save", async ({
  page,
}) => {
  await seedList(page, "Buddy Practice");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  await expect(buddy).toHaveAttribute("data-buddy-mood", "idle");

  // A playback that never finishes keeps the mood on while we look at it.
  await page.evaluate(() => {
    window.__audio.playWordEntry = () => new Promise(() => {});
  });
  await page.getByRole("button", { name: "Play the word" }).click();
  await expect(buddy).toHaveAttribute("data-buddy-mood", "listen");

  await page.getByRole("button", { name: "Hint: say it slowly" }).click();
  await expect(buddy).toHaveAttribute("data-buddy-mood", "slow");

  await scribble(page);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(buddy).toHaveAttribute("data-buddy-mood", "cheer");
});

test("the practice-screen Buddy never changes the whiteboard's size", async ({
  page,
}) => {
  await seedList(page, "Buddy Layout");
  const canvas = page.locator("canvas");
  const before = await canvas.boundingBox();
  await page.evaluate(() => {
    window.__audio.playWordEntry = () => new Promise(() => {});
  });
  await page.getByRole("button", { name: "Hint: say it slowly" }).click();
  await scribble(page);
  await page.getByRole("button", { name: "Save" }).click();
  const after = await canvas.boundingBox();
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);
});

test("the celebration shows the Buddy family and each one plays its own note", async ({
  page,
}) => {
  await seedList(page, "Buddy Party");
  await scribble(page);
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.getByText(/You finished the whole list/)).toBeVisible();

  const family = page.getByLabel("Buddy and friends");
  await expect(family).toBeVisible();
  const members = family.getByRole("button");
  await expect(members).toHaveCount(7);

  await page.evaluate(() => {
    window.__notes = [];
    window.__audio.playBuddyNote = (i) => window.__notes.push(i);
  });
  await members.nth(2).click({ force: true });
  await members.nth(4).click({ force: true });
  expect(await page.evaluate(() => window.__notes)).toEqual([2, 4]);
});

test("with reduced motion on, Buddy stops moving", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Buddy", exact: true }),
  ).toBeVisible();
  const name = await page.evaluate(
    () => getComputedStyle(document.querySelector(".buddy-bob")).animationName,
  );
  expect(name).toBe("none");
});

async function completeSessions(page, n) {
  await page.goto("/");
  await page.evaluate(async (count) => {
    const list = await window.__storage.createList("Unlock List");
    const blob = new Blob(["a"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "owl",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    for (let i = 0; i < count; i++) {
      const s = await window.__storage.startSession(list.id);
      await window.__storage.completeSession(s.id ?? s);
    }
  }, n);
  await page.goto("/");
}

test("Dress up Buddy: choices are locked until earned, and a pick persists across reload", async ({
  page,
}) => {
  await completeSessions(page, 2);
  await page.getByRole("button", { name: "Dress up Buddy" }).click();

  // 2 practices: sky + crown + sunglasses are open; party hat needs 4.
  await expect(
    page.getByRole("button", { name: "Party hat, locked" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Rose colour, locked" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Lavender colour" }).click();
  await page.getByRole("button", { name: "Crown" }).click();
  await expect(page.getByRole("button", { name: "Crown" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Wait for the write to land before reloading, or the reload can cut it off.
  await expect
    .poll(() => page.evaluate(() => window.__storage.getBuddyStyle()))
    .toEqual({ color: "lavender", accessory: "crown" });
  await page.reload();
  expect(await page.evaluate(() => window.__storage.getBuddyStyle())).toEqual({
    color: "lavender",
    accessory: "crown",
  });

  // The choice shows up on Home's Buddy (crown path is only drawn when worn).
  await expect(page.locator(".buddy svg path[fill='#ffd54a']")).toHaveCount(1);
});

// storage's functions can't be stubbed (window.__storage is a module
// namespace), so back-date real sessions straight in IndexedDB instead.
async function backdateSessions(page, daysAgo) {
  await page.evaluate(async (days) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open("spelling-buddy");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const tx = db.transaction("sessions", "readwrite");
    const store = tx.objectStore("sessions");
    const all = await new Promise((res) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result);
    });
    all.forEach((s, i) =>
      store.put({ ...s, completedAt: Date.now() - days[i] * 86400000 }),
    );
    await new Promise((res) => (tx.oncomplete = res));
    db.close();
  }, daysAgo);
  await page.goto("/");
}

test("Buddy is sleepy after a few days away, and wakes up on a tap", async ({
  page,
}) => {
  await completeSessions(page, 1);
  await backdateSessions(page, [5]);
  await page.evaluate(() => {
    window.__audio.buddySay = () => {};
  });
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  await expect(buddy).toHaveAttribute("data-buddy-mood", "sleepy");
  await expect(page.getByText("Zzz")).toBeVisible();

  await buddy.click();
  await expect(page.getByText(/I missed you/)).toBeVisible();
  await expect(buddy).not.toHaveAttribute("data-buddy-mood", "sleepy");
});

test("Buddy dances on Home once she has a 3-day practice streak", async ({
  page,
}) => {
  await completeSessions(page, 3);
  await backdateSessions(page, [0, 1, 2]);
  await expect(
    page.getByRole("button", { name: "Buddy", exact: true }),
  ).toHaveAttribute("data-buddy-mood", "dance");
  await expect(page.getByText(/3 days in a row/)).toBeVisible();
});

test("a fresh install is not sleepy and does not dance", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Buddy", exact: true }),
  ).toHaveAttribute("data-buddy-mood", "wave");
});

test("Buddy waves gently if the board sits untouched on the practice screen", async ({
  page,
}) => {
  await page.clock.install();
  await seedList(page, "Buddy Nudge");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  await expect(buddy).toHaveAttribute("data-buddy-mood", "idle");
  await page.clock.fastForward(30000);
  await expect(buddy).toHaveAttribute("data-buddy-mood", "wave");
  // Touching the board settles it again.
  await page.locator("canvas").dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 200,
    clientY: 300,
    isPrimary: true,
  });
  await expect(buddy).toHaveAttribute("data-buddy-mood", "idle");
});

test("holding Buddy gives it a hug (purr, happy eyes) and letting go gives an aww, not a tap reaction", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.__events = [];
    window.__audio.startBuddyPurr = async () => {
      window.__events.push("purr");
      return () => window.__events.push("purr-stop");
    };
    window.__audio.playBuddyAww = () => window.__events.push("aww");
    window.__audio.playBuddyGiggle = () => window.__events.push("giggle");
  });
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const box = await buddy.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(buddy).toHaveClass(/buddy--pressed/);
  await expect(buddy).toHaveAttribute("data-buddy-mood", "hug");
  await page.mouse.up();
  await expect(buddy).not.toHaveAttribute("data-buddy-mood", "hug");
  await expect(buddy).toHaveClass(/buddy--boing/);
  // The click that follows a long press must not also giggle.
  expect(await page.evaluate(() => window.__events)).toEqual([
    "purr",
    "purr-stop",
    "aww",
  ]);
});

test("a quick tap squishes and giggles but does not hug", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.__events = [];
    window.__audio.startBuddyPurr = async () => {
      window.__events.push("purr");
      return () => {};
    };
    window.__audio.playBuddyGiggle = () => window.__events.push("giggle");
    window.__audio.buddySay = () => {};
  });
  await page.getByRole("button", { name: "Buddy", exact: true }).click();
  expect(await page.evaluate(() => window.__events)).toEqual(["giggle"]);
});

test("Celebration announces what Buddy just unlocked, and links to dress-up", async ({
  page,
}) => {
  await seedList(page, "Unlock Party");
  // This is her 1st practice: the sky colour and the crown open at 1.
  await scribble(page);
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.getByText(/Buddy has something new/)).toBeVisible();
  await expect(page.getByText("Crown")).toBeVisible();
  await page.getByRole("button", { name: "Dress up Buddy" }).click();
  await expect(page.getByText("Dress up Buddy").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Crown" })).toBeEnabled();
});

test("Buddy appears in the Parents and history headers too", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Parents" }).click();
  await expect(
    page.getByRole("button", { name: "Buddy", exact: true }),
  ).toBeVisible();
});

const poseOf = async (buddy) =>
  (await buddy.getAttribute("data-buddy-pose")).split(",").map(Number);

test("dragging Buddy moves it, without hugging or counting as a tap, and Put Buddy back resets it", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.__events = [];
    window.__audio.startBuddyPurr = async () => {
      window.__events.push("purr");
      return () => {};
    };
    window.__audio.playBuddyGiggle = () => window.__events.push("giggle");
    window.__audio.buddySay = () => window.__events.push("say");
  });
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const b = await buddy.boundingBox();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy + 20, { steps: 5 });
  await page.mouse.move(cx + 150, cy + 80, { steps: 5 });
  await page.mouse.up();

  const [x, y] = await poseOf(buddy);
  expect(x).toBeGreaterThan(100);
  expect(y).toBeGreaterThan(40);
  const moved = await buddy.boundingBox();
  expect(moved.x).toBeGreaterThan(b.x + 100);
  // One pick-up chirp; no purr, and the release was not also a tap (a tap
  // would add a second giggle and a spoken line).
  expect(await page.evaluate(() => window.__events)).toEqual(["giggle"]);

  await page.getByRole("button", { name: /Put Buddy back/ }).click();
  await expect.poll(() => poseOf(buddy)).toEqual([0, 0, 0]);
  await expect(
    page.getByRole("button", { name: /Put Buddy back/ }),
  ).toHaveCount(0);
});

test("Buddy cannot be dragged off the screen", async ({ page }) => {
  await page.goto("/");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const b = await buddy.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(-400, -400, { steps: 8 });
  await page.mouse.up();
  // Poll: Buddy straightens up from its drag lean over a short transition.
  await expect
    .poll(async () => (await buddy.boundingBox()).x)
    .toBeGreaterThanOrEqual(-1);
  await expect
    .poll(async () => (await buddy.boundingBox()).y)
    .toBeGreaterThanOrEqual(-1);
});

test("the mouse wheel rotates Buddy", async ({ page }) => {
  await page.goto("/");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const b = await buddy.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.wheel(0, 200);
  await expect.poll(async () => (await poseOf(buddy))[2]).toBe(30);
});

test("a two-finger twist rotates Buddy", async ({ page }) => {
  await page.goto("/");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const b = await buddy.boundingBox();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  await buddy.evaluate(
    (el, p) => {
      const fire = (type, id, x, y) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id,
            pointerType: "touch",
            isPrimary: id === 1,
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
      fire("pointerdown", 1, p.cx - 40, p.cy);
      fire("pointerdown", 2, p.cx + 40, p.cy);
      // Second finger swings a quarter turn around the first.
      fire("pointermove", 2, p.cx - 40, p.cy + 80);
    },
    { cx, cy },
  );
  await expect.poll(async () => Math.round((await poseOf(buddy))[2])).toBe(90);
});

test("Buddy's voice: a pi-ka-chu chirp, then a babble of chirps instead of speech synthesis", async ({
  page,
}) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    const ms = await window.__audio.playBuddyChirp(1);
    const spoken = [];
    window.speechSynthesis.speak = (u) => spoken.push(u.text);
    await window.__audio.buddySay("Hello!");
    return { ms, spoken };
  });
  expect(out.ms).toBeGreaterThan(300);
  expect(out.spoken).toEqual([]); // a man-sized TTS voice is never used
});

test("pinching resizes Buddy within limits", async ({ page }) => {
  await page.goto("/");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const b = await buddy.boundingBox();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const pinch = (dist) =>
    buddy.evaluate(
      (el, p) => {
        const fire = (type, id, x, y) =>
          el.dispatchEvent(
            new PointerEvent(type, {
              pointerId: id,
              pointerType: "touch",
              isPrimary: id === 1,
              clientX: x,
              clientY: y,
              bubbles: true,
            }),
          );
        fire("pointerdown", 1, p.cx - 40, p.cy);
        fire("pointerdown", 2, p.cx + 40, p.cy);
        fire("pointermove", 2, p.cx - 40 + p.dist, p.cy);
        fire("pointerup", 2, p.cx - 40 + p.dist, p.cy);
        fire("pointerup", 1, p.cx - 40, p.cy);
      },
      { cx, cy, dist },
    );
  const scale = async () =>
    Number(await buddy.getAttribute("data-buddy-scale"));

  await pinch(120); // fingers 80px -> 120px apart: 1.5x
  await expect.poll(scale).toBeCloseTo(1.5, 1);
  await pinch(5000); // far too big: capped
  await expect.poll(scale).toBe(2);
});

test("Buddy cannot be shrunk to nothing", async ({ page }) => {
  await page.goto("/");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const b = await buddy.boundingBox();
  await buddy.evaluate(
    (el, p) => {
      const fire = (type, id, x, y) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id,
            pointerType: "touch",
            isPrimary: id === 1,
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
      fire("pointerdown", 1, p.cx - 40, p.cy);
      fire("pointerdown", 2, p.cx + 40, p.cy);
      fire("pointermove", 2, p.cx - 39, p.cy);
    },
    { cx: b.x + b.width / 2, cy: b.y + b.height / 2 },
  );
  await expect
    .poll(async () => Number(await buddy.getAttribute("data-buddy-scale")))
    .toBe(0.6);
});

test("ctrl+wheel (trackpad pinch) resizes Buddy, plain wheel only rotates", async ({
  page,
}) => {
  await page.goto("/");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const b = await buddy.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -50);
  await page.keyboard.up("Control");
  await expect
    .poll(async () => Number(await buddy.getAttribute("data-buddy-scale")))
    .toBeGreaterThan(1);
  expect((await poseOf(buddy))[2]).toBe(0);
});

test("on the dress-up screen Buddy can be dragged and shares Home's pose", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dress up Buddy" }).click();
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const b = await buddy.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 120, b.y + b.height / 2 + 60, {
    steps: 6,
  });
  await page.mouse.up();
  await expect.poll(async () => (await poseOf(buddy))[0]).toBeGreaterThan(80);

  await page.getByRole("button", { name: "Back", exact: true }).click();
  const home = page.getByRole("button", { name: "Buddy", exact: true });
  expect((await poseOf(home))[0]).toBeGreaterThan(80);
  await expect(
    page.getByRole("button", { name: /Put Buddy back/ }),
  ).toBeVisible();
});

test("Home scene: sky follows the time of day and Buddy comes out with the day's action", async ({
  page,
}) => {
  const scene = page.getByLabel("Buddy's neighbourhood");
  for (const [hour, phase] of [
    [12, "day"],
    [22, "night"],
    [6, "dawn"],
    [18, "dusk"],
  ]) {
    await page.goto(`/?hour=${hour}`);
    await expect(scene).toHaveAttribute("data-time-of-day", phase);
  }
  await expect(scene).toHaveAttribute("data-buddy-action", /\w+/);
  await page.goto("/?hour=23");
  await expect(scene.locator(".scene-moon")).toHaveCount(1);
  await expect(scene.locator(".scene-star").first()).toBeAttached();
});

test("tapping Buddy can spin it around any 3D axis", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.evaluate(() => (window.__audio.buddySay = () => {}));
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  const seen = new Set();
  for (let i = 0; i < 40 && seen.size < 3; i++) {
    await buddy.click();
    const mood = await buddy.getAttribute("data-buddy-mood");
    if (/spin[xyz]|tumble/.test(mood)) seen.add(mood);
    await page.waitForTimeout(1350);
  }
  expect(seen.size).toBeGreaterThanOrEqual(3);
});

test("Buddy's voice is a high chirp babble, not speech synthesis", async ({
  page,
}) => {
  await page.goto("/");
  const ms = await page.evaluate(() =>
    window.__audio.playBuddyBabble("Hi Chloe!"),
  );
  expect(ms).toBeGreaterThan(0);
});

test("the celebration can show each party style", async ({ page }) => {
  for (const style of ["sing", "run", "queue"]) {
    await seedList(page, `Party ${style}`);
    await page.goto(`/?party=${style}`);
    await page.getByRole("button", { name: "Practise" }).click();
    await page.getByText(`Party ${style}`).click();
    await scribble(page);
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Next word" }).click();
    await expect(page.getByLabel("Buddy and friends")).toHaveAttribute(
      "data-party",
      style,
    );
  }
});

test("each Home friend answers a tap in its own voice and bubble", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.__babbles = [];
    window.__audio.playBuddyBabble = (t, p, tempo) =>
      window.__babbles.push([t, p, tempo]);
  });
  await page.getByRole("button", { name: "lavender friend" }).click();
  await page.getByRole("button", { name: "butter friend" }).click();
  await expect(page.getByText("Let's play!")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__babbles.length)).toBe(2);
  const [a, b] = await page.evaluate(() => window.__babbles);
  expect(a[1]).not.toEqual(b[1]); // different pitch
  expect(a[2]).not.toEqual(b[2]); // different speed
});

test("Buddy's speech bubble stays inside the scene", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const scene = await page.getByLabel("Buddy's neighbourhood").boundingBox();
  const bubble = await page.locator(".scene-bubble").boundingBox();
  expect(bubble.x + bubble.width).toBeLessThanOrEqual(scene.x + scene.width);
});

test("the Home scene fills the whole page, not a box", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await page.goto("/");
  const scene = await page.getByLabel("Buddy's neighbourhood").boundingBox();
  expect(scene.x).toBe(0);
  expect(scene.y).toBe(0);
  expect(scene.width).toBe(820);
  expect(scene.height).toBe(1000);
});

test("Buddy can go home, and knocking on the door brings it back out", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.__knocks = 0;
    window.__audio.playKnock = () => window.__knocks++;
    window.__audio.buddySay = () => {};
  });
  const scene = page.getByLabel("Buddy's neighbourhood");
  const buddy = page.getByRole("button", { name: "Buddy", exact: true });
  await expect(scene).toHaveAttribute("data-buddy-presence", "out");

  await page.getByRole("button", { name: "Send Buddy home" }).click();
  await expect(scene).toHaveAttribute("data-buddy-presence", "in");
  await expect(buddy).toBeHidden();
  await expect(page.getByText("Knock, knock on my door")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send Buddy home" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Knock on Buddy's door" }).click();
  await expect(scene).toHaveAttribute("data-buddy-presence", "out");
  await expect(buddy).toBeVisible();
  expect(await page.evaluate(() => window.__knocks)).toBe(1);
});

test("with Buddy indoors, tapping a friend knocks on the door", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => (window.__audio.buddySay = () => {}));
  const scene = page.getByLabel("Buddy's neighbourhood");
  await page.getByRole("button", { name: "Send Buddy home" }).click();
  await expect(scene).toHaveAttribute("data-buddy-presence", "in");
  await page.getByRole("button", { name: "mint friend" }).click();
  await expect(scene).toHaveAttribute("data-buddy-presence", "out");
});
