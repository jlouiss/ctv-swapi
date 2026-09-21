// One TypeScript interface per SWAPI entity, matching swapi.dev's documented field lists.
// All fields are typed `string` (or `string[]` for URL-reference arrays), matching what the
// API actually returns — including numeric-looking values like `cost_in_credits`.

export interface Person {
	name: string;
	height: string;
	mass: string;
	hair_color: string;
	skin_color: string;
	eye_color: string;
	birth_year: string;
	gender: string;
	homeworld: string;
	films: string[];
	species: string[];
	vehicles: string[];
	starships: string[];
	created: string;
	edited: string;
	url: string;
}

export interface Planet {
	name: string;
	rotation_period: string;
	orbital_period: string;
	diameter: string;
	climate: string;
	gravity: string;
	terrain: string;
	surface_water: string;
	population: string;
	residents: string[];
	films: string[];
	created: string;
	edited: string;
	url: string;
}

export interface Film {
	title: string;
	episode_id: number;
	opening_crawl: string;
	director: string;
	producer: string;
	release_date: string;
	characters: string[];
	planets: string[];
	starships: string[];
	vehicles: string[];
	species: string[];
	created: string;
	edited: string;
	url: string;
}

export interface Species {
	name: string;
	classification: string;
	designation: string;
	average_height: string;
	skin_colors: string;
	hair_colors: string;
	eye_colors: string;
	average_lifespan: string;
	homeworld: string | null;
	language: string;
	people: string[];
	films: string[];
	created: string;
	edited: string;
	url: string;
}

export interface Vehicle {
	name: string;
	model: string;
	manufacturer: string;
	cost_in_credits: string;
	length: string;
	max_atmosphering_speed: string;
	crew: string;
	passengers: string;
	cargo_capacity: string;
	consumables: string;
	vehicle_class: string;
	pilots: string[];
	films: string[];
	created: string;
	edited: string;
	url: string;
}

export interface Starship {
	name: string;
	model: string;
	starship_class: string;
	manufacturer: string;
	cost_in_credits: string;
	length: string;
	crew: string;
	passengers: string;
	cargo_capacity: string;
	consumables: string;
	max_atmosphering_speed: string;
	hyperdrive_rating: string;
	MGLT: string;
	pilots: string[];
	films: string[];
	created: string;
	edited: string;
	url: string;
}

export type Entity = Person | Planet | Film | Species | Vehicle | Starship;

/** The six SWAPI resource types the app lets users browse and search. */
export type Category = 'people' | 'planets' | 'films' | 'species' | 'vehicles' | 'starships';

export const CATEGORIES: Category[] = ['people', 'planets', 'films', 'species', 'vehicles', 'starships'];

export const CATEGORY_LABELS: Record<Category, string> = {
	people: 'People',
	planets: 'Planets',
	films: 'Films',
	species: 'Species',
	vehicles: 'Vehicles',
	starships: 'Starships',
};

/** The "transportation" categories — Vehicles and Starships — share a required tile field set. */
export type TransportationCategory = 'vehicles' | 'starships';

export function isTransportationCategory(category: Category): category is TransportationCategory {
	return category === 'vehicles' || category === 'starships';
}

export interface EntityByCategory {
	people: Person;
	planets: Planet;
	films: Film;
	species: Species;
	vehicles: Vehicle;
	starships: Starship;
}

export interface SwapiListResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}
