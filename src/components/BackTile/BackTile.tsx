import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useNavigation } from '../../navigation/NavigationContext';
import { useBackHandlerInvoker } from '../../navigation/BackHandlerContext';
import styles from './BackTile.module.scss';

/** Persistent "Back" tile, fixed top-left on every screen (spec story 5). */
export function BackTile() {
	const navigation = useNavigation();
	const invokeBackHandler = useBackHandlerInvoker();
	const { ref, focused } = useFocusable({
		focusKey: 'BACK_TILE',
		onEnterPress: () => {
			if (invokeBackHandler()) return;
			navigation.back();
		},
	});

	return (
		<button
			ref={ref}
			type="button"
			className={`${styles.tile} ${focused ? styles.focused : ''}`}
			aria-label="Back"
		>
			<span aria-hidden="true">←</span> Back
		</button>
	);
}
