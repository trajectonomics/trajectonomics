// The one module that touches the browser: storage, the system theme, the address bar, the document
// and fetch. `src/lib/` stays pure; the hooks in this folder are the only callers.
import { createSnapshotLoader } from "../lib/view/loader"
import type { Theme } from "../lib/view/preferences"

/** The visit's one Snapshot loader. Every component reads the same file once. */
export const snapshotLoader = createSnapshotLoader((url) => fetch(url, { cache: "no-store" }))

/** A stored value, or null when storage is unavailable (a private window, blocked site data). */
export function readStored(key: string): string | null {
	try {
		return window.localStorage.getItem(key)
	} catch {
		return null
	}
}

/** Stores a value. A refused write is ignored: the setting then lasts only for this page. */
export function writeStored(key: string, value: string): void {
	try {
		window.localStorage.setItem(key, value)
	} catch {
		// Storage is unavailable; the page still shows the chosen setting.
	}
}

/** Calls the listener on each Escape key press in the page. Returns the unsubscribe. */
export function subscribeEscape(listener: () => void): () => void {
	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === "Escape") listener()
	}
	window.addEventListener("keydown", onKeydown)
	return () => window.removeEventListener("keydown", onKeydown)
}

/** Whether the system asks for a dark Theme. False when the browser cannot say. */
export function prefersDark(): boolean {
	try {
		return window.matchMedia("(prefers-color-scheme: dark)").matches
	} catch {
		return false
	}
}

/** Sets `data-theme` on `<html>`, which scopes the brand's tokens for that Theme. */
export function applyTheme(theme: Theme): void {
	document.documentElement.setAttribute("data-theme", theme)
}

/**
 * Calls the listener when a setting or the address could have changed in another tab or by the
 * history, or when the system's colour scheme changes. Returns the unsubscribe.
 */
export function subscribeExternal(listener: () => void): () => void {
	window.addEventListener("storage", listener)
	window.addEventListener("popstate", listener)
	const query = matchMediaOrNull()
	query?.addEventListener("change", listener)
	return () => {
		window.removeEventListener("storage", listener)
		window.removeEventListener("popstate", listener)
		query?.removeEventListener("change", listener)
	}
}

function matchMediaOrNull(): MediaQueryList | null {
	try {
		return window.matchMedia("(prefers-color-scheme: dark)")
	} catch {
		return null
	}
}

/** Stores a value and says whether the browser kept it: false in a private window or with site data blocked. */
export function tryWriteStored(key: string, value: string): boolean {
	try {
		window.localStorage.setItem(key, value)
		return true
	} catch {
		return false
	}
}
