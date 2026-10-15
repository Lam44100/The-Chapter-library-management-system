import { chromium } from "playwright";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Run against a fresh local demo; the walkthrough exercises each sample role.
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../docs/media");
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: {
    dir: path.resolve(here, "../../.tools/capture"),
    size: { width: 1440, height: 1000 },
  },
  baseURL: process.env.BASE_URL || "http://127.0.0.1:8080",
});
const page = await context.newPage();
await page.goto("/");
await page
  .getByRole("heading", { name: "Pride and Prejudice", exact: true })
  .waitFor();
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: path.join(out, "catalog-desktop.png"),
  fullPage: true,
});
await page.waitForTimeout(2500);
await page.getByRole("textbox", { name: "Search books" }).fill("Austen");
await page.getByRole("button", { name: "Search", exact: true }).click();
await page.waitForTimeout(1500);
await page
  .getByRole("link")
  .filter({
    has: page.getByRole("heading", {
      name: "Pride and Prejudice",
      exact: true,
    }),
  })
  .click();
await page.getByRole("heading", { name: "Copies in the library" }).waitFor();
await page.screenshot({
  path: path.join(out, "book-detail.png"),
  fullPage: true,
});
await page.waitForTimeout(2500);
await page.goto("/login");
await page.getByRole("button", { name: /Explore as member/i }).waitFor();
await page.screenshot({
  path: path.join(out, "demo-roles.png"),
  fullPage: true,
});
await page.waitForTimeout(2200);
await page.getByRole("button", { name: /Explore as member/i }).click();
await page
  .getByRole("link")
  .filter({
    has: page.getByRole("heading", { name: "The Alchemist", exact: true }),
  })
  .click();
await page.getByRole("button", { name: "Reserve this book" }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Reservation placed" })
  .waitFor();
await page.getByRole("link", { name: "My reservations", exact: true }).click();
const reservation = page.getByRole("row").filter({ hasText: "The Alchemist" });
await reservation.getByRole("button", { name: "Cancel reservation" }).waitFor();
await page.waitForTimeout(3000);
await reservation.getByRole("button", { name: "Cancel reservation" }).click();
await page.getByRole("link", { name: "My loans", exact: true }).click();
await page.getByRole("button", { name: "Loan history", exact: true }).waitFor();
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Loan history", exact: true }).click();
await page.waitForTimeout(1800);
await page.getByRole("link", { name: "My reservations", exact: true }).click();
await page.waitForTimeout(2200);
await page.getByRole("button", { name: "Sign out" }).click();
await page.goto("/login");
await page.getByRole("button", { name: /Explore as librarian/i }).click();
await page
  .getByRole("heading", { name: "Overdue, but not forgotten" })
  .waitFor();
await page.screenshot({
  path: path.join(out, "staff-dashboard.png"),
  fullPage: true,
});
await page.waitForTimeout(3000);
await page.getByRole("link", { name: "Circulation", exact: true }).click();
await page.getByRole("heading", { name: "Issue a book" }).waitFor();
await page.waitForTimeout(2500);
await page
  .getByRole("combobox", { name: "Member", exact: true })
  .selectOption({ label: "Charlie Lim · active" });
await page
  .getByRole("combobox", { name: "Title", exact: true })
  .selectOption({ label: "The Odyssey" });
await page
  .getByRole("combobox", { name: "Copy", exact: true })
  .selectOption({ index: 1 });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Issue book", exact: true }).click();
await page.getByRole("status").filter({ hasText: "Book issued" }).waitFor();
const loan = page
  .getByRole("row")
  .filter({ hasText: "The Odyssey" })
  .filter({ hasText: "Charlie Lim" });
await loan.scrollIntoViewIfNeeded();
await page.waitForTimeout(3000);
await loan.getByRole("button", { name: "Return", exact: true }).click();
await page.getByRole("status").filter({ hasText: "Book returned" }).waitFor();
await page.getByRole("button", { name: "Loan history", exact: true }).click();
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Sign out" }).click();
await page.goto("/login");
await page.getByRole("button", { name: /Explore as admin/i }).click();
await page.getByRole("link", { name: "Management", exact: true }).click();
await page
  .getByRole("heading", { name: "The collection", exact: true })
  .waitFor();
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Accounts", exact: true }).click();
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Sign out" }).click();
await page.goto("/");
await page.waitForTimeout(2000);
const video = page.video();
await context.close();
await copyFile(await video.path(), path.join(out, "chapter-demo.webm"));
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
await mobile.goto(process.env.BASE_URL || "http://127.0.0.1:8080");
await mobile
  .getByRole("heading", { name: "Pride and Prejudice", exact: true })
  .waitFor();
await mobile.evaluate(() => document.fonts.ready);
await mobile.screenshot({
  path: path.join(out, "catalog-mobile.png"),
  fullPage: true,
});
await browser.close();
console.log(`Screenshots and recording saved to ${out}`);
