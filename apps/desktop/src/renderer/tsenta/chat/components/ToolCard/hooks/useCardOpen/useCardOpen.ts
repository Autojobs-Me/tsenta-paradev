import { useCallback, useSyncExternalStore } from "react";

/**
 * Which cards the reader opened or closed, by key, for the life of the
 * window. Conductor keeps this in one store (workspace-chat spec §5) so a
 * card stays as it was left when the transcript unmounts and remounts it,
 * which Paradev's windowed transcript does as it scrolls.
 */
const openByKey = new Map<string, boolean>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function setCardOpen(key: string, open: boolean): void {
	openByKey.set(key, open);
	for (const listener of listeners) listener();
}

export function useCardOpen(
	key: string,
	defaultOpen = false,
): [boolean, (open: boolean) => void] {
	const open = useSyncExternalStore(
		subscribe,
		() => openByKey.get(key) ?? defaultOpen,
	);
	const setOpen = useCallback((next: boolean) => setCardOpen(key, next), [key]);
	return [open, setOpen];
}
