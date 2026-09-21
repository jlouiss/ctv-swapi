import { act, cleanup, renderHook, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryListStore } from '../cache/categoryListStore';
import { NormalizedCache } from '../cache/normalizedCache';
import type { Planet } from '../swapi/types';
import { useCategoryList } from './useCategoryList';

function page(results: unknown[], next: string | null) {
	return { count: 60, next, previous: null, results };
}

function planet(id: number) {
	return { name: `Planet ${id}`, url: `https://swapi.dev/api/planets/${id}/` };
}

describe('useCategoryList', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it('loads the first page on mount and exposes resolved entities', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(1), planet(2)], null) });
		const store = new CategoryListStore();
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useCategoryList('planets', { store, cache }));

		await waitFor(() => expect(result.current.items).toHaveLength(2));
		expect((result.current.items[0] as Planet).name).toBe('Planet 1');
		expect(result.current.hasMore).toBe(false);
	});

	it('loadMore fetches the next page and appends items', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => page([planet(1)], 'https://swapi.dev/api/planets/?page=2'),
		});
		const store = new CategoryListStore();
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useCategoryList('planets', { store, cache }));
		await waitFor(() => expect(result.current.items).toHaveLength(1));

		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(2)], null) });
		act(() => {
			result.current.loadMore();
		});

		await waitFor(() => expect(result.current.items).toHaveLength(2));
		expect(result.current.hasMore).toBe(false);
	});

	it('surfaces an error status distinct from an empty list when the fetch fails', async () => {
		fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
		const store = new CategoryListStore();
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useCategoryList('planets', { store, cache }));

		await waitFor(() => expect(result.current.status).toBe('error'));
		expect(result.current.error).toBeTruthy();
	});

	it('does not refetch when remounted after the category was already loaded (story 22)', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(1)], null) });
		const store = new CategoryListStore();
		const cache = new NormalizedCache();

		const first = renderHook(() => useCategoryList('planets', { store, cache }));
		await waitFor(() => expect(first.result.current.items).toHaveLength(1));
		first.unmount();

		const second = renderHook(() => useCategoryList('planets', { store, cache }));
		await waitFor(() => expect(second.result.current.items).toHaveLength(1));

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
