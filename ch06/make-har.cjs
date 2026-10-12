const { chromium } = require(process.argv[2]);
(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const context = await browser.newContext({ recordHar: { path: "notes-web.har", content: "embed" } });
  const page = await context.newPage();
  await page.goto("https://rea.tools/examples/notes-web/");
  const dl = page.waitForEvent("download").catch(() => null);
  await page.click("#export");
  await page.waitForTimeout(1500);
  console.log("status:", await page.textContent("#status"));
  const d = await dl; if (d) console.log("download:", d.suggestedFilename());
  await context.close(); await browser.close();
})();
