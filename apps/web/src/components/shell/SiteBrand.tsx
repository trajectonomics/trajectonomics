import { SiteLink } from "../ui/SiteLink"

export interface SiteBrandProps {
	/** The brand mark's SVG, with its role and title removed: the link names itself. */
	readonly artwork: string
}

/** The brand mark, the product name and the name of this app: the link back to Overview. */
export function SiteBrand({ artwork }: SiteBrandProps) {
	return (
		<SiteLink
			href="/"
			className="flex items-center gap-3 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
		>
			<span
				aria-hidden="true"
				className="flex size-8 shrink-0 [&>svg]:size-8"
				dangerouslySetInnerHTML={{ __html: artwork }}
			/>
			<span className="font-semibold whitespace-nowrap">Trajectonomics</span>
			<span className="hidden truncate text-sm text-muted-foreground sm:inline">Dashboard</span>
		</SiteLink>
	)
}
