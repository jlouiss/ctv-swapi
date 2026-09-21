import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { fetchList, isAbortError, searchUrl, SwapiError } from '../swapi/client';
import { entityCache, type NormalizedCache } from '../cache/normalizedCache';
import type { Category, Entity } from '../swapi/types';
import { useDebouncedValue } from './useDebouncedValue';

export interface UseSearchDeps {
	cache?: NormalizedCache;
	debounceMs?: number;
}

interface SearchState {
	items: Entity[];
	status: 'idle' | 'loading' | 'error';
	error: string | null;
	/** True once a non-empty search has resolved with zero matches — distinct from an error. */
	noResults: boolean;
	next: string | null;
	/** True while a page (not the initial query) fetch is in flight — distinct from `status`, which
	 * reflects the current query's own load, so the UI can tell "new query loading" from "paginating". */
	loadingMore: boolean;
}

export interface UseSearchResult {
	items: Entity[];
	status: 'idle' | 'loading' | 'error';
	error: string | null;
	noResults: boolean;
	hasMore: boolean;
	loadingMore: boolean;
	/** Call when focus approaches the end of the loaded results, to prefetch the next page. */
	loadMore: () => void;
}

function emptyState(): SearchState {
	return { items: [], status: 'idle', error: null, noResults: false, next: null, loadingMore: false };
}

/**
 * Debounced (300ms), cancellable search within a category, with proximity-prefetch pagination
 * (docs/adr/0003) mirroring `useCategoryList`. A new query resets pagination and aborts any
 * in-flight fetch (initial or page) for the previous query, so a stale response can never
 * overwrite a fresher one.
 */
export function useSearch(category: Category, query: string, deps: UseSearchDeps = {}): UseSearchResult {
	const cache = deps.cache ?? entityCache;
	const debounceMs = deps.debounceMs ?? 300;
	const debouncedQuery = useDebouncedValue(query.trim(), debounceMs);
	const [state, setState] = useState<SearchState>(emptyState);
	const abortRef = useRef<AbortController | null>(null);
	const pageInFlightRef = useRef(false);

	useEffect(() => {
		abortRef.current?.abort();
		pageInFlightRef.current = false;

		if (debouncedQuery === '') {
			setState(emptyState());
			return;
		}

		const controller = new AbortController();
		abortRef.current = controller;
		setState((prev) => ({ ...prev, status: 'loading', error: null, loadingMore: false }));

		fetchList(searchUrl(category, debouncedQuery), controller.signal)
			.then((page) => {
				// Guard against a stale response landing after a newer search superseded it —
				// belt-and-braces alongside AbortController, in case the response resolves anyway.
				if (controller.signal.aborted) return;
				const items = page.results.map((entity) => {
					cache.set(entity.url, entity);
					return entity;
				});
				setState({
					items,
					status: 'idle',
					error: null,
					noResults: items.length === 0,
					next: page.next,
					loadingMore: false,
				});
			})
			.catch((error: unknown) => {
				if (isAbortError(error) || controller.signal.aborted) return;
				const message = error instanceof SwapiError ? error.message : 'Something went wrong searching.';
				setState({ items: [], status: 'error', error: message, noResults: false, next: null, loadingMore: false });
			});

		// Abort whatever fetch is currently in flight for this query — the initial fetch, or,
		// if `loadMore` has since reassigned it, a page fetch — on unmount or before the next run.
		return () => abortRef.current?.abort();
	}, [category, debouncedQuery, cache]);

	const loadMore = useCallback(() => {
		if (pageInFlightRef.current || !state.next) return;
		const url = state.next;
		const controller = new AbortController();
		abortRef.current = controller;
		pageInFlightRef.current = true;
		setState((prev) => ({ ...prev, loadingMore: true, error: null }));

		fetchList(url, controller.signal)
			.then((page) => {
				if (controller.signal.aborted) return;
				const items = page.results.map((entity) => {
					cache.set(entity.url, entity);
					return entity;
				});
				setState((prev) => ({
					...prev,
					items: [...prev.items, ...items],
					loadingMore: false,
					next: page.next,
				}));
			})
			.catch((error: unknown) => {
				if (isAbortError(error) || controller.signal.aborted) return;
				const message = error instanceof SwapiError ? error.message : 'Something went wrong searching.';
				setState((prev) => ({ ...prev, status: 'error', loadingMore: false, error: message }));
			})
			.finally(() => {
				pageInFlightRef.current = false;
			});
	}, [cache, state.next]);

	return {
		items: state.items,
		status: state.status,
		error: state.error,
		noResults: state.noResults,
		hasMore: state.next !== null,
		loadingMore: state.loadingMore,
		loadMore,
	};
}
