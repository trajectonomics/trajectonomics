import { readStored, writeStored } from "./browser"

/** The key a group's open state is kept under: `traj.nav.<heading>`. */
export function navGroupKey(heading: string): string {
	return `traj.nav.${heading}`
}

/** The stored choice for one group, or null when nothing was stored. */
function parseStored(stored: string | null): boolean | null {
	if (stored === "1") return true
	if (stored === "0") return false
	return null
}

/**
 * The open or closed state of each collapsible navigation group. A group starts at its own default until
 * the person toggles it, and the choice is kept across visits. A refused write keeps it for this page only.
 */
export class NavGroups {
	private choices = $state<Record<string, boolean>>({})
	private readonly read: (key: string) => string | null
	private readonly write: (key: string, value: string) => void

	constructor(read = readStored, write = writeStored) {
		this.read = read
		this.write = write
	}

	/** Whether the group is open: the person's choice, else the group's default. */
	isOpen(heading: string, defaultOpen = true): boolean {
		return this.choices[heading] ?? parseStored(this.read(navGroupKey(heading))) ?? defaultOpen
	}

	/** Turns a group over, and keeps the new state. A group that holds the current page stays open, so its heading does nothing. */
	toggle(heading: string, defaultOpen = true, holdsCurrent = false): void {
		if (holdsCurrent) return
		this.keep(heading, !this.isOpen(heading, defaultOpen))
	}

	private keep(heading: string, open: boolean): void {
		this.choices = { ...this.choices, [heading]: open }
		this.write(navGroupKey(heading), open ? "1" : "0")
	}
}

/** The one set of open groups on the page. */
export const navGroups = new NavGroups()
