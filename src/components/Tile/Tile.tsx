import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { isTransportationCategory, type Category, type Entity, type Film, type Vehicle, type Starship } from '../../swapi/types';
import { displayName } from '../../swapi/related';
import { extractId } from '../../swapi/id';
import { imageUrl } from '../../swapi/image';
import styles from './Tile.module.scss';

function curatedFields(category: Category, entity: Entity): { label: string; value: string }[] {
	switch (category) {
		case 'people': {
			const e = entity as Extract<Entity, { birth_year: string }>;
			return [
				{ label: 'Birth year', value: e.birth_year },
				{ label: 'Gender', value: e.gender },
			];
		}
		case 'planets': {
			const e = entity as Extract<Entity, { climate: string }>;
			return [
				{ label: 'Climate', value: e.climate },
				{ label: 'Population', value: e.population },
			];
		}
		case 'films': {
			const e = entity as Film;
			return [
				{ label: 'Episode', value: String(e.episode_id) },
				{ label: 'Released', value: e.release_date },
			];
		}
		case 'species': {
			const e = entity as Extract<Entity, { classification: string }>;
			return [
				{ label: 'Classification', value: e.classification },
				{ label: 'Language', value: e.language },
			];
		}
		default:
			return [];
	}
}

function transportationFields(entity: Vehicle | Starship): { label: string; value: string }[] {
	return [
		{ label: 'Model', value: entity.model },
		{ label: 'Manufacturer', value: entity.manufacturer },
		{ label: 'Cost in credits', value: entity.cost_in_credits },
		{ label: 'Length', value: entity.length },
		{ label: 'Crew', value: entity.crew },
		{ label: 'Passengers', value: entity.passengers },
		{ label: 'Cargo capacity', value: entity.cargo_capacity },
	];
}

export interface TileProps {
	category: Category;
	entity: Entity;
	focusKey: string;
	onFocus?: () => void;
	onSelect: () => void;
}

export function Tile({ category, entity, focusKey, onFocus, onSelect }: TileProps) {
	const { ref, focused } = useFocusable({
		focusKey,
		onEnterPress: onSelect,
		onFocus,
	});
	const transportation = isTransportationCategory(category);
	const fields = transportation
		? transportationFields(entity as Vehicle | Starship)
		: curatedFields(category, entity);

	return (
		<button
			ref={ref}
			type="button"
			data-testid="entity-tile"
			className={`${styles.tile} ${transportation ? styles.transportation : ''} ${focused ? styles.focused : ''}`}
		>
			<img
				className={styles.image}
				src={imageUrl(category, extractId(entity.url), transportation ? 360 : 280, 160)}
				alt=""
				loading="lazy"
			/>
			<span className={styles.name}>{displayName(entity)}</span>
			<dl className={styles.fields}>
				{fields.map((field) => (
					<div className={styles.field} key={field.label}>
						<dt>{field.label}</dt>
						<dd>{field.value || '—'}</dd>
					</div>
				))}
			</dl>
		</button>
	);
}
