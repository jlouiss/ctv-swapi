import type { Starship, Vehicle } from './types';

export interface TransportationField {
	key: keyof Vehicle & keyof Starship;
	label: string;
}

/** The compact field summary shown on a Vehicle/Starship tile (kept short on purpose — a
 * viewer comparing options wants a glance, not a spec sheet). */
export const TRANSPORTATION_TILE_FIELDS: TransportationField[] = [
	{ key: 'model', label: 'Model' },
	{ key: 'manufacturer', label: 'Manufacturer' },
	{ key: 'crew', label: 'Crew' },
	{ key: 'passengers', label: 'Passengers' },
];

/** The priority order these fields appear in at the top of a Vehicle/Starship's detail
 * screen, at full visual weight — the rest of the entity's fields follow at lower weight
 * (see DetailScreen.tsx). Deliberately the original spec-story-13 field list (Name is
 * excluded here since it's already the screen's hero title, not a dt/dd field). */
export const TRANSPORTATION_DETAIL_PRIORITY_FIELDS: TransportationField[] = [
	{ key: 'model', label: 'Model' },
	{ key: 'manufacturer', label: 'Manufacturer' },
	{ key: 'cost_in_credits', label: 'Cost in credits' },
	{ key: 'length', label: 'Length' },
	{ key: 'crew', label: 'Crew' },
	{ key: 'passengers', label: 'Passengers' },
	{ key: 'cargo_capacity', label: 'Cargo capacity' },
];
