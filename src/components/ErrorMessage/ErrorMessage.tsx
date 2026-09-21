import styles from './ErrorMessage.module.scss';

export interface ErrorMessageProps {
	message: string;
}

// Replaces only the list/content area, not the whole screen — the category switcher and
// back tile stay mounted and focusable alongside this (spec story 21).
export function ErrorMessage({ message }: ErrorMessageProps) {
	return (
		<div className={styles.error} role="alert">
			<p className={styles.label}>Error</p>
			<p>{message}</p>
		</div>
	);
}
