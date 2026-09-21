import { describe, expect, it } from 'vitest';
import { NormalizedCache } from './normalizedCache';
import type { Person } from '../swapi/types';

function person(url: string, name: string): Person {
	return {
		name,
		height: '1',
		mass: '1',
		hair_color: '',
		skin_color: '',
		eye_color: '',
		birth_year: '',
		gender: '',
		homeworld: '',
		films: [],
		species: [],
		vehicles: [],
		starships: [],
		created: '',
		edited: '',
		url,
	};
}

describe('NormalizedCache', () => {
	it('stores and retrieves an entity by its id (url)', () => {
		const cache = new NormalizedCache();
		cache.set('https://swapi.dev/api/people/1/', person('https://swapi.dev/api/people/1/', 'Luke'));

		expect((cache.get('https://swapi.dev/api/people/1/') as Person | undefined)?.name).toBe('Luke');
	});

	it('returns the same canonical record when set twice, so list and detail views share one copy', () => {
		const cache = new NormalizedCache();
		const url = 'https://swapi.dev/api/people/1/';
		cache.set(url, person(url, 'Luke'));
		cache.set(url, person(url, 'Luke Skywalker'));

		expect((cache.get(url) as Person | undefined)?.name).toBe('Luke Skywalker');
		expect(cache.size).toBe(1);
	});

	it('evicts the oldest untracked entity once the cap is exceeded', () => {
		const cache = new NormalizedCache({ maxEntries: 2 });
		cache.set('a', person('a', 'A'));
		cache.set('b', person('b', 'B'));
		cache.set('c', person('c', 'C'));

		expect(cache.get('a')).toBeUndefined();
		expect((cache.get('b') as Person | undefined)?.name).toBe('B');
		expect((cache.get('c') as Person | undefined)?.name).toBe('C');
		expect(cache.size).toBe(2);
	});

	it('does not evict entities currently referenced by a tracked list order', () => {
		const cache = new NormalizedCache({ maxEntries: 2 });
		cache.set('a', person('a', 'A'));
		cache.retain('a');
		cache.set('b', person('b', 'B'));
		cache.set('c', person('c', 'C'));

		expect((cache.get('a') as Person | undefined)?.name).toBe('A');
	});
});
