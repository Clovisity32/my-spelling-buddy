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
