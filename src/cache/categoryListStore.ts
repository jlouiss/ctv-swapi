import { fetchList, listUrl, SwapiError } from '../swapi/client';
import type { Category } from '../swapi/types';
import type { NormalizedCache } from './normalizedCache';

export interface CategoryListState {
	order: string[];
	next: string | null;
	status: 'idle' | 'loading' | 'error';
	error: string | null;
}

function emptyState(): CategoryListState {
	return { order: [], next: null, status: 'idle', error: null };
}

/**
 * Per-category incremental list state, kept in a module-level singleton so a category's
 * already-loaded pages survive navigating away and back (spec story 22) rather than
 * resetting on every screen mount.
 */
export class CategoryListStore {
	private state = new Map<Category, CategoryListState>();
	private inFlight = new Map<Category, Promise<void>>();
	private listeners = new Set<() => void>();

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		for (const listener of this.listeners) listener();
	}

	getState(category: Category): CategoryListState {
		return this.state.get(category) ?? emptyState();
	}

	private setState(category: Category, patch: Partial<CategoryListState>): void {
		this.state.set(category, { ...this.getState(category), ...patch });
		this.notify();
	}

	/** Loads the first page if this category hasn't been loaded yet; a no-op otherwise. */
	ensureLoaded(category: Category, cache: NormalizedCache): Promise<void> {
		const current = this.getState(category);
		if (current.order.length > 0 || current.status === 'error') return Promise.resolve();
		return this.fetchPage(category, listUrl(category, 1), cache);
	}

	/** Loads the next page, if one exists and none is already in flight. */
	loadMore(category: Category, cache: NormalizedCache): Promise<void> {
		const current = this.getState(category);
		if (!current.next) return Promise.resolve();
		return this.fetchPage(category, current.next, cache);
	}

	private fetchPage(category: Category, url: string, cache: NormalizedCache): Promise<void> {
		const existing = this.inFlight.get(category);
		if (existing) return existing;

		this.setState(category, { status: 'loading', error: null });

		const promise = fetchList(url)
			.then((page) => {
				const ids = page.results.map((entity) => {
					cache.set(entity.url, entity);
					cache.retain(entity.url);
					return entity.url;
				});
				const current = this.getState(category);
				this.setState(category, {
					order: [...current.order, ...ids],
					next: page.next,
					status: 'idle',
				});
			})
			.catch((error: unknown) => {
				const message = error instanceof SwapiError ? error.message : 'Something went wrong loading this list.';
				this.setState(category, { status: 'error', error: message });
			})
			.finally(() => {
				this.inFlight.delete(category);
			});

		this.inFlight.set(category, promise);
		return promise;
	}
}

export const categoryListStore = new CategoryListStore();
