# CTV SWAPI Browser — Spec

## Problem Statement

Build a TypeScript and Preact app for a Connected TV (CTV) environment: a 1920x1080 web application, operable entirely via a standard TV remote (D-Pad + OK/Select, simulated via keyboard during development), that lets a viewer browse and search Star Wars data. The repository is an unmodified `create-preact` scaffold with no application functionality.

## Solution

A CTV application that lets a viewer switch between six Star Wars data Categories (People, Planets, Films, Species, Vehicles, Starships), browse a category's full list of items, search within a category, and open any item to see its full details — all navigable with only D-Pad Up/Down/Left/Right and OK/Select, styled to 10-foot UI conventions (large type, high contrast, generous spacing) and constrained to a 1920x1080 viewport.

## User Stories

1. As a TV viewer, I want to see a persistent list of all six data categories, so that I can navigate straight to People, Planets, Films, Species, Vehicles, or Starships from anywhere in the app.
2. As a TV viewer, I want to switch categories at any time via a persistent category switcher, so that I don't have to back out through several screens just to look at a different category.
3. As a TV viewer, I want to move focus between items using only the D-Pad (Up/Down/Left/Right), so that I can browse the app with a standard remote.
4. As a TV viewer, I want to select a focused item with OK/Select, so that I can view more details about it.
5. As a TV viewer, I want a persistent "Back" tile in a fixed position (top-left) on every screen, so that I always know how to return to the previous screen without a dedicated remote back button.
6. As a TV viewer, I want to see a full list of items in a category (e.g. all 60 planets) as I browse, so that I can find any item without an artificial cap.
7. As a TV viewer, I want additional pages of a category's items — or of my current search's results — to load automatically as I approach the end of what's currently loaded, so that browsing and searching both feel continuous rather than requiring an extra action.
8. As a TV viewer, I want to search within the currently selected category, so that I can find a specific item by name (or model, for Vehicles/Starships) without scrolling through the full list.
9. As a TV viewer, I want to enter search text using an on-screen keyboard operable with the D-Pad and OK, so that I can search without needing a physical keyboard attached to the TV.
10. As a TV viewer, I want my search results to update automatically (debounced) as I type on the on-screen keyboard, so that I get quick feedback without manually submitting the search.
11. As a TV viewer, I want an in-flight search request to be cancelled if I keep typing, so that I don't see results from a stale, superseded search flash on screen.
12. As a TV viewer, I want to see a clear "no results" message when my search matches nothing, so that I understand the search worked but found nothing, as distinct from an error.
13. As a TV viewer browsing Vehicles or Starships, I want to see Name, Model, Manufacturer, Crew, and Passengers directly on each item's tile, so that I can identify and compare transportation options at a glance without the tile becoming a dense spec sheet. (Amended: the full field set — including Cost in credits, Length, and Cargo capacity — still appears first, at full weight, on the item's detail screen; see the "List presentation" decision below.)
14. As a TV viewer browsing People, Planets, Films, or Species, I want each tile to show a curated summary of that item, so that I can identify items at a glance before opening the full detail.
15. As a TV viewer, I want to open a detail screen for any item in any category via OK/Select, so that I can see its complete set of data fields.
16. As a TV viewer viewing an item's detail screen, I want to see its related entities (e.g. a Planet's residents, a Film's characters, a Starship's pilots) listed by name, so that I can understand how it connects to other Star Wars data without leaving the screen.
17. As a TV viewer, I do not want related entities on a detail screen to be separately navigable, so that browsing stays bounded and predictable rather than turning into open-ended graph exploration.
18. As a TV viewer, I want to see a clear loading indicator while a category's first page of data is fetching, so that I know the app is working and haven't hit a dead screen.
19. As a TV viewer, I want the loading indicator to fit within the incremental-loading flow rather than take over the full screen, so that already-visible content and navigation chrome stay usable while more data loads.
20. As a TV viewer, I want to see a clear, readable error message if a request fails or an invalid request is made, so that I understand something went wrong rather than seeing a blank or broken screen.
21. As a TV viewer, I want an error message to appear in place of the list content, not as a full-screen takeover, so that I can still use the category switcher and back tile to recover.
22. As a TV viewer, I want the app to remember what I've already loaded in a category when I navigate away and come back, so that I don't have to wait for the same data to reload every time I switch categories.
23. As a TV viewer, I want the entire UI to fit and be legible within a 1920x1080 screen viewed from a normal couch distance, so that the app is comfortable to use as an actual TV application.
24. As a developer evaluating this project, I want a README describing the solution, so that I can understand its architecture and how to run it without reading all the code.
25. As a developer evaluating this project, I want inline code comments where the reasoning isn't obvious from the code itself, so that non-obvious decisions are explained where they're made.
26. As a developer evaluating this project, I want the UI styled using CSS/SCSS Modules, so that styles are scoped per-component and don't leak globally.
27. As a developer maintaining this project, I want one TypeScript interface per SWAPI entity type, matching the documented API schema, so that the data layer is type-safe and self-documenting.
28. As a developer maintaining this project, I want the data cache normalized by entity ID, so that the same record isn't duplicated in memory across list and detail views.
29. As a developer maintaining this project, I want in-flight fetches and focus-navigation registrations cleaned up when a screen unmounts, so that a long-running TV session doesn't accumulate leaked state.
30. As a developer testing this project, I want Playwright E2E tests that simulate D-Pad input via keyboard events, so that the core user stories are verified end-to-end the way a real remote would exercise them.
31. As a developer testing this project, I want focused unit tests on the data-layer hooks (fetch, cache, normalize, debounce, cancel), so that cache and race-condition edge cases are verified precisely without relying on slow, indirect E2E coverage.

## Implementation Decisions

- **Data source**: `swapi.dev`, not `swapi.tech` — see [ADR 0001](./adr/0001-use-swapi-dev-not-swapi-tech.md). List endpoints return full resource fields; error responses are consistent JSON 404s.
- **Entity types**: one TypeScript interface per Category (People, Planet, Film, Species, Vehicle, Starship), matching the verified swapi.dev field lists. All fields are typed `string`, matching what the API actually returns (including numeric-looking values like `cost_in_credits`, `crew`, `passengers`).
- **Data fetching**: custom hooks wrapping `fetch`, with in-flight requests cancelled via `AbortController` when superseded (primarily relevant to search-as-you-type).
- **Search**: server-side, via swapi.dev's `?search=` query parameter. Matches `name` for People/Planets/Films/Species; matches `name` and `model` for Vehicles/Starships (per swapi.dev's documented Search Fields). Debounced 300ms before firing.
- **Pagination**: incremental, with the next page prefetched automatically once focus is roughly two tiles from the end of the currently loaded set — not an explicit "Load more" control. Applies uniformly to category browsing and to search results, both driven through the same proximity trigger in `ListScreen`. See [ADR 0003](./adr/0003-proximity-prefetch-pagination.md).
- **Cache**: in-memory, normalized by entity ID (one canonical copy per record, shared between list and detail views), scoped to the session, with a defensive max-entry cap and simple eviction. See [ADR 0004](./adr/0004-bounded-normalized-cache.md).
- **Navigation**: in-memory view-state stack, no router library. See [ADR 0002](./adr/0002-in-memory-navigation-no-router.md).
- **Focus management**: `norigin-spatial-navigation`.
- **Screen structure**: a persistent category switcher (always reachable, regardless of current screen) plus a persistent back tile fixed at the top-left of every screen; a list screen per category; a detail screen per entity.
- **Search entry**: an on-screen virtual keyboard (Netflix-style layout), operable via D-Pad and OK, filtering results live as characters are entered (subject to the debounce above).
- **List presentation**: card/tile grid, 5 columns (fills the 1920px canvas width exactly), for every category. Vehicle and Starship tiles show a curated 4-field summary (Name, Model, Manufacturer, Crew, Passengers) — amended from the original 8-field tile (see story 13) after that proved too dense to read at a glance. Other categories show their own smaller, curated field subset per tile.
- **Detail screens**: full field set for the entity, plus its related entities (SWAPI's URL-reference arrays/fields — e.g. `residents`, `pilots`, `characters`, `homeworld`) resolved to display names and shown as a read-only list. These related entries are not separately navigable. For Vehicles/Starships, the original 8-field spec list (Name — the hero title — Model, Manufacturer, Cost in credits, Length, Crew, Passengers, Cargo capacity) repeats first, then the entity's remaining fields (Consumables, Vehicle/Starship class, etc.) follow on a fresh row — same styling throughout, purely a grouping/ordering split, not a visual-weight one — see `src/swapi/transportationFields.ts` (`TRANSPORTATION_DETAIL_PRIORITY_FIELDS`), a deliberately different, longer list than the tile's own curated summary (`TRANSPORTATION_TILE_FIELDS`). A Film's Opening Crawl gets its own full-width row (`.fieldWide`) and has its hard, per-line crawl breaks collapsed into flowing prose (paragraph breaks kept) since the source text is formatted for a scrolling title card, not for reading in a fixed-width column.
- **Pagination triggers**: the proximity-prefetch above fires on D-Pad focus proximity (the primary input model) and also on scrolling the list past a threshold near its loaded bottom — so a viewer scrolling with a mouse (common when developing/reviewing in a desktop browser) can reveal more results without moving focus. Both triggers apply the same way whether the list shows a category's items or a search's results. The list's scrollbar is intentionally visible (not the platform default, which can be invisible-until-hover) as a cue that more content exists below the fold.
- **Error handling**: a generic inline error message replaces the list/content area only; the category switcher and back tile remain focusable. This is distinct from a search returning zero results, which shows a "no results" state, not an error.
- **Loading state**: inline, compatible with the incremental/prefetch loading model — no full-screen loading takeover.
- **Styling**: SCSS Modules.
- **Layout**: fixed to a 1920x1080 viewport; 10-foot UI conventions (large type, high contrast, generous safe-area margins).

## Testing Decisions

Good tests here exercise observable behavior (what the viewer sees/can do), not internal implementation details (e.g. not asserting on internal state shape or which hook fired).

- **Primary seam — Playwright E2E**: drives the running app via simulated D-Pad input (keyboard arrow keys + Enter for OK/Select), asserting on rendered UI. Covers the user stories directly: category switching, browsing with prefetch, search via the on-screen keyboard, opening detail screens, back navigation, loading and error states.
- **Secondary seam — Vitest unit tests, data-layer hooks only**: covers the fetch client, cache normalize/evict logic, and debounce/cancel behavior — race conditions and edge cases (e.g. a superseded search request resolving after a newer one) that are impractical to hit reliably through full E2E.
- No third seam (e.g. isolated component/Testing Library tests) — kept to these two per the seam discussion.
- **Prior art**: none. The repository is currently an unmodified `create-preact` scaffold with no existing tests to follow.

## Out of Scope

- Authentication (SWAPI is public and unauthenticated).
- Deep cross-navigation between related entities (e.g. selecting a Planet's resident to jump to that Person's detail screen) — explicitly rejected in favor of a read-only related-entities list.
- Responsive or mobile layouts — the solution is constrained to 1920x1080 only.
- Offline support or persistent (disk) caching beyond the in-memory session cache.
- Internationalization/localization.
- Voice remote or pointer/mouse input.
- `swapi.tech` or any other data source (see ADR 0001).
- Rate-limit handling UX beyond the generic error state (swapi.dev's 10,000 requests/day limit is not expected to be hit in normal use or testing).

## Further Notes

- Visual theme and aesthetic are left to the implementer's taste, per the original brief's "free license to design the application according to your taste."
- The project's domain glossary lives in [`CONTEXT.md`](../CONTEXT.md); architectural decisions referenced above live in [`docs/adr/`](./adr/). This spec should be read alongside both.
- This spec was produced from an interactive `/grilling` session; the open questions it resolved are reflected in the ADRs it references.
