import { useEffect, useRef, useState } from 'preact/hooks';
import { fetchList, isAbortError, searchUrl, SwapiError } from '../swapi/client';
import { entityCache, type NormalizedCache } from '../cache/normalizedCache';
import type { Category, Entity } from '../swapi/types';
import { useDebouncedValue } from './useDebouncedValue';

export interface UseSearchDeps {
	cache?: NormalizedCache;
	debounceMs?: number;
}

export interface UseSearchResult {
	items: Entity[];
	status: 'idle' | 'loading' | 'error';
	error: string | null;
	/** True once a non-empty search has resolved with zero matches — distinct from an error. */
	noResults: boolean;
}

/**
 * Debounced (300ms), cancellable search within a category. An in-flight request is aborted
 * when superseded by newer input, so a stale response can never overwrite a fresher one.
 */
export function useSearch(category: Category, query: string, deps: UseSearchDeps = {}): UseSearchResult {
	const cache = deps.cache ?? entityCache;
	const debounceMs = deps.debounceMs ?? 300;
	const debouncedQuery = useDebouncedValue(query.trim(), debounceMs);
	const [state, setState] = useState<UseSearchResult>({ items: [], status: 'idle', error: null, noResults: false });
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		abortRef.current?.abort();

		if (debouncedQuery === '') {
			setState({ items: [], status: 'idle', error: null, noResults: false });
			return;
		}

		const controller = new AbortController();
		abortRef.current = controller;
		setState((prev) => ({ ...prev, status: 'loading', error: null }));

		fetchList(searchUrl(category, debouncedQuery), controller.signal)
			.then((page) => {
				// Guard against a stale response landing after a newer search superseded it —
				// belt-and-braces alongside AbortController, in case the response resolves anyway.
				if (controller.signal.aborted) return;
				const items = page.results.map((entity) => {
					cache.set(entity.url, entity);
					return entity;
				});
				setState({ items, status: 'idle', error: null, noResults: items.length === 0 });
			})
			.catch((error: unknown) => {
				if (isAbortError(error) || controller.signal.aborted) return;
				const message = error instanceof SwapiError ? error.message : 'Something went wrong searching.';
				setState({ items: [], status: 'error', error: message, noResults: false });
			});

		return () => controller.abort();
	}, [category, debouncedQuery, cache]);

	return state;
}
