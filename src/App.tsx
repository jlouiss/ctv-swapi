import { useEffect } from 'preact/hooks';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { NavigationProvider, useNavigation } from './navigation/NavigationContext';
import { BackHandlerProvider } from './navigation/BackHandlerContext';
import { BackTile } from './components/BackTile/BackTile';
import { CategorySwitcher } from './components/CategorySwitcher/CategorySwitcher';
import { Logo } from './components/Logo/Logo';
import { ListScreen } from './components/ListScreen/ListScreen';
import { DetailScreen } from './components/DetailScreen/DetailScreen';
import shellStyles from './components/Shell/Shell.module.scss';

function Screens() {
	const { screen } = useNavigation();
	useEffect(() => {
		// Land focus on the new screen's content, or on Back when a detail screen has nothing
		// else focusable (related entities are shown, not navigable — spec story 17).
		// Target a specific focusable leaf, not the LIST_<category> container itself: focusing
		// a container whose children haven't registered yet leaves the focus service's
		// "current component" pointing at a non-interactive element, breaking further D-Pad
		// navigation entirely.
		setFocus(screen.type === 'list' ? 'SEARCH_TOGGLE' : 'BACK_TILE');
	}, [screen.type, screen.category, screen.type === 'detail' ? screen.id : null]);
	if (screen.type === 'list') {
		// Keyed by category so switching categories fully remounts the screen (and its
		// children's useFocusable registrations) rather than reusing the same component
		// instance with a stale focus-key closure — norigin-spatial-navigation registers a
		// focusKey once at mount and doesn't re-register it on a prop change alone.
		return <ListScreen key={screen.category} category={screen.category} />;
	}
	return <DetailScreen key={`${screen.category}:${screen.id}`} category={screen.category} id={screen.id} />;
}

function Shell() {
	const { screen } = useNavigation();
	return (
		<div className={shellStyles.shell}>
			<aside className={shellStyles.sidebar}>
				<Logo />
				<BackTile />
				<CategorySwitcher activeCategory={screen.category} />
			</aside>
			<main className={shellStyles.main}>
				<Screens />
			</main>
		</div>
	);
}

export function App() {
	return (
		<BackHandlerProvider>
			<NavigationProvider initialCategory="people">
				<Shell />
			</NavigationProvider>
		</BackHandlerProvider>
	);
}
