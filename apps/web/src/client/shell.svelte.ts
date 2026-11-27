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
	/** Whether a link in the menu was followed: the menu button then takes focus after the new page shows. */
	menuFocusPending = false

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

	/** A link in the menu is followed, so the drawer shuts. */
	closeMenu(): void {
		this.menu = false
	}

	/** A link in the menu is followed: the drawer shuts, and the menu button takes focus after the new page shows. */
	navigateFromMenu(): void {
		this.menuFocusPending = true
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
