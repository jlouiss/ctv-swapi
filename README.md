# CTV SWAPI Browser

A Connected TV (1920×1080, D-Pad and keyboard operable) application for browsing Star Wars data from
[swapi.dev](https://swapi.dev), built with TypeScript and Preact.

The full solution and its rationale are in [`docs/spec.md`](./docs/spec.md); domain
terminology is in [`CONTEXT.md`](./CONTEXT.md); architectural decisions are in
[`docs/adr/`](./docs/adr/).

## Getting started

```sh
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build at http://localhost:4173
npm run typecheck # tsc --noEmit
npm test          # Vitest unit tests (data-layer hooks)
npm run test:e2e  # Playwright E2E (builds + serves, then drives Chromium)
```

## Architecture

### Data layer (`src/swapi`, `src/cache`, `src/hooks`)

- `src/swapi/types.ts` — one TypeScript interface per SWAPI entity (Person, Planet, Film,
  Species, Vehicle, Starship), matching swapi.dev's actual field lists field-for-field
  (including `string`-typed numeric-looking fields like `cost_in_credits`).
- `src/swapi/client.ts` — a thin `fetch` wrapper that builds list/search/detail URLs and
  normalizes network/HTTP failures into a single `SwapiError`.
- `src/cache/normalizedCache.ts` — an in-memory cache keyed by entity URL (its id), shared
  between list and detail views so a record is never duplicated. Bounded with a defensive
  max-entry cap and simple eviction that skips currently-retained (visible) entries — see
  [ADR 0004](./docs/adr/0004-bounded-normalized-cache.md).
- `src/cache/categoryListStore.ts` — a module-level singleton tracking each category's
  loaded pages (`order`, `next`, `status`). Because it's a singleton rather than
  component state, a category's already-loaded pages survive navigating away and back
  (spec story 22).
- `src/hooks/useCategoryList.ts` — incremental pagination over the store above; exposes
  `hasMore`/`loadMore()` for proximity-triggered prefetch (see
  [ADR 0003](./docs/adr/0003-proximity-prefetch-pagination.md)).
- `src/hooks/useSearch.ts` — debounced (300ms) search with `AbortController` cancellation;
  a stale in-flight response is dropped even if it resolves after a newer one starts
  (belt-and-braces: both the abort signal and an explicit "is this still current" guard).
  Exposes the same `hasMore`/`loadMore()` shape as `useCategoryList` so search results
  paginate through the same proximity-triggered prefetch, not a separate mechanism.
- `src/hooks/useEntityDetail.ts` — fetches one entity and resolves its related-entity URL
  fields (`residents`, `pilots`, `characters`, `homeworld`, …) to display names, reusing
  cached entities instead of refetching them.

All of the above are covered by focused Vitest unit tests exercising fetch, cache reuse,
debounce, and cancellation — the "secondary seam" per [`docs/spec.md`](./docs/spec.md).

### Navigation (`src/navigation`)

An in-memory view-state stack (`NavigationContext`), not a router — see
[ADR 0002](./docs/adr/0002-in-memory-navigation-no-router.md). `BackHandlerContext` lets a
screen register a local override for the Back tile (used so Back exits search mode before
it ever pops the navigation stack).

### Focus (`src/focus`, throughout `src/components`)

D-Pad/OK navigation is provided by
[`@noriginmedia/norigin-spatial-navigation`](https://github.com/NoriginMedia/norigin-spatial-navigation).
`initSpatialNavigation()` calls `init()` once at startup with `shouldFocusDOMNode: true` so
the library also moves native DOM focus (useful for assistive tech and for driving E2E
tests off `document.activeElement`). `App.tsx` re-focuses the new screen's container (or
the Back tile, on a detail screen) whenever navigation changes, since the library requires
an explicit `setFocus` target rather than assuming one.

### Screens (`src/components`)

- `Shell` — the persistent 1920×1080 layout: a left sidebar (`Logo`, `BackTile`,
  `CategorySwitcher`) beside the current screen.
- `BackTile` — disabled (not focusable, not clickable) on the root category-list screen,
  where there is genuinely nothing to go back to; enabled everywhere else, including while
  search is active (it then exits search instead of popping navigation).
- `ListScreen` — a category's tile grid, with a `Search` toggle that swaps in the
  `VirtualKeyboard` and filters live (debounced) instead of browsing. Loading and error
  states replace only the grid area, never the whole screen (spec stories 18–21).
- `Tile` — a thumbnail plus two field layouts: the required 8-field spread for
  Vehicles/Starships, and a smaller curated field pair for the other four categories.
- `DetailScreen` / `RelatedList` — a hero image, full field set, and related entities shown
  by name only (not separately navigable — spec story 17).
- `VirtualKeyboard` — letters, a digits row, and the symbols most likely to appear in Star
  Wars names/models (hyphen, apostrophe), plus a Shift key. Shift starts on (so the first
  character typed is capitalized) and auto-releases after one letter, phone-keyboard style;
  pressing it again re-arms it for another single capital.

### Images (`src/swapi/image.ts`)

SWAPI has no images. Each tile and detail hero uses a placeholder from
[picsum.photos](https://picsum.photos), seeded deterministically as `{category}-{id}` (e.g.
`people-1`) via picsum's `/seed/` path — so the same entity always shows the same picture,
without fetching or storing any image data.

## Testing

- **Vitest** (`npm test`) — data-layer hooks and stores: fetch, normalized-cache reuse and
  eviction, debounce, search cancellation, related-entity resolution.
- **Playwright** (`npm run test:e2e`) — end-to-end, driving the built app entirely via
  simulated D-Pad keyboard input: default category, category switching, opening a
  detail screen and returning via Back, proximity-triggered prefetch (for both category
  browsing and search results), searching (typed on the on-screen keyboard) narrowing
  results and a no-results state, and an inline error state that leaves the category
  switcher and Back tile usable.
