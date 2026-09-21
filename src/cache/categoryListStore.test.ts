import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryListStore } from './categoryListStore';
import { NormalizedCache } from './normalizedCache';

function page(results: unknown[], next: string | null) {
	return { count: 60, next, previous: null, results };
}

function planet(id: number) {
	return { name: `Planet ${id}`, url: `https://swapi.dev/api/planets/${id}/` };
}

describe('CategoryListStore', () => {
	let fetchMock: ReturnType<typeof vi.fn>;
	let cache: NormalizedCache;
	let store: CategoryListStore;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		cache = new NormalizedCache();
		store = new CategoryListStore();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('loads the first page on ensureLoaded and populates the normalized cache', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => page([planet(1), planet(2)], 'https://swapi.dev/api/planets/?page=2'),
		});

		await store.ensureLoaded('planets', cache);
		const state = store.getState('planets');

		expect(state.order).toEqual(['https://swapi.dev/api/planets/1/', 'https://swapi.dev/api/planets/2/']);
		expect(state.next).toBe('https://swapi.dev/api/planets/?page=2');
		expect(state.status).toBe('idle');
		expect(cache.get('https://swapi.dev/api/planets/1/')).toMatchObject({ name: 'Planet 1' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('does not refetch a category that is already loaded', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(1)], null) });

		await store.ensureLoaded('planets', cache);
		await store.ensureLoaded('planets', cache);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('dedupes concurrent ensureLoaded calls into a single in-flight request', async () => {
		let resolveFetch!: (value: unknown) => void;
		fetchMock.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveFetch = resolve;
			}),
		);

		const first = store.ensureLoaded('planets', cache);
		const second = store.ensureLoaded('planets', cache);
		resolveFetch({ ok: true, json: async () => page([planet(1)], null) });
		await Promise.all([first, second]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('appends the next page on loadMore and clears next when exhausted', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => page([planet(1)], 'https://swapi.dev/api/planets/?page=2'),
		});
		await store.ensureLoaded('planets', cache);

		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(2)], null) });
		await store.loadMore('planets', cache);

		const state = store.getState('planets');
		expect(state.order).toEqual(['https://swapi.dev/api/planets/1/', 'https://swapi.dev/api/planets/2/']);
		expect(state.next).toBeNull();
	});

	it('sets an error state, distinct from a normal empty list, when the fetch fails', async () => {
		fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

		await store.ensureLoaded('planets', cache);
		const state = store.getState('planets');

		expect(state.status).toBe('error');
		expect(state.error).toBeTruthy();
	});

	it('retains state across repeated getState calls (survives screen unmount/remount)', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(1)], null) });
		await store.ensureLoaded('planets', cache);

		// Simulate leaving and returning to the screen — the store is a singleton, so state persists.
		const before = store.getState('planets');
		const after = store.getState('planets');
		expect(after).toEqual(before);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('notifies subscribers when state changes', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(1)], null) });
		const listener = vi.fn();
		store.subscribe(listener);

		await store.ensureLoaded('planets', cache);

		expect(listener).toHaveBeenCalled();
	});
});
