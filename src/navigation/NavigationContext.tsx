import { createContext } from 'preact';
import { useContext, useMemo, useReducer } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Category } from '../swapi/types';

export type Screen = { type: 'list'; category: Category } | { type: 'detail'; category: Category; id: string };

type Action =
	| { kind: 'switchCategory'; category: Category }
	| { kind: 'openDetail'; category: Category; id: string }
	| { kind: 'back' };

function reducer(stack: Screen[], action: Action): Screen[] {
	switch (action.kind) {
		case 'switchCategory':
			// A category switch always lands on that category's list, collapsing any open detail —
			// see docs/adr/0002-in-memory-navigation-no-router.md.
			return [{ type: 'list', category: action.category }];
		case 'openDetail':
			return [...stack, { type: 'detail', category: action.category, id: action.id }];
		case 'back':
			return stack.length > 1 ? stack.slice(0, -1) : stack;
		default:
			return stack;
	}
}

export interface NavigationApi {
	screen: Screen;
	canGoBack: boolean;
	switchCategory: (category: Category) => void;
	openDetail: (category: Category, id: string) => void;
	back: () => void;
}

const NavigationContext = createContext<NavigationApi | null>(null);

export function NavigationProvider(props: { initialCategory: Category; children: ComponentChildren }) {
	const [stack, dispatch] = useReducer(reducer, [{ type: 'list', category: props.initialCategory }] as Screen[]);

	const api = useMemo<NavigationApi>(
		() => ({
			screen: stack[stack.length - 1],
			canGoBack: stack.length > 1,
			switchCategory: (category) => dispatch({ kind: 'switchCategory', category }),
			openDetail: (category, id) => dispatch({ kind: 'openDetail', category, id }),
			back: () => dispatch({ kind: 'back' }),
		}),
		[stack],
	);

	return <NavigationContext.Provider value={api}>{props.children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationApi {
	const ctx = useContext(NavigationContext);
	if (!ctx) throw new Error('useNavigation must be used within a NavigationProvider');
	return ctx;
}
