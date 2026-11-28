import {
	COMMANDS_KEY,
	HIDE_KEY,
	parseHideAmounts,
	parseShowCommands,
	resolveTheme,
	serializeHideAmounts,
	serializeShowCommands,
	THEME_KEY,
	type Theme,
} from "../lib/view/preferences"
import { applyTheme, prefersDark, readStored, subscribeExternal, writeStored } from "./browser"

/**
 * The Theme, the hide-amounts switch and the traj commands switch. Every component reads the one
 * instance, so a change shows at once. A refused write keeps the choice for this page only.
 */
class Preferences {
	theme = $state<Theme>("light")
	hidden = $state(false)
	showCommands = $state(false)

	constructor() {
		if (typeof window === "undefined") return
		this.sync()
		subscribeExternal(() => this.sync())
	}

	/** Reads every setting again: from storage, and from the system when no Theme is stored. */
	sync(): void {
		this.theme = resolveTheme(readStored(THEME_KEY), prefersDark())
		this.hidden = parseHideAmounts(readStored(HIDE_KEY))
		this.showCommands = parseShowCommands(readStored(COMMANDS_KEY))
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

	setShowCommands(next: boolean): void {
		this.showCommands = next
		writeStored(COMMANDS_KEY, serializeShowCommands(next))
	}
}

/** The one set of preferences on the page. */
export const preferences = new Preferences()
