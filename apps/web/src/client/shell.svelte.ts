import { subscribeEscape } from "./browser"
import { subscribeWide } from "./media"

/**
 * The shell's page menu on a narrow screen: open or shut, Escape shuts it, and widening to `lg` shuts it. Every
 * shell component reads the one instance.
 */
export class ShellPanels {
	menu = $state(false)
	/** Whether a link in the menu was followed: the menu button then takes focus after the new page shows. */
	menuFocusPending = false

	constructor() {
		if (typeof window === "undefined") return
		subscribeEscape(() => this.closeMenu())
		subscribeWide(() => this.closeMenu())
	}

	openMenu(): void {
		this.menu = true
	}

	/** A link in the menu is followed, so the drawer shuts. */
	closeMenu(): void {
		this.menu = false
	}

	/** A link in the menu is followed: the drawer shuts, and the menu button takes focus after the new page shows. */
	navigateFromMenu(): void {
		this.menuFocusPending = true
		this.menu = false
	}
}

/** The one set of shell panels on the page. */
export const shellPanels = new ShellPanels()
