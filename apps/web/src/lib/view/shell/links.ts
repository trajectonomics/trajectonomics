import { type IconName, NAV_GROUPS, routesShown } from "../routes"

/** One link of the side navigation: its page, its label and icon, whether it is the page shown, and following it. */
export interface NavLink {
	readonly path: string
	readonly label: string
	readonly icon: IconName
	readonly current: boolean
	/** Runs when the link is followed: the menu drawer shuts as the page changes. */
	readonly follow: () => unknown
}

/** A run of links under one heading. A heading of null is a run of links that belong to no group. */
export interface NavLinkGroup {
	readonly heading: string | null
	readonly links: readonly NavLink[]
}

/**
 * The side navigation's links in their groups: the link of the page being rendered is current, a page
 * that needs a document or a table is left out without it, and `onNavigate` runs when a link is followed.
 */
export function navLinks(
	current: string,
	onNavigate: () => unknown,
	planDocument: boolean,
	milestones = true,
	cashflow = true,
	levy = true,
): readonly NavLinkGroup[] {
	return NAV_GROUPS.map((group) => ({
		heading: group.heading,
		links: routesShown(group, planDocument, milestones, cashflow, levy).map((route) => ({
			path: route.path,
			label: route.label,
			icon: route.icon,
			current: route.path === current,
			follow: onNavigate,
		})),
	}))
}
