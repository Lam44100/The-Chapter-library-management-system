import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
async function role(page: Page, name: string) {
  await page.goto("/login");
  await page
    .getByRole("button", { name: new RegExp("Explore as " + name, "i") })
    .click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("invalid management input is rejected before saving", async ({ page }) => {
  await role(page, "admin");
  await page.getByRole("link", { name: "Management", exact: true }).click();
  await page.getByRole("button", { name: "Authors", exact: true }).click();
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  expect(
    await page
      .getByLabel("Author name")
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBeTruthy();
  await expect(page.getByLabel("Author name")).toBeFocused();
});

test("two staff visitors get a clear conflict for the same copy", async ({
  browser,
}) => {
  const baseURL = process.env.BASE_URL || "http://127.0.0.1:8080";
  const first = await browser.newPage({ baseURL });
  const second = await browser.newPage({ baseURL });
  for (const page of [first, second]) {
    await role(page, "librarian");
    await page.getByRole("link", { name: "Circulation", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Member", exact: true })
      .selectOption({ label: "Charlie Lim · active" });
    await page
      .getByRole("combobox", { name: "Title", exact: true })
      .selectOption({ label: "Thinking, Fast and Slow" });
    await page
      .getByRole("combobox", { name: "Copy", exact: true })
      .selectOption({ index: 1 });
  }
  await first.getByRole("button", { name: "Issue book", exact: true }).click();
  await expect(
    first.getByRole("status").filter({ hasText: "Book issued" }),
  ).toBeVisible();
  await second.getByRole("button", { name: "Issue book", exact: true }).click();
  await expect(second.getByRole("alert")).toContainText("unavailable");
  await first
    .getByRole("row")
    .filter({ hasText: "Thinking, Fast and Slow" })
    .getByRole("button", { name: "Return", exact: true })
    .click();
  await expect(
    first.getByRole("status").filter({ hasText: "Book returned" }),
  ).toBeVisible();
  await first.close();
  await second.close();
});
test("catalog search, details, and responsive reading experience", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your next chapter/ }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search books" }).fill("Austen");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pride and Prejudice", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", {
        name: "Pride and Prejudice",
        exact: true,
      }),
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Copies in the library" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your next chapter/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
});
test("member reserves and cancels a book, and views loan history", async ({
  page,
}) => {
  await role(page, "member");
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: "The Alchemist", exact: true }),
    })
    .click();
  await page.getByRole("button", { name: "Reserve this book" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Reservation placed" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "My reservations", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "The Alchemist" });
  await expect(row).toContainText("ready");
  await row.getByRole("button", { name: "Cancel reservation" }).click();
  await expect(row).toContainText("cancelled");
  await page.getByRole("link", { name: "My loans", exact: true }).click();
  await page.getByRole("button", { name: "Loan history", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Returned", exact: true }).first(),
  ).toBeVisible();
});
test("librarian issues and returns a copy with persisted history", async ({
  page,
}) => {
  await role(page, "librarian");
  await page.getByRole("link", { name: "Circulation", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Member", exact: true })
    .selectOption({ label: "Charlie Lim · active" });
  const title = page.getByRole("combobox", { name: "Title", exact: true });
  await title.selectOption({ label: "The Odyssey" });
  const copy = page.getByRole("combobox", { name: "Copy", exact: true });
  await copy.selectOption({ index: 1 });
  await page.getByRole("button", { name: "Issue book", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Book issued" }),
  ).toBeVisible();
  const row = page
    .getByRole("row")
    .filter({ hasText: "The Odyssey" })
    .filter({ hasText: "Charlie Lim" });
  await row.getByRole("button", { name: "Return", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Book returned" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Loan history", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "The Odyssey" }),
  ).toContainText("Returned");
});
test("admin creates, edits, and archives a record while demo accounts stay protected", async ({
  page,
}) => {
  await role(page, "admin");
  await page.getByRole("link", { name: "Management", exact: true }).click();
  await page.getByRole("button", { name: "Authors", exact: true }).click();
  await page.getByLabel("Author name").fill("Browser Test Writer");
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "record saved" }),
  ).toBeVisible();
  const row = page
    .locator("div")
    .filter({ has: page.getByText("Browser Test Writer", { exact: true }) })
    .filter({ has: page.getByRole("button", { name: "Edit", exact: true }) })
    .last();
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Author name").fill("Browser Test Writer Revised");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByRole("button", {
      name: "Archive Browser Test Writer Revised",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Confirm archive" }).click();
  await expect(
    page.getByText("Browser Test Writer Revised", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await expect(page.getByText("Demo account", { exact: true })).toHaveCount(6);
});

test("restart preserves records and operator reset ends existing sessions", async ({
  page,
}) => {
  test.setTimeout(120000);
  const compose = fileURLToPath(new URL("../../compose.yaml", import.meta.url));
  const docker = (...args: string[]) =>
    execFileSync("docker", ["compose", "-f", compose, ...args], {
      timeout: 60000,
      stdio: "pipe",
    });
  await role(page, "admin");
  await page.getByRole("link", { name: "Management", exact: true }).click();
  await page.getByRole("button", { name: "Authors", exact: true }).click();
  await page.getByLabel("Author name").fill("Restart Persistence Writer");
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "record saved" }),
  ).toBeVisible();
  docker("restart", "app");
  await expect
    .poll(
      async () => {
        try {
          return (await page.request.get("/actuator/health")).status();
        } catch {
          return 0;
        }
      },
      { timeout: 60000 },
    )
    .toBe(200);
  await role(page, "admin");
  await page.getByRole("link", { name: "Management", exact: true }).click();
  await page.getByRole("button", { name: "Authors", exact: true }).click();
  await expect(
    page.getByText("Restart Persistence Writer", { exact: true }),
  ).toBeVisible();
  docker(
    "exec",
    "-T",
    "app",
    "java",
    "-jar",
    "/app/app.jar",
    "--server.port=0",
    "--library.reset-on-start=true",
  );
  await page.getByRole("link", { name: "Circulation", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Step inside/ }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("session ended");
});
