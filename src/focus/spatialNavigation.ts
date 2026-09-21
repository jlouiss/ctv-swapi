import { init } from '@noriginmedia/norigin-spatial-navigation';

let initialized = false;

/** Initializes D-Pad/OK focus navigation once for the app's lifetime. */
export function initSpatialNavigation(): void {
	if (initialized) return;
	initialized = true;
	init({ debug: false, visualDebug: false, shouldFocusDOMNode: true });
}
