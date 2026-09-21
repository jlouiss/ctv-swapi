import { act, cleanup, renderHook, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NormalizedCache } from '../cache/normalizedCache';
import type { Planet } from '../swapi/types';
import { useSearch } from './useSearch';

function page(results: unknown[]) {
	return { count: results.length, next: null, previous: null, results };
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
});
