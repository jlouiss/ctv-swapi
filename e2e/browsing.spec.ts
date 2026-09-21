import { expect, type Page, test } from '@playwright/test';

// All D-Pad input is simulated via keyboard events (Arrow keys + Enter for OK/Select),
// exercising the same window-level listeners a real remote's input would hit (spec story 30).
// A short pause follows each press: the focus service measures layout asynchronously, and a
// real remote is never pressed key-for-key faster than that settles.
async function press(page: Page, key: string, times = 1) {
	for (let i = 0; i < times; i++) {
		await page.keyboard.press(key);
		await page.waitForTimeout(150);
	}
}

test('shows the People category by default with a persistent sidebar and disabled back tile', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('navigation', { name: 'Categories' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
	await expect(page.getByTestId('entity-tile').filter({ hasText: 'Luke Skywalker' })).toBeVisible();
});

test('switching categories via the D-Pad replaces the list with the new category', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('entity-tile').first()).toBeVisible();

	// Sidebar is to the left of content: from the initial focus (Search toggle), Left reaches
	// the category list (People, already active), Down reaches Planets.
	await press(page, 'ArrowLeft');
	await press(page, 'ArrowDown');
	await press(page, 'Enter');

	await expect(page.getByTestId('entity-tile').filter({ hasText: 'Tatooine' })).toBeVisible();
});

test('D-Pad navigation keeps working after switching category (regression)', async ({ page }) => {
	// A category switch unmounts and remounts ListScreen; if any of its focusable elements
	// (e.g. the Search toggle) don't get a fresh registration on remount, the focus service
	// loses its "current component" and every subsequent D-Pad press silently does nothing.
	await page.goto('/');
	await expect(page.getByTestId('entity-tile').first()).toBeVisible();

	await press(page, 'ArrowLeft');
	await press(page, 'ArrowDown'); // Planets
	await press(page, 'Enter');
	await expect(page.getByTestId('entity-tile').filter({ hasText: 'Tatooine' })).toBeVisible();

	// Navigation must still respond: Down into the grid, OK to open a detail screen.
	await press(page, 'ArrowDown');
	await press(page, 'Enter');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await press(page, 'Enter'); // Back
	await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);

	// And it must survive a second consecutive switch, not just the first.
	await press(page, 'ArrowLeft');
	await press(page, 'ArrowDown'); // from Planets to Films
	await press(page, 'Enter');
	await expect(page.getByTestId('entity-tile').filter({ hasText: 'A New Hope' })).toBeVisible();
	await press(page, 'ArrowDown');
	await press(page, 'Enter');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('opening a tile via OK shows its detail screen, and Back returns to the list', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('entity-tile').first()).toBeVisible();

	await press(page, 'ArrowDown'); // first tile: Luke Skywalker
	await press(page, 'Enter'); // open detail

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Luke Skywalker');
	await expect(page.getByText('Height')).toBeVisible();

	// Opening a detail screen auto-focuses Back (nothing else on the screen is navigable —
	// related entities are listed, not focusable, per spec story 17) — and Back is enabled here.
	await expect(page.getByRole('button', { name: 'Back' })).toBeEnabled();
	await press(page, 'Enter');

	await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
	await expect(page.getByTestId('entity-tile').filter({ hasText: 'Luke Skywalker' })).toBeVisible();
});

test('loads additional pages as focus approaches the end of the loaded set', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('entity-tile').first()).toBeVisible();
	await expect(page.getByTestId('entity-tile')).toHaveCount(10);

	// People's first page is a 5-column, 2-row grid at this viewport. Down, Down lands on the
	// first item of row 2 (index 5); Right x3 reaches index 8 — within PREFETCH_THRESHOLD of
	// the 10-item page end.
	await press(page, 'ArrowDown', 2);
	await press(page, 'ArrowRight', 3);

	await expect(page.getByTestId('entity-tile')).toHaveCount(20, { timeout: 10_000 });
});

test('searching narrows results to matches, and Back exits search back to the full list', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('entity-tile').first()).toBeVisible();

	await press(page, 'Enter'); // activate search (focus starts on the Search toggle)
	await expect(page.getByLabel('On-screen keyboard')).toBeVisible();

	// Spell "Po" on the on-screen keyboard: Down, Down to the q-row, Right x9 to p, OK (Shift
	// is on by default, so this comes out "P" and auto-releases), Left to o (same row), OK.
	await press(page, 'ArrowDown', 2);
	await press(page, 'ArrowRight', 9);
	await press(page, 'Enter'); // "P"
	await press(page, 'ArrowLeft');
	await press(page, 'Enter'); // "Po"

	await expect(page.getByTestId('entity-tile')).toHaveCount(4, { timeout: 5000 });
	await expect(page.getByTestId('entity-tile').filter({ hasText: 'C-3PO' })).toBeVisible();

	// Back exits search mode (registered as a local back-handler override) rather than
	// navigating away from the People screen. From "o": Up, Up exits the keyboard to the
	// Search toggle, Left reaches the sidebar (People), Up reaches Back — enabled while
	// search is active.
	await press(page, 'ArrowUp', 2);
	await press(page, 'ArrowLeft');
	await press(page, 'ArrowUp');
	await press(page, 'Enter');

	await expect(page.getByLabel('On-screen keyboard')).toHaveCount(0);
	await expect(page.getByTestId('entity-tile')).toHaveCount(10);
});

test('shows a clear no-results message, distinct from an error, for a search that matches nothing', async ({
	page,
}) => {
	await page.goto('/');
	await expect(page.getByTestId('entity-tile').first()).toBeVisible();

	await press(page, 'Enter'); // activate search
	await expect(page.getByLabel('On-screen keyboard')).toBeVisible();

	// "Qq" matches no person's name (Shift is on by default, so the first "q" comes out
	// capitalized and auto-releases — search is case-insensitive either way).
	await press(page, 'ArrowDown', 2); // q-row
	await press(page, 'Enter');
	await press(page, 'Enter');

	await expect(page.getByText('No results for “Qq”.')).toBeVisible({ timeout: 5000 });
	await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a search matching more than one page of results loads additional pages as focus scrolls (ticket 07)', async ({
	page,
}) => {
	await page.goto('/');
	await expect(page.getByTestId('entity-tile').first()).toBeVisible();

	await press(page, 'Enter'); // activate search (focus starts on the Search toggle)
	await expect(page.getByLabel('On-screen keyboard')).toBeVisible();

	// "a" matches 58 people on swapi.dev — well over one page of 10. Down x3 from the Search
	// toggle reaches the asdf-row (ROWS[2] in VirtualKeyboard), landing on "a" (first key), OK
	// types it (Shift is on by default, so this comes out "A"; search is case-insensitive).
	await press(page, 'ArrowDown', 3);
	await press(page, 'Enter'); // "A"

	await expect(page.getByTestId('entity-tile')).toHaveCount(10, { timeout: 5000 });

	// Move from the keyboard into the results grid (Right x9, crossing the rest of the asdf
	// row before reaching the first tile — the search results grid is narrower than full
	// category browsing since the keyboard shares the row), then Down x3 reaches the grid's
	// 3-columns-wide row 3 (index 9), within PREFETCH_THRESHOLD of the 10-item page end.
	await press(page, 'ArrowRight', 9);
	await press(page, 'ArrowDown', 3);

	await expect(page.getByTestId('entity-tile')).toHaveCount(20, { timeout: 10_000 });
});

test('shows an inline error, not a full-screen takeover, when a request fails', async ({ page }) => {
	await page.route('**/swapi.dev/api/planets/**', (route) => route.abort('failed'));
	await page.goto('/');
	await expect(page.getByTestId('entity-tile').first()).toBeVisible();

	await press(page, 'ArrowLeft'); // People
	await press(page, 'ArrowDown'); // Planets
	await press(page, 'Enter');

	await expect(page.getByRole('alert')).toBeVisible();
	// Category switcher and back tile remain usable alongside the error.
	await expect(page.getByRole('navigation', { name: 'Categories' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
});
