import { subscribeEscape } from "./browser"
import { subscribeWide } from "./media"

/**
 * The two shell panels: the page menu on a narrow screen, and the Display options drawer. Each is open
 * or shut, Escape shuts both, and widening to `lg` shuts the menu. Every shell component reads the one
 * instance.
 */
export class ShellPanels {
	menu = $state(false)
	options = $state(false)

	constructor() {
		if (typeof window === "undefined") return
		subscribeEscape(() => this.closeAll())
		subscribeWide(() => this.closeMenu())
	}

	openMenu(): void {
		this.menu = true
	}

	openOptions(): void {
		this.options = true
	}

	/** A link in the menu is followed, so the drawer it sits in shuts. */
	closeMenu(): void {
		this.menu = false
	}

	/** The Display options drawer is shut by its close button, its backdrop, or its own close. */
	closeOptions(): void {
		this.options = false
	}

	closeAll(): void {
		this.closeMenu()
		this.closeOptions()
	}
}

/** The one set of shell panels on the page. */
export const shellPanels = new ShellPanels()
