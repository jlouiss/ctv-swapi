import type { Category, Entity, Film } from './types';

/** Fields on each category's entity that are swapi url-references to other entities. */
export const RELATED_FIELDS: Record<Category, readonly string[]> = {
	people: ['homeworld', 'films', 'species', 'vehicles', 'starships'],
	planets: ['residents', 'films'],
	films: ['characters', 'planets', 'starships', 'vehicles', 'species'],
	species: ['homeworld', 'people', 'films'],
	vehicles: ['pilots', 'films'],
	starships: ['pilots', 'films'],
};

export function categoryFromUrl(url: string): Category {
	const match = url.match(/\/api\/(people|planets|films|species|vehicles|starships)\//);
	if (!match) throw new Error(`Cannot determine category from swapi url: ${url}`);
	return match[1] as Category;
}

export function displayName(entity: Entity): string {
	return 'title' in entity ? (entity as Film).title : entity.name;
}

/** Reads a related-entity field's urls off an entity, normalizing the single-url (`homeworld`) case. */
export function relatedUrls(entity: Entity, field: string): string[] {
	const value = (entity as unknown as Record<string, unknown>)[field];
	if (!value) return [];
	return Array.isArray(value) ? (value as string[]) : [value as string];
}
