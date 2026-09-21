import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useNavigation } from '../../navigation/NavigationContext';
import { useBackHandlerInvoker, useHasBackOverride } from '../../navigation/BackHandlerContext';
import styles from './BackTile.module.scss';

/**
 * Persistent "Back" tile, fixed at the top of the sidebar on every screen (spec story 5).
 * On the very first screen — the root category list, with no local override (e.g. search)
 * active — there is nothing to go back to, so it's neither focusable nor clickable.
 */
export function BackTile() {
	const navigation = useNavigation();
	const invokeBackHandler = useBackHandlerInvoker();
	const hasOverride = useHasBackOverride();
	const active = navigation.canGoBack || hasOverride;

	const { ref, focused } = useFocusable({
		focusKey: 'BACK_TILE',
		focusable: active,
		onEnterPress: () => {
			if (invokeBackHandler()) return;
			navigation.back();
		},
	});

	return (
		<button
			ref={ref}
			type="button"
			disabled={!active}
			className={`${styles.tile} ${focused ? styles.focused : ''} ${!active ? styles.disabled : ''}`}
			aria-label="Back"
		>
			<span aria-hidden="true">←</span> Back
		</button>
	);
}
