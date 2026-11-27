import type { LayoutTab } from "fumadocs-ui/layouts/shared"
import {
	FullSearchTrigger,
	type FullSearchTriggerProps,
	SearchTrigger,
	type SearchTriggerProps,
} from "fumadocs-ui/layouts/shared/slots/search-trigger"
import type { FC, ReactNode } from "react"
import { isTabPath, TABS, tabUrl } from "../lib/tabs"

/**
 * The header's Tab treatment: the shared nav-link type every static site's centre uses
 * (`@trajectonomics/brand/header.css`), which underlines the current Tab through `aria-current`.
 */
const TAB_CLASS = "ds-nav-link text-nowrap"

/** One class list from the library's and this shell's parts, without empty entries. */
function classNames(...parts: readonly (string | undefined)[]): string {
	return parts.filter((part) => part !== undefined && part.length > 0).join(" ")
}

/**
 * The Tabs of one page, marking the current Tab for assistive technology: the Tab the page belongs
 * to, and none on a page outside both Tabs (the Landing Page, the 404 page).
 */
export function headerTabs(pathname: string): LayoutTab[] {
	return TABS.map((tab) => ({
		title: tab.title,
		url: tabUrl(tab),
		...(isTabPath(tab, pathname) ? { props: { "aria-current": "page" } } : {}),
	}))
}

/**
 * The Tabs as the one header row's links, built from the same Tab definitions the sidebar's
 * dropdown offers. The current Tab keeps `aria-current="page"` for assistive technology and the
 * built-page check (ADR 0009). Below `lg` the notebook layout's sidebar dropdown carries them
 * instead, and the Landing Page's body links both, so the row hides them.
 */
export function HeaderTabs({ tabs }: { readonly tabs: readonly LayoutTab[] }) {
	return (
		<div data-shell-tabs="" className="hidden items-center gap-6 lg:flex">
			{tabs.map((tab) => {
				const current = tab.props?.["aria-current"] === "page"
				return (
					<a
						key={tab.url}
						href={tab.url}
						data-shell-tab=""
						aria-current={current ? "page" : undefined}
						className={TAB_CLASS}
					>
						{tab.title}
					</a>
				)
			})}
		</div>
	)
}

/**
 * The icon-only search trigger: its own accessible name, so a phone keeps a named control. The
 * geometry stylesheet keeps it on the row from md to lg, where the library would hide it, and the
 * library hides its wrapper from md up, so it leaves the row at lg with no class of its own.
 */
function HeaderSearchIcon({ className, ...props }: SearchTriggerProps) {
	return <SearchTrigger {...props} className={classNames(className, "rounded-full")} />
}

/**
 * The full search trigger, in the header's right slot from `lg` up. Fumadocs' notebook row puts its
 * full trigger between the brand and the right group, so the shell lifts it to the end of the bar in
 * its geometry stylesheet, where the other static sites put their tools.
 */
function HeaderSearchField({ className, ...props }: FullSearchTriggerProps) {
	return (
		<FullSearchTrigger {...props} className={classNames(className, "max-lg:hidden rounded-full")} />
	)
}

/**
 * The search trigger on every page of the Portal: the full field from `lg` up, the icon below it.
 * The sidebar's top block no longer carries search (ADR 0009's 2026-11-27 amendment), so the same
 * control sits in the same place whatever layout the page uses.
 */
export const headerSearchTrigger: {
	readonly sm: FC<SearchTriggerProps>
	readonly full: FC<FullSearchTriggerProps>
} = {
	sm: HeaderSearchIcon,
	full: HeaderSearchField,
}

export interface DocsSidebarBannerProps {
	/**
	 * What Fumadocs draws in a sidebar header: the Tab dropdown at every width, and in the drawer the
	 * close button beside it. The block places them at its top rather than re-creating them.
	 */
	readonly children?: ReactNode
}

/**
 * The sidebar's top block: the header children Fumadocs passes a banner — its Tab dropdown, and in
 * the drawer its close button, drawn by the library rather than by this block. The tree follows the
 * block. Search left this block for the header's right slot (ADR 0009's 2026-11-27 amendment). The
 * way back to the Site Home is the header's glyph tile, not a sidebar control. The Agent's pointer
 * to the page's Markdown twin is not here: no reader meets it (ADR 0010).
 */
export function DocsSidebarBanner({ children }: DocsSidebarBannerProps) {
	return (
		<div data-sidebar-top-block="" className="flex flex-col">
			<div data-sidebar-tabs="" className="flex items-center gap-2 p-3 empty:hidden">
				{children}
			</div>
		</div>
	)
}
