import { describe, expect, it } from 'vitest';
import { imageUrl } from './image';

describe('imageUrl', () => {
	it('is deterministic per category and id, matching the same entity every time', () => {
		expect(imageUrl('people', '1', 400, 300)).toBe(imageUrl('people', '1', 400, 300));
	});

	it('seeds picsum with "{category}-{id}"', () => {
		expect(imageUrl('people', '135', 400, 300)).toBe('https://picsum.photos/seed/people-135/400/300');
	});

	it('differs between categories sharing the same numeric id', () => {
		expect(imageUrl('people', '1', 400, 300)).not.toBe(imageUrl('planets', '1', 400, 300));
	});
});
