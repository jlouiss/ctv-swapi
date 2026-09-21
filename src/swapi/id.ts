/** Extracts the numeric ID from a swapi.dev resource URL, e.g. ".../people/4/" -> "4". */
export function extractId(url: string): string {
	const match = url.match(/\/(\d+)\/?$/);
	if (!match) {
		throw new Error(`Cannot extract id from swapi url: ${url}`);
	}
	return match[1];
}
