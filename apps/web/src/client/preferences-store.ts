import { useEffect, useSyncExternalStore } from "react"
import {
	HIDE_KEY,
	parseHideAmounts,
	resolveTheme,
	serializeHideAmounts,
	THEME_KEY,
	type Theme,
} from "../lib/view/preferences"
import { applyTheme, prefersDark, readStored, subscribeExternal, writeStored } from "./browser"

const listeners = new Set<() => void>()

function notify(): void {
	for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener)
	const unsubscribe = subscribeExternal(listener)
	return () => {
		listeners.delete(listener)
		unsubscribe()
	}
}

function currentTheme(): Theme {
	return resolveTheme(readStored(THEME_KEY), prefersDark())
}

function currentHidden(): boolean {
	return parseHideAmounts(readStored(HIDE_KEY))
}

/**
 * The Theme in effect and a setter for it. Every island on the page sees a change at once. Without a
 * stored choice the Theme follows the system.
 */
export function useTheme(): [Theme, (next: Theme) => void] {
	const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme)
	useEffect(() => applyTheme(theme), [theme])
	return [theme, setTheme]
}

function setTheme(next: Theme): void {
	writeStored(THEME_KEY, next)
	applyTheme(next)
	notify()
}

/** Whether amounts are hidden, and a setter for it. */
export function useHideAmounts(): [boolean, (next: boolean) => void] {
	const hidden = useSyncExternalStore(subscribe, currentHidden, () => false)
	return [hidden, setHidden]
}

function setHidden(next: boolean): void {
	writeStored(HIDE_KEY, serializeHideAmounts(next))
	notify()
}
