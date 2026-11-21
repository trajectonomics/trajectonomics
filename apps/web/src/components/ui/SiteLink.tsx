import type { AnchorHTMLAttributes, ReactNode } from "react"
import { useSearch } from "../../client/location"
import { withSearch } from "../../lib/view/links"

export interface SiteLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
	/** A path on the Dashboard, such as "/net-worth/". The query string of the page is added to it. */
	readonly href: string
	readonly children: ReactNode
}

/** An internal link that keeps the page's query string, so `?demo=1` follows the reader. */
export function SiteLink({ href, children, ...rest }: SiteLinkProps) {
	const search = useSearch()
	return (
		<a href={withSearch(href, search)} {...rest}>
			{children}
		</a>
	)
}
