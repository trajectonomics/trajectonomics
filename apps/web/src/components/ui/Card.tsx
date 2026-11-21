import type { ReactNode } from "react"
import { Provenance } from "./Provenance"
import { SiteLink } from "./SiteLink"

export interface CardProps {
	readonly title: string
	/** The page this card summarises. The card links to it with the query string kept. */
	readonly href?: string
	/** The argv of the Read the card's figures come from. Shown in the footer. */
	readonly argv?: readonly string[]
	readonly children: ReactNode
}

/** A summary panel: a title, its body, an optional link to its page and its command. */
export function Card({ title, href, argv, children }: CardProps) {
	return (
		<section className="flex flex-col rounded-lg border border-border bg-card p-4 sm:p-5">
			<header className="flex items-baseline justify-between gap-3">
				<h2 className="text-base font-semibold">{title}</h2>
				{href && (
					<SiteLink
						href={href}
						aria-label={`Open ${title}`}
						className="text-sm text-accent underline-offset-4 hover:underline"
					>
						Open
					</SiteLink>
				)}
			</header>
			<div className="mt-4 flex-1">{children}</div>
			{argv && (
				<footer className="mt-4 border-t border-border pt-3">
					<Provenance argv={argv} />
				</footer>
			)}
		</section>
	)
}
