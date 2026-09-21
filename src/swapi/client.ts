import type { Category, EntityByCategory, SwapiListResponse } from './types';

// swapi.dev, not swapi.tech — see docs/adr/0001-use-swapi-dev-not-swapi-tech.md.
export const SWAPI_BASE_URL = 'https://swapi.dev/api';

export class SwapiError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SwapiError';
	}
}

/** True when a fetch failed because it was superseded (e.g. by newer search input), not a real error. */
export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
	let response: Response;
	try {
		response = await fetch(url, { signal });
	} catch (cause) {
		if (isAbortError(cause)) throw cause;
		throw new SwapiError('Could not reach the Star Wars API. Check your connection and try again.');
	}
	if (!response.ok) {
		throw new SwapiError(
			response.status === 404
				? 'That request could not be found.'
				: `The Star Wars API returned an error (${response.status}).`,
		);
	}
	return (await response.json()) as T;
}

export function listUrl(category: Category, page = 1): string {
	return `${SWAPI_BASE_URL}/${category}/?page=${page}`;
}

export function searchUrl(category: Category, query: string, page = 1): string {
	return `${SWAPI_BASE_URL}/${category}/?search=${encodeURIComponent(query)}&page=${page}`;
}

export function detailUrl(category: Category, id: string): string {
	return `${SWAPI_BASE_URL}/${category}/${id}/`;
}

export function fetchList<C extends Category>(
	url: string,
	signal?: AbortSignal,
): Promise<SwapiListResponse<EntityByCategory[C]>> {
	return request<SwapiListResponse<EntityByCategory[C]>>(url, signal);
}

export function fetchEntity<C extends Category>(url: string, signal?: AbortSignal): Promise<EntityByCategory[C]> {
	return request<EntityByCategory[C]>(url, signal);
}
