import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import styles from './VirtualKeyboard.module.scss';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function Key({ label, focusKey, onPress, wide }: { label: string; focusKey: string; onPress: () => void; wide?: boolean }) {
	const { ref, focused } = useFocusable({ focusKey, onEnterPress: onPress });
	return (
		<button
			ref={ref}
			type="button"
			className={`${styles.key} ${wide ? styles.wide : ''} ${focused ? styles.focused : ''}`}
		>
			{label}
		</button>
	);
}

export interface VirtualKeyboardProps {
	onCharacter: (char: string) => void;
	onBackspace: () => void;
	onDone: () => void;
	focusKeyPrefix: string;
}

/** Netflix-style on-screen QWERTY keyboard, operable via D-Pad + OK (spec story 9). */
export function VirtualKeyboard({ onCharacter, onBackspace, onDone, focusKeyPrefix }: VirtualKeyboardProps) {
	const { ref, focusKey } = useFocusable({ focusKey: `${focusKeyPrefix}_KEYBOARD`, trackChildren: true });

	return (
		<FocusContext.Provider value={focusKey}>
			<div ref={ref} className={styles.keyboard} aria-label="On-screen keyboard">
				{ROWS.map((row, rowIndex) => (
					<div className={styles.row} key={row}>
						{row.split('').map((char) => (
							<Key
								key={char}
								label={char}
								focusKey={`${focusKeyPrefix}_KEY_${char}`}
								onPress={() => onCharacter(char)}
							/>
						))}
						{rowIndex === ROWS.length - 1 && (
							<Key
								label="⌫"
								wide
								focusKey={`${focusKeyPrefix}_KEY_BACKSPACE`}
								onPress={onBackspace}
							/>
						)}
					</div>
				))}
				<div className={styles.row}>
					<Key label="Space" wide focusKey={`${focusKeyPrefix}_KEY_SPACE`} onPress={() => onCharacter(' ')} />
					<Key label="Done" wide focusKey={`${focusKeyPrefix}_KEY_DONE`} onPress={onDone} />
				</div>
			</div>
		</FocusContext.Provider>
	);
}
