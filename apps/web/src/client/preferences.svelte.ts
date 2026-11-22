import {
	HIDE_KEY,
	parseHideAmounts,
	resolveTheme,
	serializeHideAmounts,
	THEME_KEY,
	type Theme,
} from "../lib/view/preferences"
import { applyTheme, prefersDark, readStored, subscribeExternal, writeStored } from "./browser"

/**
 * The Theme and the hide-amounts switch. Every component reads the one instance, so a change shows at
 * once. A refused write keeps the choice for this page only.
 */
class Preferences {
	theme = $state<Theme>("light")
	hidden = $state(false)

	constructor() {
		if (typeof window === "undefined") return
		this.sync()
		subscribeExternal(() => this.sync())
	}

	/** Reads both settings again: from storage, and from the system when no Theme is stored. */
	sync(): void {
		this.theme = resolveTheme(readStored(THEME_KEY), prefersDark())
		this.hidden = parseHideAmounts(readStored(HIDE_KEY))
		applyTheme(this.theme)
	}

	setTheme(next: Theme): void {
		this.theme = next
		writeStored(THEME_KEY, next)
		applyTheme(next)
	}

	setHidden(next: boolean): void {
		this.hidden = next
		writeStored(HIDE_KEY, serializeHideAmounts(next))
	}
}

/** The one set of preferences on the page. */
export const preferences = new Preferences()
