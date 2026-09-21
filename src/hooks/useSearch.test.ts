import { act, cleanup, renderHook, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NormalizedCache } from '../cache/normalizedCache';
import type { Planet } from '../swapi/types';
import { useSearch } from './useSearch';

function page(results: unknown[], next: string | null = null) {
	return { count: results.length, next, previous: null, results };
}

function planet(id: number, name: string) {
	return { name, url: `https://swapi.dev/api/planets/${id}/` };
}

describe('useSearch', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it('does nothing for an empty query', () => {
		const cache = new NormalizedCache();
		const { result } = renderHook(() => useSearch('planets', '', { cache, debounceMs: 10 }));

		expect(result.current.status).toBe('idle');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('fetches after the debounce delay and resolves matching entities', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(1, 'Tatooine')]) });
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useSearch('planets', 'tat', { cache, debounceMs: 10 }));

		await waitFor(() => expect(result.current.items).toHaveLength(1));
		expect((result.current.items[0] as Planet).name).toBe('Tatooine');
		expect(result.current.noResults).toBe(false);
	});

	it('reports noResults, distinct from an error, when a search matches nothing', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([]) });
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useSearch('planets', 'zzz', { cache, debounceMs: 10 }));

		await waitFor(() => expect(result.current.noResults).toBe(true));
		expect(result.current.status).toBe('idle');
		expect(result.current.error).toBeNull();
	});

	it('cancels an in-flight request when the query changes before it resolves', async () => {
		const abortedSignals: AbortSignal[] = [];
		let resolveStale!: (value: unknown) => void;

		fetchMock.mockImplementationOnce((_url: string, init?: { signal?: AbortSignal }) => {
			init?.signal?.addEventListener('abort', () => abortedSignals.push(init.signal!));
			return new Promise((resolve) => {
				resolveStale = resolve;
			});
		});
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(2, 'Alderaan')]) });

		const cache = new NormalizedCache();
		const { result, rerender } = renderHook(({ query }) => useSearch('planets', query, { cache, debounceMs: 10 }), {
			initialProps: { query: 'ta' },
		});

		await act(async () => {
			await new Promise((r) => setTimeout(r, 20));
		});

		rerender({ query: 'al' });
		await act(async () => {
			await new Promise((r) => setTimeout(r, 20));
		});

		resolveStale({ ok: true, json: async () => page([planet(1, 'Tatooine')]) });

		await waitFor(() => expect((result.current.items[0] as Planet | undefined)?.name).toBe('Alderaan'));
		expect(abortedSignals).toHaveLength(1);
	});

	it('sets an error status when the request fails', async () => {
		fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useSearch('planets', 'tat', { cache, debounceMs: 10 }));

		await waitFor(() => expect(result.current.status).toBe('error'));
		expect(result.current.error).toBeTruthy();
		expect(result.current.noResults).toBe(false);
	});

	it('exposes hasMore and loadMore fetches the next page, appending results', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => page([planet(1, 'Tatooine')], 'https://swapi.dev/api/planets/?search=ta&page=2'),
		});
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useSearch('planets', 'ta', { cache, debounceMs: 10 }));
		await waitFor(() => expect(result.current.items).toHaveLength(1));
		expect(result.current.hasMore).toBe(true);

		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(2, 'Alderaan')]) });
		act(() => {
			result.current.loadMore();
		});

		await waitFor(() => expect(result.current.items).toHaveLength(2));
		expect((result.current.items[1] as Planet).name).toBe('Alderaan');
		expect(result.current.hasMore).toBe(false);
	});

	it('loadingMore is true only while paginating, not while a new query is loading', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => page([planet(1, 'Tatooine')], 'https://swapi.dev/api/planets/?search=ta&page=2'),
		});
		const cache = new NormalizedCache();

		const { result, rerender } = renderHook(({ query }) => useSearch('planets', query, { cache, debounceMs: 10 }), {
			initialProps: { query: 'ta' },
		});
		await waitFor(() => expect(result.current.items).toHaveLength(1));
		expect(result.current.loadingMore).toBe(false);

		let resolvePage!: (value: unknown) => void;
		fetchMock.mockImplementationOnce(() => new Promise((resolve) => (resolvePage = resolve)));
		act(() => {
			result.current.loadMore();
		});
		await waitFor(() => expect(result.current.loadingMore).toBe(true));
		expect(result.current.status).toBe('idle');

		resolvePage({ ok: true, json: async () => page([planet(2, 'Alderaan')]) });
		await waitFor(() => expect(result.current.loadingMore).toBe(false));

		// A brand-new query re-fetches from scratch (status: 'loading') — that is not pagination.
		let resolveNext!: (value: unknown) => void;
		fetchMock.mockImplementationOnce(() => new Promise((resolve) => (resolveNext = resolve)));
		rerender({ query: 'na' });
		await waitFor(() => expect(result.current.status).toBe('loading'));
		expect(result.current.loadingMore).toBe(false);

		resolveNext({ ok: true, json: async () => page([planet(3, 'Naboo')]) });
		await waitFor(() => expect(result.current.status).toBe('idle'));
	});

	it('does not start a second page fetch while one is already in flight', async () => {
		let resolvePage!: (value: unknown) => void;
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => page([planet(1, 'Tatooine')], 'https://swapi.dev/api/planets/?search=ta&page=2'),
		});
		fetchMock.mockImplementationOnce(() => new Promise((resolve) => (resolvePage = resolve)));
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useSearch('planets', 'ta', { cache, debounceMs: 10 }));
		await waitFor(() => expect(result.current.items).toHaveLength(1));

		act(() => {
			result.current.loadMore();
			result.current.loadMore();
		});
		await act(async () => {
			resolvePage({ ok: true, json: async () => page([planet(2, 'Alderaan')]) });
			await Promise.resolve();
		});

		await waitFor(() => expect(result.current.items).toHaveLength(2));
		// One fetch for the initial page, one for the (single) page-2 request.
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('a new query resets pagination and cancels an in-flight page fetch for the previous query', async () => {
		const abortedSignals: AbortSignal[] = [];
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => page([planet(1, 'Tatooine')], 'https://swapi.dev/api/planets/?search=ta&page=2'),
		});
		fetchMock.mockImplementationOnce((_url: string, init?: { signal?: AbortSignal }) => {
			init?.signal?.addEventListener('abort', () => abortedSignals.push(init.signal!));
			return new Promise(() => {});
		});
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => page([planet(3, 'Naboo')]) });
		const cache = new NormalizedCache();

		const { result, rerender } = renderHook(({ query }) => useSearch('planets', query, { cache, debounceMs: 10 }), {
			initialProps: { query: 'ta' },
		});
		await waitFor(() => expect(result.current.items).toHaveLength(1));

		act(() => {
			result.current.loadMore();
		});
		await act(async () => {
			await Promise.resolve();
		});

		rerender({ query: 'na' });
		await act(async () => {
			await new Promise((r) => setTimeout(r, 20));
		});

		await waitFor(() => expect((result.current.items[0] as Planet | undefined)?.name).toBe('Naboo'));
		expect(result.current.items).toHaveLength(1);
		expect(abortedSignals).toHaveLength(1);
	});

	it('aborts an in-flight page fetch on unmount, not just the (already-settled) initial fetch', async () => {
		const abortedSignals: AbortSignal[] = [];
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => page([planet(1, 'Tatooine')], 'https://swapi.dev/api/planets/?search=ta&page=2'),
		});
		fetchMock.mockImplementationOnce((_url: string, init?: { signal?: AbortSignal }) => {
			init?.signal?.addEventListener('abort', () => abortedSignals.push(init.signal!));
			return new Promise(() => {});
		});
		const cache = new NormalizedCache();

		const { result, unmount } = renderHook(() => useSearch('planets', 'ta', { cache, debounceMs: 10 }));
		await waitFor(() => expect(result.current.items).toHaveLength(1));

		act(() => {
			result.current.loadMore();
		});
		await act(async () => {
			await Promise.resolve();
		});

		unmount();

		expect(abortedSignals).toHaveLength(1);
	});
});
