import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useCallback, useState } from 'preact/hooks';
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

function SearchToggle({ onPress }: { onPress: () => void }) {
	const { ref, focused } = useFocusable({ focusKey: 'SEARCH_TOGGLE', onEnterPress: onPress });
	return (
		<button ref={ref} type="button" className={`${styles.searchToggle} ${focused ? styles.focused : ''}`}>
			🔍 Search
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
	const showLoadingMore = !isSearching && status === 'loading' && items.length > 0;
	const showInitialLoading = status === 'loading' && items.length === 0;
	const showEmptyState = status === 'idle' && items.length === 0;

	const { ref, focusKey } = useFocusable({ focusKey: `LIST_${category}`, trackChildren: true });

	const handleTileFocus = (index: number) => {
		if (!isSearching && index >= list.items.length - PREFETCH_THRESHOLD) {
			list.loadMore();
		}
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
					<div className={styles.content}>
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
