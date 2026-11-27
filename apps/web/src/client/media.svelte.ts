import { observeMedium } from "./media"

/** Whether the viewport is at least Tailwind's `md` breakpoint, kept current as it changes. */
class Screen {
	medium = $state(false)

	constructor() {
		if (typeof window === "undefined") return
		observeMedium((matches) => (this.medium = matches))
	}
}

/** The one screen size the page follows, for a figure that is drawn larger from `md` up. */
export const screen = new Screen()
