import { subscribeEscape } from "./browser"

/**
 * The two shell panels: the page menu on a narrow screen, and the Display options drawer. Each is open
 * or shut, and Escape shuts both. Every shell component reads the one instance.
 */
class ShellPanels {
	menu = $state(false)
	options = $state(false)

	constructor() {
		if (typeof window === "undefined") return
		subscribeEscape(() => this.closeAll())
	}

	closeAll(): void {
		this.menu = false
		this.options = false
	}
}

/** The one set of shell panels on the page. */
export const shellPanels = new ShellPanels()
