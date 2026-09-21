import { Fragment } from 'preact';
import { isTransportationCategory, type Category, type Entity } from '../../swapi/types';
import { displayName, RELATED_FIELDS } from '../../swapi/related';
import { imageUrl } from '../../swapi/image';
import { TRANSPORTATION_DETAIL_PRIORITY_FIELDS } from '../../swapi/transportationFields';
import { useEntityDetail } from '../../hooks/useEntityDetail';
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator';
import { ErrorMessage } from '../ErrorMessage/ErrorMessage';
import { RelatedList } from '../RelatedList/RelatedList';
import styles from './DetailScreen.module.scss';

const HIDDEN_FIELDS = new Set(['name', 'title', 'url', 'created', 'edited']);
const TRANSPORTATION_PRIORITY_KEYS = TRANSPORTATION_DETAIL_PRIORITY_FIELDS.map((f) => f.key as string);

// swapi's opening_crawl has a hard line break after nearly every line (formatted for the
// movie's scrolling-crawl effect, not for prose) and a blank line between paragraphs. Now
// that the field gets a full-width row (see .fieldWide) to reflow naturally, collapsing the
// single breaks into spaces reads far better than honoring every one of them — the blank
// line between paragraphs is kept.
function formatOpeningCrawl(value: string): string {
	return value
		.split(/\r?\n\r?\n/)
		.map((paragraph) => paragraph.replace(/\r?\n/g, ' ').trim())
		.join('\n\n');
}

function labelFor(field: string): string {
	return field
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

interface DetailField {
	label: string;
	value: string;
	/** Priority fields (a transportation entity's curated summary) render first, grouped
	 * onto a fresh row from the rest of the entity's fields — same styling throughout, this
	 * is purely an ordering/grouping split, not a visual-weight one. Every field is priority
	 * for non-transportation categories — there's no such split to make there. */
	priority: boolean;
	/** A field long enough to want its own full-width row (e.g. a Film's opening crawl). */
	wide?: boolean;
}

// Related fields are rendered separately by RelatedList (resolved to names, read-only —
// spec story 17), so they're excluded here using the same field list that drives that
// resolution (src/swapi/related.ts), rather than a second hand-maintained list.
function fieldsOf(category: Category, entity: Entity): DetailField[] {
	const relatedFieldNames = new Set(RELATED_FIELDS[category]);
	const entries = Object.entries(entity as unknown as Record<string, unknown>).filter(
		([key]) => !HIDDEN_FIELDS.has(key) && !relatedFieldNames.has(key),
	);
	const wide = (key: string) => category === 'films' && key === 'opening_crawl';

	if (!isTransportationCategory(category)) {
		return entries.map(([key, value]) => ({
			label: labelFor(key),
			value: wide(key) ? formatOpeningCrawl(String(value)) : String(value),
			priority: true,
			wide: wide(key),
		}));
	}

	// The curated priority fields (TRANSPORTATION_DETAIL_PRIORITY_FIELDS), in that order,
	// first — then the rest of the entity's fields, grouped onto a following row.
	const byKey = new Map(entries);
	const priority: DetailField[] = TRANSPORTATION_PRIORITY_KEYS.filter((key) => byKey.has(key)).map((key) => ({
		label: labelFor(key),
		value: String(byKey.get(key)),
		priority: true,
	}));
	const rest: DetailField[] = entries
		.filter(([key]) => !TRANSPORTATION_PRIORITY_KEYS.includes(key))
		.map(([key, value]) => ({ label: labelFor(key), value: String(value), priority: false }));
	return [...priority, ...rest];
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
				{fieldsOf(category, entity).map((field, index, all) => (
					<Fragment key={field.label}>
						{!field.priority && all[index - 1]?.priority && <div className={styles.sectionBreak} />}
						<div className={`${styles.field} ${field.wide ? styles.fieldWide : ''}`}>
							<dt>{field.label}</dt>
							<dd>{field.value}</dd>
						</div>
					</Fragment>
				))}
			</dl>
			<RelatedList groups={related} />
		</div>
	);
}
