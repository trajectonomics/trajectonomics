import {
	COMMANDS_KEY,
	HIDE_AMOUNTS_ENABLED,
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
 * The Theme, the Hide amounts state the masking components read, and the traj commands switch. Hide amounts is
 * off (#927): the state stays false and a value stored earlier is ignored, so nobody is left with masked amounts
 * and no way back. Every component reads the one instance, so a change shows at once. A refused write keeps the
 * choice for this page only.
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

	/** Reads every setting again: from storage, and from the system when no Theme is stored. Hide amounts only while its switch is on. */
	sync(): void {
		this.theme = resolveTheme(readStored(THEME_KEY), prefersDark())
		this.hidden = HIDE_AMOUNTS_ENABLED && parseHideAmounts(readStored(HIDE_KEY))
		this.showCommands = parseShowCommands(readStored(COMMANDS_KEY))
		applyTheme(this.theme)
	}

	setTheme(next: Theme): void {
		this.theme = next
		writeStored(THEME_KEY, next)
		applyTheme(next)
	}

	/** Turns Hide amounts on or off while its switch is on; it writes nothing while the feature is off (#927). */
	setHidden(next: boolean): void {
		if (!HIDE_AMOUNTS_ENABLED) return
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
