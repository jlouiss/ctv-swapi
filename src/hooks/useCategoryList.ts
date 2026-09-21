import { useCallback, useEffect, useState } from 'preact/hooks';
import { categoryListStore, type CategoryListStore } from '../cache/categoryListStore';
import { entityCache, type NormalizedCache } from '../cache/normalizedCache';
import type { Category, Entity } from '../swapi/types';

export interface UseCategoryListDeps {
	store?: CategoryListStore;
	cache?: NormalizedCache;
}

export interface UseCategoryListResult {
	items: Entity[];
	status: 'idle' | 'loading' | 'error';
	error: string | null;
	count: number | null;
	hasMore: boolean;
	/** Call when focus approaches the end of the loaded set, to prefetch the next page. */
	loadMore: () => void;
}

/**
 * Incremental category browsing: loads the first page on mount, and exposes `loadMore` for
 * proximity-triggered prefetch (docs/adr/0003). Backed by the module-level `categoryListStore`,
 * so already-loaded pages survive navigating away and back to a category.
 */
export function useCategoryList(category: Category, deps: UseCategoryListDeps = {}): UseCategoryListResult {
	const store = deps.store ?? categoryListStore;
	const cache = deps.cache ?? entityCache;
	const [state, setState] = useState(() => store.getState(category));

	useEffect(() => {
		setState(store.getState(category));
		const unsubscribe = store.subscribe(() => setState(store.getState(category)));
		void store.ensureLoaded(category, cache);
		return unsubscribe;
	}, [category, store, cache]);

	const loadMore = useCallback(() => {
		void store.loadMore(category, cache);
	}, [category, store, cache]);

	const items = state.order.map((id) => cache.get(id)).filter((entity): entity is Entity => entity !== undefined);

	return {
		items,
		status: state.status,
		error: state.error,
		count: state.count,
		hasMore: state.next !== null,
		loadMore,
	};
}
