import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useState } from 'preact/hooks';
import styles from './VirtualKeyboard.module.scss';

// Numbers, lowercase letters, and the symbols most likely to appear in Star Wars
// names/models (hyphen, apostrophe) — e.g. "Obi-Wan", "Jabba's Palace".
const ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', "zxcvbnm-'"];
const isLetter = (char: string) => /[a-z]/.test(char);

function Key({
	label,
	focusKey,
	onPress,
	wide,
	active,
}: {
	label: string;
	focusKey: string;
	onPress: () => void;
	wide?: boolean;
	active?: boolean;
}) {
	const { ref, focused } = useFocusable({ focusKey, onEnterPress: onPress });
	return (
		<button
			ref={ref}
			type="button"
			className={`${styles.key} ${wide ? styles.wide : ''} ${active ? styles.active : ''} ${focused ? styles.focused : ''}`}
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

/**
 * Netflix-style on-screen QWERTY keyboard, operable via D-Pad + OK (spec story 9).
 * Shift starts on — so the first character typed is uppercase, matching normal-name
 * capitalization — and auto-releases after one letter, like a phone keyboard's shift key
 * rather than caps lock; pressing Shift again re-arms it for another single capital.
 */
export function VirtualKeyboard({ onCharacter, onBackspace, onDone, focusKeyPrefix }: VirtualKeyboardProps) {
	const { ref, focusKey } = useFocusable({ focusKey: `${focusKeyPrefix}_KEYBOARD`, trackChildren: true });
	const [shift, setShift] = useState(true);

	const pressLetter = (char: string) => {
		onCharacter(shift ? char.toUpperCase() : char);
		if (shift) setShift(false);
	};

	return (
		<FocusContext.Provider value={focusKey}>
			<div ref={ref} className={styles.keyboard} aria-label="On-screen keyboard">
				{ROWS.map((row, rowIndex) => (
					<div className={styles.row} key={row}>
						{row.split('').map((char) => (
							<Key
								key={char}
								label={isLetter(char) && shift ? char.toUpperCase() : char}
								focusKey={`${focusKeyPrefix}_KEY_${char}`}
								onPress={() => (isLetter(char) ? pressLetter(char) : onCharacter(char))}
							/>
						))}
						{rowIndex === ROWS.length - 1 && (
							<Key label="Del" wide focusKey={`${focusKeyPrefix}_KEY_BACKSPACE`} onPress={onBackspace} />
						)}
					</div>
				))}
				<div className={styles.row}>
					<Key
						label="Shift"
						wide
						active={shift}
						focusKey={`${focusKeyPrefix}_KEY_SHIFT`}
						onPress={() => setShift((s) => !s)}
					/>
					<Key label="Space" wide focusKey={`${focusKeyPrefix}_KEY_SPACE`} onPress={() => onCharacter(' ')} />
					<Key label="Done" wide focusKey={`${focusKeyPrefix}_KEY_DONE`} onPress={onDone} />
				</div>
			</div>
		</FocusContext.Provider>
	);
}
