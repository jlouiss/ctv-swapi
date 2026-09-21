import { createContext } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

type BackHandler = () => void;

export interface BackHandlerApi {
	/** Registers a handler that intercepts the next Back press instead of the default nav pop. */
	register: (handler: BackHandler) => () => void;
	/** Invokes the topmost registered handler, if any; returns whether one handled it. */
	invokeTop: () => boolean;
	/** True while at least one handler is registered (e.g. a screen's local "exit this mode"). */
	hasActive: boolean;
}

const BackHandlerContext = createContext<BackHandlerApi | null>(null);

export function BackHandlerProvider(props: { children: ComponentChildren }) {
	const stackRef = useRef<BackHandler[]>([]);
	const [depth, setDepth] = useState(0);

	const api = useMemo<BackHandlerApi>(
		() => ({
			register: (handler) => {
				stackRef.current.push(handler);
				setDepth(stackRef.current.length);
				return () => {
					stackRef.current = stackRef.current.filter((h) => h !== handler);
					setDepth(stackRef.current.length);
				};
			},
			invokeTop: () => {
				const top = stackRef.current[stackRef.current.length - 1];
				if (!top) return false;
				top();
				return true;
			},
			hasActive: depth > 0,
		}),
		[depth],
	);

	return <BackHandlerContext.Provider value={api}>{props.children}</BackHandlerContext.Provider>;
}

export function useBackHandlerRegistration(active: boolean, handler: BackHandler): void {
	const api = useContext(BackHandlerContext);
	useEffect(() => {
		if (!api || !active) return;
		return api.register(handler);
	}, [api, active, handler]);
}

export function useBackHandlerInvoker(): () => boolean {
	const api = useContext(BackHandlerContext);
	if (!api) throw new Error('useBackHandlerInvoker must be used within a BackHandlerProvider');
	return api.invokeTop;
}

/** True while a screen has registered a local back override (e.g. search mode is active). */
export function useHasBackOverride(): boolean {
	const api = useContext(BackHandlerContext);
	if (!api) throw new Error('useHasBackOverride must be used within a BackHandlerProvider');
	return api.hasActive;
}
