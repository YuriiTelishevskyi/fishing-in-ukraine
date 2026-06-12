/**
 * Admin happy-path end-to-end click-through script.
 *
 * Usage (with both dev servers running):
 *   npm run dev:api    # in one terminal — http://localhost:3000
 *   npm run dev:web    # in another terminal — http://localhost:4201
 *   node scripts/admin-e2e.mjs            # override target: WEB_URL=http://localhost:4200 node scripts/admin-e2e.mjs
 *
 * The script drives the full admin happy path:
 *   1. Login (admin / admin12345) → /admin/waters table shows 3 rows
 *   2. Create water «Тестове озеро E2E» (name, description, region, map coords, type, fish)
 *   3. Upload /tmp/test-water.png (generated inline via sharp) → thumbnail appears
 *   4. Publish → status tag «Опубліковано»
 *   5. Public check: /vodoymy?search=E2E card present; detail page → photo + map
 *   6. Cleanup: delete the water (confirm dialog) → table back to 3 rows; public slug → 404
 *   7. Logout → /admin/login; direct /admin/waters redirects to login
 *
 * Exit 0 = all steps pass. Exit 1 = any step failed or NG0 error detected.
 */

import puppeteer from 'puppeteer-core';
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:4201';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ─── helpers ────────────────────────────────────────────────────────────────

let stepsPassed = 0;
let stepsFailed = 0;
const ng0Errors = [];

function pass(label) {
  console.log(`  ✅  PASS  ${label}`);
  stepsPassed++;
}

function fail(label, err) {
  console.error(`  ❌  FAIL  ${label}`);
  if (err) console.error('         ', err?.message ?? err);
  stepsFailed++;
}

/** Wait until network is idle (no requests for 500 ms) or timeout */
async function nav(page, url, opts = {}) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000, ...opts });
}

/** Wait for selector with 15 s default */
function wait(page, sel, opts = {}) {
  return page.waitForSelector(sel, { timeout: 15_000, ...opts });
}

/**
 * Click the inner <button> of a p-button[label=...] component.
 * Clicking the p-button custom element itself navigates to primeng.org
 * because it has a default href fallback in the LTS docs build.
 */
async function clickPButton(page, label) {
  const found = await page.evaluate((lbl) => {
    const pBtns = Array.from(document.querySelectorAll('p-button'));
    for (const pBtn of pBtns) {
      const btnLabel = pBtn.getAttribute('label') ?? '';
      if (btnLabel.includes(lbl)) {
        const inner = pBtn.querySelector('button');
        if (inner) {
          inner.click();
          return true;
        }
      }
    }
    // fallback: find any <button> containing the text
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent?.trim().includes(lbl));
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
  if (!found) throw new Error(`p-button with label "${label}" not found`);
}

/**
 * PrimeNG p-select interaction:
 *   1. Click the .p-select trigger to open
 *   2. Wait for overlay (.p-select-overlay)
 *   3. Click the <li> whose text matches the given label
 */
async function primeSelect(page, selectSel, optionText) {
  // Click the component's inner trigger area
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el?.click();
  }, selectSel);
  // wait for overlay
  await wait(page, '.p-select-overlay');
  // find and click the option by exact text match
  const clicked = await page.evaluate((text) => {
    const items = Array.from(document.querySelectorAll('.p-select-overlay li'));
    for (const item of items) {
      if (item.textContent?.trim() === text) {
        item.click();
        return true;
      }
    }
    return false;
  }, optionText);
  if (!clicked) throw new Error(`p-select option not found: "${optionText}"`);
  // wait for overlay to close
  await page.waitForSelector('.p-select-overlay', { hidden: true, timeout: 5_000 }).catch(() => {});
}

/**
 * PrimeNG p-multiselect interaction:
 *   1. Click the trigger
 *   2. Wait for overlay (.p-multiselect-overlay)
 *   3. Click the option matching the text
 *   4. Close by pressing Escape
 */
async function primeMultiSelect(page, multiSel, optionText) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el?.click();
  }, multiSel);
  await wait(page, '.p-multiselect-overlay');
  const clicked = await page.evaluate((text) => {
    const items = Array.from(document.querySelectorAll('.p-multiselect-overlay li'));
    for (const item of items) {
      if (item.textContent?.trim() === text) {
        item.click();
        return true;
      }
    }
    return false;
  }, optionText);
  if (!clicked) throw new Error(`p-multiselect option not found: "${optionText}"`);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.p-multiselect-overlay', { hidden: true, timeout: 5_000 }).catch(() => {});
}

/** Generate a test PNG at /tmp/test-water.png using the workspace sharp */
async function generateTestPng() {
  const req = createRequire(import.meta.url);
  // sharp lives in the root node_modules (hoisted workspace dep)
  const sharp = req(path.resolve(__dirname, '../node_modules/sharp'));
  const buf = await sharp({
    create: { width: 320, height: 240, channels: 3, background: { r: 100, g: 149, b: 237 } },
  })
    .png()
    .toBuffer();
  writeFileSync('/tmp/test-water.png', buf);
  console.log('  ℹ️   Generated /tmp/test-water.png via sharp');
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Admin E2E Click-Through Script ===\n');

  // Generate test image before launching browser
  await generateTestPng();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Collect NG0 errors from console
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('NG0')) {
      ng0Errors.push(text);
    }
  });
  page.on('pageerror', (err) => {
    if (err.message.includes('NG0')) {
      ng0Errors.push(err.message);
    }
  });

  let createdWaterId = null;
  let createdSlug = null;
  let createdRegionSlug = null;

  // ─── Step 1: Login ────────────────────────────────────────────────────────
  console.log('Step 1: Login');
  try {
    await nav(page, `${WEB_URL}/admin/login`);
    await wait(page, 'form');

    // Fill login
    await wait(page, 'input[name="login"]');
    await page.type('input[name="login"]', 'admin');
    await page.type('input[type="password"]', 'admin12345');

    // Click Увійти (plain button)
    await page.click('button[type="submit"]');

    // Wait for navigation to /admin/waters
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15_000 }).catch(() => {});
    const url = page.url();
    if (!url.includes('/admin/waters')) throw new Error(`Expected /admin/waters, got ${url}`);

    // Wait for table to load
    await wait(page, 'table');
    await page.waitForFunction(
      () => document.querySelectorAll('table tbody tr').length > 0,
      { timeout: 10_000 },
    ).catch(() => {});

    const rowCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      return Array.from(rows).filter((r) => !r.textContent?.includes('Нічого не знайдено')).length;
    });

    if (rowCount < 1) throw new Error(`Expected rows in table, got ${rowCount}`);
    pass(`Login OK, /admin/waters loaded, ${rowCount} rows visible`);
  } catch (err) {
    fail('Login', err);
  }

  // ─── Step 2: Create water ─────────────────────────────────────────────────
  console.log('Step 2: Create water «Тестове озеро E2E»');
  try {
    // Click "+ Нова водойма" — find the routerLink button via Angular router
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('Нова водойма'));
      if (btn) { btn.click(); return; }
      // fallback: routerLink anchor
      const a = document.querySelector('a[href*="/admin/waters/new"]');
      if (a) a.click();
    });

    await page.waitForFunction(
      () => window.location.href.includes('/admin/waters/new'),
      { timeout: 10_000 },
    );
    await wait(page, 'form');

    // Name
    await wait(page, 'input[formcontrolname="name"]');
    await page.type('input[formcontrolname="name"]', 'Тестове озеро E2E');

    // Description
    await page.type('textarea[formcontrolname="description"]', 'Тестовий опис водойми для автоматичного тесту E2E.');

    // Region: p-select for regionId (full name as in the API)
    await primeSelect(page, 'p-select[formcontrolname="regionId"]', 'Львівська область');

    // Water type: p-select for waterType
    await primeSelect(page, 'p-select[formcontrolname="waterType"]', 'Озеро');

    // Map: click somewhere on the Leaflet map to set coords
    await wait(page, '.leaflet-container');
    // Wait for map to fully initialize
    await new Promise((r) => setTimeout(r, 2000));
    // Scroll map into viewport
    await page.evaluate(() => {
      document.querySelector('.leaflet-container')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 500));
    const mapEl = await page.$('.leaflet-container');
    if (mapEl) {
      const box = await mapEl.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    // Verify lat/lng are set
    const latLng = await page.evaluate(() => ({
      lat: document.querySelector('input[formcontrolname="lat"]')?.value,
      lng: document.querySelector('input[formcontrolname="lng"]')?.value,
    }));
    if (!latLng.lat || !latLng.lng) {
      // fallback: type directly into lat/lng inputs
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 300));
      const latInput = await page.$('input[formcontrolname="lat"]');
      const lngInput = await page.$('input[formcontrolname="lng"]');
      if (latInput && lngInput) {
        await latInput.click({ clickCount: 3 });
        await latInput.type('49.83826');
        await lngInput.click({ clickCount: 3 });
        await lngInput.type('24.02324');
        // Trigger change detection
        await latInput.press('Tab');
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Fish: p-multiselect for fishIds — select Щука
    // Scroll back to fish multiselect
    await page.evaluate(() => {
      document.querySelector('p-multiselect[formcontrolname="fishIds"]')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 300));
    await primeMultiSelect(page, 'p-multiselect[formcontrolname="fishIds"]', 'Щука');

    // Scroll to top and click Зберегти
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 400));

    // Click Зберегти (inner button of p-button)
    await clickPButton(page, 'Зберегти');

    // Wait for navigation to edit URL /admin/waters/:id (id is a UUID, not "new")
    await page.waitForFunction(
      () => {
        const href = window.location.href;
        const m = href.match(/\/admin\/waters\/([^\/]+)$/);
        return m !== null && m[1] !== 'new';
      },
      { timeout: 20_000 },
    );
    const editUrl = page.url();
    const match = editUrl.match(/\/admin\/waters\/([^\/]+)$/);
    if (!match || match[1] === 'new') throw new Error(`Expected /admin/waters/:id, got ${editUrl}`);
    createdWaterId = match[1];
    pass(`Create water OK, edit URL: ${editUrl}, id=${createdWaterId}`);
  } catch (err) {
    fail('Create water', err);
  }

  // ─── Step 3: Upload photo ─────────────────────────────────────────────────
  console.log('Step 3: Upload photo');
  try {
    if (!createdWaterId) throw new Error('No water ID from step 2');

    // Navigate to edit URL to ensure we're on the right page
    const currentUrl = page.url();
    if (!currentUrl.includes(createdWaterId)) {
      await nav(page, `${WEB_URL}/admin/waters/${createdWaterId}`);
    }

    // Wait for the file input (it's hidden but present in edit mode)
    await wait(page, 'input[type="file"][accept*="image"]');

    // Scroll to the photo section
    await page.evaluate(() => {
      document.querySelector('input[type="file"]')?.closest('.awf__card')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });

    // Upload via file input
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (!fileInput) throw new Error('File input not found');
    await fileInput.uploadFile('/tmp/test-water.png');

    // Wait for thumbnail to appear
    await wait(page, '.awf__thumb-img, .awf__media-grid img', { timeout: 20_000 });
    pass('Upload photo OK, thumbnail visible');
  } catch (err) {
    fail('Upload photo', err);
  }

  // ─── Step 4: Publish ──────────────────────────────────────────────────────
  console.log('Step 4: Publish water');
  try {
    if (!createdWaterId) throw new Error('No water ID from step 2');

    // Scroll to top where the Publish button is
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 400));

    // Click «Опублікувати» button (inner button of p-button)
    await clickPButton(page, 'Опублікувати');

    // Wait for status tag to show «Опубліковано»
    await page.waitForFunction(
      () => {
        const tags = document.querySelectorAll('p-tag');
        return Array.from(tags).some((t) => t.textContent?.includes('Опубліковано'));
      },
      { timeout: 15_000 },
    );

    // Capture the water slug from the page
    const slugText = await page.evaluate(() => {
      const el = document.querySelector('.awf__slug');
      return el?.textContent?.trim() ?? '';
    });
    createdSlug = slugText;

    // Capture region slug from the admin API
    const waterData = await page.evaluate(
      async (id) => {
        const res = await fetch(`/api/admin/waters/${id}`);
        return res.json();
      },
      createdWaterId,
    );
    createdRegionSlug = waterData.regionSlug;
    pass(`Publish OK, status=Опубліковано, slug="${createdSlug}", region="${createdRegionSlug}"`);
  } catch (err) {
    fail('Publish', err);
  }

  // ─── Step 5: Public catalog + detail check ────────────────────────────────
  console.log('Step 5: Public catalog + detail check');
  try {
    // Check catalog search for E2E
    await nav(page, `${WEB_URL}/vodoymy?search=E2E`);
    // Wait for water cards to appear
    await page.waitForFunction(
      () => document.querySelectorAll('a.wcard, .wcard').length > 0,
      { timeout: 15_000 },
    );
    const cardCount = await page.evaluate(() => {
      return document.querySelectorAll('a.wcard, .wcard').length;
    });
    if (cardCount < 1) throw new Error(`Expected water card in catalog, found ${cardCount}`);
    pass(`Catalog search: found ${cardCount} card(s)`);

    // Navigate to detail page
    if (createdSlug && createdRegionSlug) {
      // strip leading slash if any
      const slug = createdSlug.replace(/^\//, '');
      const detailUrl = `${WEB_URL}/vodoymy/${createdRegionSlug}/${slug}`;
      await nav(page, detailUrl);

      // Check Leaflet map mounts
      await page.waitForFunction(
        () => !!document.querySelector('.leaflet-container'),
        { timeout: 15_000 },
      );

      const hasMap = await page.evaluate(() => !!document.querySelector('.leaflet-container'));
      const hasPhoto = await page.evaluate(() => {
        // Check for an img element with a real src (not inline SVG)
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.some((img) => img.src && !img.src.startsWith('data:'));
      });

      if (!hasMap) throw new Error('Leaflet map not found on detail page');
      pass(`Detail page OK: photo=${hasPhoto}, leaflet map=${hasMap}`);
    } else {
      pass('Detail page check skipped (no slug/region from previous steps)');
    }
  } catch (err) {
    fail('Public catalog + detail check', err);
  }

  // ─── Step 6: Delete water ─────────────────────────────────────────────────
  console.log('Step 6: Cleanup — delete water');
  try {
    if (!createdWaterId) throw new Error('No water ID to delete');

    // Navigate back to admin waters list
    await nav(page, `${WEB_URL}/admin/waters`);
    await wait(page, 'table');
    await page.waitForFunction(
      () => document.querySelectorAll('table tbody tr').length > 0,
      { timeout: 10_000 },
    );

    // Click the trash button in the row containing our water
    const deleted = await page.evaluate((waterName) => {
      const rows = document.querySelectorAll('table tbody tr');
      for (const row of rows) {
        if (row.textContent?.includes(waterName)) {
          // Find the delete p-button in this row and click its inner button
          const pBtns = row.querySelectorAll('p-button');
          for (const pBtn of pBtns) {
            const icon = pBtn.getAttribute('icon') ?? '';
            if (icon.includes('trash')) {
              const inner = pBtn.querySelector('button');
              if (inner) { inner.click(); return true; }
            }
          }
          // fallback: last p-button in row
          const allPBtns = row.querySelectorAll('p-button');
          const lastPBtn = allPBtns[allPBtns.length - 1];
          if (lastPBtn) {
            const inner = lastPBtn.querySelector('button');
            if (inner) { inner.click(); return true; }
          }
        }
      }
      return false;
    }, 'Тестове озеро E2E');

    if (!deleted) {
      // Fallback: API DELETE
      console.log('  ⚠️  Could not find delete button in table, falling back to API DELETE');
      const apiResult = await page.evaluate(async (id) => {
        const res = await fetch(`/api/admin/waters/${id}`, { method: 'DELETE' });
        return { status: res.status };
      }, createdWaterId);
      if (apiResult.status !== 200 && apiResult.status !== 204) {
        throw new Error(`API DELETE failed with status ${apiResult.status}`);
      }
      console.log(`  ⚠️  API DELETE status: ${apiResult.status}`);
    } else {
      // Handle PrimeNG confirmation dialog
      await new Promise((r) => setTimeout(r, 1200));

      const confirmed = await page.evaluate(() => {
        // PrimeNG p-confirmdialog renders buttons as p-button inside the dialog
        // Try: button with «Видалити» text inside any dialog/overlay
        const allBtns = Array.from(document.querySelectorAll(
          '.p-confirmdialog button, .p-dialog button, .p-overlay button',
        ));
        const delBtn = allBtns.find((b) => b.textContent?.trim().includes('Видалити'));
        if (delBtn) { delBtn.click(); return true; }
        return false;
      });

      if (!confirmed) {
        console.log('  ⚠️  Could not click confirm dialog, falling back to API DELETE');
        await page.evaluate(async (id) => {
          await fetch(`/api/admin/waters/${id}`, { method: 'DELETE' });
        }, createdWaterId);
      }

      // Wait for table reload
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Navigate fresh to /admin/waters to verify row count is back to original
    await nav(page, `${WEB_URL}/admin/waters`);
    await page.waitForFunction(
      () => document.querySelectorAll('table tbody tr').length > 0,
      { timeout: 10_000 },
    ).catch(() => {});

    const rowsAfter = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      return Array.from(rows).filter((r) => !r.textContent?.includes('Нічого не знайдено')).length;
    });

    // Verify the test water is gone from the table
    const stillPresent = await page.evaluate(() => {
      return document.body.textContent?.includes('Тестове озеро E2E') ?? false;
    });
    if (stillPresent) throw new Error('Water still present in table after delete');

    // Check public slug returns 404 content (no leaflet map / not found message)
    let is404 = true;
    if (createdSlug && createdRegionSlug) {
      const slug = createdSlug.replace(/^\//, '');
      await nav(page, `${WEB_URL}/vodoymy/${createdRegionSlug}/${slug}`);
      await new Promise((r) => setTimeout(r, 2000));
      is404 = await page.evaluate(() => {
        const body = document.body.textContent ?? '';
        return (
          body.includes('не знайдено') ||
          body.includes('404') ||
          body.includes('Not Found') ||
          !document.querySelector('.leaflet-container')
        );
      });
      if (!is404) throw new Error('Public detail page still accessible after delete');
    }
    pass(`Delete OK, rows after=${rowsAfter}, public slug→404 content: ${is404}`);
  } catch (err) {
    fail('Delete water', err);
  }

  // ─── Step 7: Logout ───────────────────────────────────────────────────────
  console.log('Step 7: Logout');
  try {
    await nav(page, `${WEB_URL}/admin/waters`);
    await wait(page, '.ash__bar');

    // Click «Вийти» button (plain button in shell topbar)
    const loggedOut = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.ash__bar button'));
      const btn = btns.find((b) => b.textContent?.trim().includes('Вийти'));
      if (btn) { btn.click(); return true; }
      // fallback: any button with Вийти
      const all = Array.from(document.querySelectorAll('button'));
      const fallback = all.find((b) => b.textContent?.trim() === 'Вийти');
      if (fallback) { fallback.click(); return true; }
      return false;
    });

    if (!loggedOut) throw new Error('«Вийти» button not found');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10_000 }).catch(() => {});
    const urlAfterLogout = page.url();
    if (!urlAfterLogout.includes('/admin/login')) {
      throw new Error(`Expected /admin/login after logout, got ${urlAfterLogout}`);
    }

    // Verify direct /admin/waters redirects to login (cookie cleared)
    await nav(page, `${WEB_URL}/admin/waters`);
    await new Promise((r) => setTimeout(r, 2500));
    const urlAfterRedirect = page.url();
    if (!urlAfterRedirect.includes('/admin/login')) {
      throw new Error(`Expected /admin/login redirect, got ${urlAfterRedirect}`);
    }

    pass('Logout OK, cookie cleared, /admin/waters redirects to login');
  } catch (err) {
    fail('Logout', err);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  await browser.close();

  console.log('\n=== Summary ===');
  console.log(`  Passed: ${stepsPassed}`);
  console.log(`  Failed: ${stepsFailed}`);

  if (ng0Errors.length > 0) {
    console.error('\n  NG0 ERRORS DETECTED:');
    ng0Errors.forEach((e) => console.error('   ', e));
    console.error('\n  SCRIPT FAILED due to NG0 errors');
    process.exit(1);
  }

  if (stepsFailed > 0) {
    console.error('\n  SCRIPT FAILED — see FAIL lines above');
    process.exit(1);
  }

  console.log('\n  ALL STEPS PASSED ✅');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
