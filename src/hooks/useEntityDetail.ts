import { useEffect, useState } from 'preact/hooks';
import { detailUrl, fetchEntity, isAbortError, SwapiError } from '../swapi/client';
import { entityCache, type NormalizedCache } from '../cache/normalizedCache';
import { displayName, RELATED_FIELDS, relatedUrls } from '../swapi/related';
import type { Category, Entity } from '../swapi/types';

export interface RelatedGroup {
	field: string;
	entries: { url: string; name: string }[];
}

export interface UseEntityDetailResult {
	entity: Entity | null;
	related: RelatedGroup[];
	status: 'loading' | 'idle' | 'error';
	error: string | null;
}

export interface UseEntityDetailDeps {
	cache?: NormalizedCache;
}

/**
 * Fetches one entity's full detail (reusing the normalized cache when a list screen already
 * has it) and resolves its related-entity url fields to display names, for a read-only
 * related-entities list (spec stories 16–17: shown, but not separately navigable).
 */
export function useEntityDetail(
	category: Category,
	id: string,
	deps: UseEntityDetailDeps = {},
): UseEntityDetailResult {
	const cache = deps.cache ?? entityCache;
	const [state, setState] = useState<UseEntityDetailResult>({
		entity: null,
		related: [],
		status: 'loading',
		error: null,
	});

	useEffect(() => {
		const controller = new AbortController();
		setState({ entity: null, related: [], status: 'loading', error: null });

		async function resolveOne(url: string): Promise<{ url: string; name: string }> {
			const cached = cache.get(url);
			if (cached) return { url, name: displayName(cached) };
			const fetched = await fetchEntity(url, controller.signal);
			cache.set(url, fetched);
			return { url, name: displayName(fetched) };
		}

		async function run() {
			const url = detailUrl(category, id);
			const cached = cache.get(url);
			const entity = cached ?? (await fetchEntity(url, controller.signal));
			if (!cached) cache.set(url, entity);
			if (controller.signal.aborted) return;

			const fields = RELATED_FIELDS[category];
			const related = await Promise.all(
				fields.map(async (field) => ({
					field,
					entries: await Promise.all(relatedUrls(entity, field).map(resolveOne)),
				})),
			);
			if (controller.signal.aborted) return;
			setState({ entity, related, status: 'idle', error: null });
		}

		run().catch((error: unknown) => {
			if (isAbortError(error) || controller.signal.aborted) return;
			const message = error instanceof SwapiError ? error.message : 'Something went wrong loading this item.';
			setState({ entity: null, related: [], status: 'error', error: message });
		});

		return () => {
			controller.abort();
		};
	}, [category, id, cache]);

	return state;
}
