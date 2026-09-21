import type { Entity } from '../swapi/types';

const DEFAULT_MAX_ENTRIES = 500;

export interface NormalizedCacheOptions {
	maxEntries?: number;
}

/**
 * A session-scoped store of entities normalized by id (their swapi url), so list and
 * detail views share one canonical copy of each record. Bounded with a defensive cap
 * and simple insertion-order eviction — see docs/adr/0004-bounded-normalized-cache.md.
 */
export class NormalizedCache {
	private entities = new Map<string, Entity>();
	private retained = new Set<string>();
	private readonly maxEntries: number;

	constructor(options: NormalizedCacheOptions = {}) {
		this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
	}

	get size(): number {
		return this.entities.size;
	}

	get(id: string): Entity | undefined {
		return this.entities.get(id);
	}

	set(id: string, entity: Entity): void {
		// Re-inserting moves the key to the end (most-recently-used), keeping it out of eviction longer.
		this.entities.delete(id);
		this.entities.set(id, entity);
		this.evictIfNeeded();
	}

	/**
	 * Marks an id as belonging to a category's loaded list, protecting it from eviction.
	 * Categories are never unloaded in this app (the whole point of the category list store
	 * is to remember what's been browsed for the rest of the session — spec story 22), so
	 * retained ids stay retained for the session; there is no corresponding `release`.
	 */
	retain(id: string): void {
		this.retained.add(id);
	}

	private evictIfNeeded(): void {
		if (this.entities.size <= this.maxEntries) return;
		for (const id of this.entities.keys()) {
			if (this.entities.size <= this.maxEntries) break;
			if (this.retained.has(id)) continue;
			this.entities.delete(id);
		}
	}
}

/** The session-wide normalized cache, shared by list and detail views. */
export const entityCache = new NormalizedCache();
