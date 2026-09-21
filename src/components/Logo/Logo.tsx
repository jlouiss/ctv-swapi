import styles from './Logo.module.scss';

export function Logo() {
	return (
		<div className={styles.logo}>
			<span className={styles.mark} aria-hidden="true" />
			<span className={styles.wordmark}>
				SWAPI <span className={styles.accent}>Browser</span>
			</span>
		</div>
	);
}
