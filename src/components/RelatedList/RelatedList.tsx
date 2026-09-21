import type { RelatedGroup } from '../../hooks/useEntityDetail';
import styles from './RelatedList.module.scss';

const FIELD_LABELS: Record<string, string> = {
	homeworld: 'Homeworld',
	films: 'Films',
	species: 'Species',
	vehicles: 'Vehicles',
	starships: 'Starships',
	residents: 'Residents',
	characters: 'Characters',
	planets: 'Planets',
	people: 'People',
	pilots: 'Pilots',
};

// Related entities are shown by name only — not separately navigable (spec story 17),
// so this deliberately renders plain text, not focusable tiles.
export function RelatedList({ groups }: { groups: RelatedGroup[] }) {
	const nonEmpty = groups.filter((group) => group.entries.length > 0);
	if (nonEmpty.length === 0) return null;

	return (
		<div className={styles.related}>
			{nonEmpty.map((group) => (
				<div className={styles.group} key={group.field}>
					<h3>{FIELD_LABELS[group.field] ?? group.field}</h3>
					<ul>
						{group.entries.map((entry) => (
							<li key={entry.url}>{entry.name}</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}
