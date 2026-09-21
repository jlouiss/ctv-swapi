import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../../swapi/types';
import { useNavigation } from '../../navigation/NavigationContext';
import styles from './CategorySwitcher.module.scss';

function CategoryButton({ category, active }: { category: Category; active: boolean }) {
	const navigation = useNavigation();
	const { ref, focused } = useFocusable({
		focusKey: `CATEGORY_${category}`,
		onEnterPress: () => navigation.switchCategory(category),
	});

	return (
		<button
			ref={ref}
			type="button"
			className={`${styles.tile} ${focused ? styles.focused : ''} ${active ? styles.active : ''}`}
		>
			{CATEGORY_LABELS[category]}
		</button>
	);
}

/** Persistent switcher between the six categories, reachable from anywhere (spec stories 1-2). */
export function CategorySwitcher({ activeCategory }: { activeCategory: Category }) {
	const { ref, focusKey } = useFocusable({ focusKey: 'CATEGORY_SWITCHER', trackChildren: true });

	return (
		<FocusContext.Provider value={focusKey}>
			<nav ref={ref} className={styles.switcher} aria-label="Categories">
				{CATEGORIES.map((category) => (
					<CategoryButton key={category} category={category} active={category === activeCategory} />
				))}
			</nav>
		</FocusContext.Provider>
	);
}
