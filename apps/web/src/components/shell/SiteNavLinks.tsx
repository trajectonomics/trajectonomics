import { ROUTES } from "../../lib/view/routes"
import { cx } from "../ui/cx"
import { SiteLink } from "../ui/SiteLink"

export interface SiteNavLinksProps {
	/** The path of the page being rendered, such as "/net-worth/". It is marked as the current page. */
	readonly current: string
}

/** The eight pages in navigation order. On a narrow screen the row wraps, so no page is out of sight. */
export function SiteNavLinks({ current }: SiteNavLinksProps) {
	return (
		<nav aria-label="Pages">
			<ul className="flex flex-wrap gap-1 py-1">
				{ROUTES.map((route) => {
					const isCurrent = route.path === current
					return (
						<li key={route.path}>
							<SiteLink
								href={route.path}
								aria-current={isCurrent ? "page" : undefined}
								className={cx(
									"block whitespace-nowrap rounded-md px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring",
									isCurrent
										? "bg-secondary font-medium text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{route.label}
							</SiteLink>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}
