import type { Category } from './types';

/**
 * SWAPI has no images. Each entity gets a deterministic placeholder from picsum.photos,
 * seeded from its category and id (e.g. "people-1") so the same entity always shows the
 * same picture across renders, screens, and sessions.
 */
export function imageUrl(category: Category, id: string, width: number, height: number): string {
	return `https://picsum.photos/seed/${category}-${id}/${width}/${height}`;
}
