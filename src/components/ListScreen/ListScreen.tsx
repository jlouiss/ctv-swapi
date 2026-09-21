import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useCallback, useRef, useState } from 'preact/hooks';
import type { Category } from '../../swapi/types';
import { extractId } from '../../swapi/id';
import { useNavigation } from '../../navigation/NavigationContext';
import { useBackHandlerRegistration } from '../../navigation/BackHandlerContext';
import { useCategoryList } from '../../hooks/useCategoryList';
import { useSearch } from '../../hooks/useSearch';
import { Tile } from '../Tile/Tile';
import { VirtualKeyboard } from '../VirtualKeyboard/VirtualKeyboard';
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator';
import { ErrorMessage } from '../ErrorMessage/ErrorMessage';
import styles from './ListScreen.module.scss';

// Focus reaches this many tiles from the end of the loaded set before the next page
// prefetches silently — see docs/adr/0003-proximity-prefetch-pagination.md.
const PREFETCH_THRESHOLD = 2;

// Mouse-wheel scrolling is a secondary input path alongside D-Pad focus (spec targets D-Pad
// only, but this is developed and often viewed in a desktop browser too) — prefetch also
// fires once the viewer scrolls within this many pixels of the loaded content's bottom, so
// scrolling alone reveals more results even without moving focus.
const SCROLL_PREFETCH_MARGIN_PX = 400;

function SearchToggle({ onPress }: { onPress: () => void }) {
	// ListScreen is keyed by category (see App.tsx), so this always mounts fresh per category —
	// a plain, stable focusKey is safe here (no risk of colliding with an outgoing instance).
	const { ref, focused } = useFocusable({ focusKey: 'SEARCH_TOGGLE', onEnterPress: onPress });
	return (
		<button ref={ref} type="button" className={`${styles.searchToggle} ${focused ? styles.focused : ''}`}>
			Search
		</button>
	);
}

export function ListScreen({ category }: { category: Category }) {
	const navigation = useNavigation();
	const [searchActive, setSearchActive] = useState(false);
	const [query, setQuery] = useState('');

	const exitSearch = useCallback(() => {
		setSearchActive(false);
		setQuery('');
	}, []);
	useBackHandlerRegistration(searchActive, exitSearch);

	const list = useCategoryList(category);
	const search = useSearch(category, query);
	const isSearching = searchActive && query.trim() !== '';

	const items = isSearching ? search.items : list.items;
	const status = isSearching ? search.status : list.status;
	const error = isSearching ? search.error : list.error;
	const showLoadingMore = isSearching ? search.loadingMore : status === 'loading' && items.length > 0;
	const showInitialLoading = status === 'loading' && items.length === 0;
	const showEmptyState = status === 'idle' && items.length === 0;

	const { ref, focusKey } = useFocusable({ focusKey: `LIST_${category}`, trackChildren: true });

	// Shared by both prefetch triggers below (D-Pad focus proximity and mouse-wheel scroll
	// proximity) so the two inputs can never fall out of sync on what "load more" means.
	const loadMore = () => {
		if (isSearching) {
			if (search.hasMore) search.loadMore();
		} else if (list.hasMore) {
			list.loadMore();
		}
	};

	const handleTileFocus = (index: number) => {
		const itemCount = isSearching ? search.items.length : list.items.length;
		if (index >= itemCount - PREFETCH_THRESHOLD) loadMore();
	};

	const contentRef = useRef<HTMLDivElement>(null);
	const handleScroll = () => {
		const el = contentRef.current;
		if (!el) return;
		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_PREFETCH_MARGIN_PX;
		if (nearBottom) loadMore();
	};

	return (
		<FocusContext.Provider value={focusKey}>
			<div ref={ref} className={styles.screen}>
				<div className={styles.header}>
					<SearchToggle onPress={() => setSearchActive(true)} />
					{isSearching && <span className={styles.query}>Results for “{query.trim()}”</span>}
				</div>
				<div className={styles.body}>
					{searchActive && (
						<VirtualKeyboard
							focusKeyPrefix={`LIST_${category}`}
							onCharacter={(char) => setQuery((q) => q + char)}
							onBackspace={() => setQuery((q) => q.slice(0, -1))}
							onDone={exitSearch}
						/>
					)}
					<div className={styles.content} ref={contentRef} onScroll={handleScroll}>
						{status === 'error' && <ErrorMessage message={error ?? 'Something went wrong.'} />}
						{status !== 'error' && showInitialLoading && <LoadingIndicator label="Loading…" />}
						{status !== 'error' && showEmptyState && isSearching && (
							<p className={styles.noResults}>No results for “{query.trim()}”.</p>
						)}
						{status !== 'error' && showEmptyState && !isSearching && (
							<p className={styles.noResults}>Nothing to show yet.</p>
						)}
						{items.length > 0 && (
							<div className={styles.grid}>
								{items.map((item, index) => (
									<Tile
										key={item.url}
										category={category}
										entity={item}
										focusKey={`LIST_${category}_TILE_${item.url}`}
										onFocus={() => handleTileFocus(index)}
										onSelect={() => navigation.openDetail(category, extractId(item.url))}
									/>
								))}
							</div>
						)}
						{showLoadingMore && <LoadingIndicator variant="inline" label="Loading more…" />}
					</div>
				</div>
			</div>
		</FocusContext.Provider>
	);
}
