import type { Starship, Vehicle } from './types';

export interface TransportationField {
	key: keyof Vehicle & keyof Starship;
	label: string;
}

/**
 * The compact field summary shown on a Vehicle/Starship tile, and the priority order those
 * same fields appear in at the top of that entity's detail screen (the rest of the entity's
 * fields follow at lower visual weight — see DetailScreen.tsx).
 */
export const TRANSPORTATION_TILE_FIELDS: TransportationField[] = [
	{ key: 'model', label: 'Model' },
	{ key: 'manufacturer', label: 'Manufacturer' },
	{ key: 'crew', label: 'Crew' },
	{ key: 'passengers', label: 'Passengers' },
];
