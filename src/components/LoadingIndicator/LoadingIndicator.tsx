import styles from './LoadingIndicator.module.scss';

export interface LoadingIndicatorProps {
	label?: string;
	/** 'inline' sits within already-visible content (e.g. below a partially-loaded grid);
	 *  'block' fills its container without taking over the whole screen (spec stories 18-19). */
	variant?: 'inline' | 'block';
}

export function LoadingIndicator({ label = 'Loading…', variant = 'block' }: LoadingIndicatorProps) {
	return (
		<div className={variant === 'inline' ? styles.inline : styles.block} role="status" aria-live="polite">
			<span className={styles.spinner} aria-hidden="true" />
			<span>{label}</span>
		</div>
	);
}
