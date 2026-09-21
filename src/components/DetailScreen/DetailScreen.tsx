import type { Category, Entity } from '../../swapi/types';
import { displayName, RELATED_FIELDS } from '../../swapi/related';
import { imageUrl } from '../../swapi/image';
import { useEntityDetail } from '../../hooks/useEntityDetail';
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator';
import { ErrorMessage } from '../ErrorMessage/ErrorMessage';
import { RelatedList } from '../RelatedList/RelatedList';
import styles from './DetailScreen.module.scss';

const HIDDEN_FIELDS = new Set(['name', 'title', 'url', 'created', 'edited']);

function labelFor(field: string): string {
	return field
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

// Related fields are rendered separately by RelatedList (resolved to names, read-only —
// spec story 17), so they're excluded here using the same field list that drives that
// resolution (src/swapi/related.ts), rather than a second hand-maintained list.
function fieldsOf(category: Category, entity: Entity): { label: string; value: string }[] {
	const relatedFieldNames = new Set(RELATED_FIELDS[category]);
	return Object.entries(entity as unknown as Record<string, unknown>)
		.filter(([key]) => !HIDDEN_FIELDS.has(key) && !relatedFieldNames.has(key))
		.map(([key, value]) => ({ label: labelFor(key), value: String(value) }));
}

export function DetailScreen({ category, id }: { category: Category; id: string }) {
	const { entity, related, status, error } = useEntityDetail(category, id);

	if (status === 'loading') return <LoadingIndicator label="Loading details…" />;
	if (status === 'error') return <ErrorMessage message={error ?? 'Something went wrong.'} />;
	if (!entity) return null;

	return (
		<div className={styles.detail}>
			<div className={styles.hero}>
				<img className={styles.heroImage} src={imageUrl(category, id, 640, 360)} alt="" />
				<h1 className={styles.title}>{displayName(entity)}</h1>
			</div>
			<dl className={styles.fields}>
				{fieldsOf(category, entity).map((field) => (
					<div className={styles.field} key={field.label}>
						<dt>{field.label}</dt>
						<dd>{field.value}</dd>
					</div>
				))}
			</dl>
			<RelatedList groups={related} />
		</div>
	);
}
