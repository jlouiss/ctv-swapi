import { cleanup, renderHook, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NormalizedCache } from '../cache/normalizedCache';
import type { Planet } from '../swapi/types';
import { useEntityDetail } from './useEntityDetail';

function jsonResponse(body: unknown) {
	return { ok: true, json: async () => body };
}

describe('useEntityDetail', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it('fetches the entity and resolves its related urls to display names', async () => {
		fetchMock.mockImplementation((url: string) => {
			if (url.includes('/planets/1/')) {
				return Promise.resolve(
					jsonResponse({
						name: 'Tatooine',
						rotation_period: '',
						orbital_period: '',
						diameter: '',
						climate: '',
						gravity: '',
						terrain: '',
						surface_water: '',
						population: '',
						residents: ['https://swapi.dev/api/people/1/'],
						films: [],
						created: '',
						edited: '',
						url: 'https://swapi.dev/api/planets/1/',
					}),
				);
			}
			if (url.includes('/people/1/')) {
				return Promise.resolve(
					jsonResponse({
						name: 'Luke Skywalker',
						height: '',
						mass: '',
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
						url: 'https://swapi.dev/api/people/1/',
					}),
				);
			}
			throw new Error(`unexpected url ${url}`);
		});
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useEntityDetail('planets', '1', { cache }));

		await waitFor(() => expect(result.current.status).toBe('idle'));
		expect((result.current.entity as Planet | null)?.name).toBe('Tatooine');
		const residents = result.current.related.find((group) => group.field === 'residents');
		expect(residents?.entries).toEqual([{ url: 'https://swapi.dev/api/people/1/', name: 'Luke Skywalker' }]);
	});

	it('reuses an entity already in the cache instead of refetching it', async () => {
		const cache = new NormalizedCache();
		cache.set('https://swapi.dev/api/planets/1/', {
			name: 'Tatooine',
			rotation_period: '',
			orbital_period: '',
			diameter: '',
			climate: '',
			gravity: '',
			terrain: '',
			surface_water: '',
			population: '',
			residents: [],
			films: [],
			created: '',
			edited: '',
			url: 'https://swapi.dev/api/planets/1/',
		});

		const { result } = renderHook(() => useEntityDetail('planets', '1', { cache }));

		await waitFor(() => expect(result.current.status).toBe('idle'));
		expect((result.current.entity as Planet | null)?.name).toBe('Tatooine');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('sets an error status when the entity fetch fails', async () => {
		fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
		const cache = new NormalizedCache();

		const { result } = renderHook(() => useEntityDetail('planets', '999', { cache }));

		await waitFor(() => expect(result.current.status).toBe('error'));
		expect(result.current.error).toBeTruthy();
	});
});
