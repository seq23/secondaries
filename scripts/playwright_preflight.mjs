// Runs before `playwright test`. Launches the exact Chromium the suite will use and, if it cannot
// start, stops with the one command that fixes it — instead of every spec failing with an opaque
// "spawn Unknown system error -88".
// Why (23 Sep 2026): ~/Library/Caches/ms-playwright/chromium-1124 held a truncated extraction
// (a 212 KB Mach-O, no Frameworks) that still carried the DEPENDENCIES_VALIDATED marker, so
// Playwright treated it as installed and `npx playwright install chromium` skipped it. macOS
// refused to exec it (EBADMACHO = -88). Only `install --force` replaces a marked-complete install.
import { chromium } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const override = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const bundled = chromium.executablePath();
const rev = (bundled.match(/chromium-(\d+)/) || [])[1];
const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), os.platform() === "darwin" ? "Library/Caches/ms-playwright" : ".cache/ms-playwright");
try {
  const browser = await chromium.launch(override ? { executablePath: override } : {});
  const version = browser.version();
  await browser.close();
  console.log(`playwright preflight: Chromium ${version} launches${override ? ` (PLAYWRIGHT_CHROMIUM_PATH=${override})` : ""}`);
} catch (err) {
  const first = String(err?.message || err).split("\n").find((l) => l.trim()) || "unknown error";
  console.error("playwright preflight FAILED: Chromium will not launch, so every spec would fail.");
  console.error(`  error: ${first}`);
  if (override) {
    console.error(`  PLAYWRIGHT_CHROMIUM_PATH=${override} is not a working Chromium. Unset it, or point it at one that runs.`);
  } else {
    console.error(`  expected browser: ${cache}/chromium-${rev} and ${cache}/chromium_headless_shell-${rev}`);
    console.error("  fix (replaces a missing, truncated or quarantined install, even one marked complete):");
    console.error("    npx playwright install --force chromium");
  }
  process.exit(1);
}
