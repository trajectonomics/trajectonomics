import { AGENT_ROUTES_HEADING, type AgentRoute, agentRoutes } from "../../lib/agent-start"
import { SITE_ORIGIN } from "../../lib/site"
import { TABS, tabUrl } from "../../lib/tabs"
import { CopiedStatus, CopyGlyph, useCopy } from "./copy"

/** The ways an Agent reads the Portal, with the Portal's absolute URLs. */
const ROUTES = agentRoutes(SITE_ORIGIN)

/** A section's numbered label and heading, in the Site's quiet register. */
function SectionHeading({
	id,
	number,
	label,
	children,
}: {
	readonly id: string
	readonly number: string
	readonly label: string
	readonly children: string
}) {
	return (
		<div className="flex flex-col gap-2">
			<p className="font-mono text-xs uppercase tracking-widest text-fd-muted-foreground">
				{number} · {label}
			</p>
			<h2 id={id} className="text-2xl font-semibold tracking-tight sm:text-3xl">
				{children}
			</h2>
		</div>
	)
}

/** One entry per Tab: its `entry` is the card's one link, stretched over the card. */
export function AudienceEntries() {
	return (
		<section aria-labelledby="audiences-heading" className="flex flex-col gap-6">
			<SectionHeading id="audiences-heading" number="01" label="Read it yourself">
				Pick your path
			</SectionHeading>
			<div className="grid gap-4 md:grid-cols-2">
				{TABS.map((tab) => {
					const descriptionId = `${tab.folder}-entry-description`
					return (
						<div
							key={tab.folder}
							className="group relative flex flex-col gap-3 rounded-md border bg-fd-card p-6 text-fd-card-foreground transition-colors hover:bg-fd-accent focus-within:ring-2 focus-within:ring-fd-ring"
						>
							<p className="font-mono text-xs uppercase tracking-widest text-fd-muted-foreground">
								{tab.audience}
							</p>
							<a
								href={tabUrl(tab)}
								aria-describedby={descriptionId}
								className="text-lg font-medium outline-none after:absolute after:inset-0 after:rounded-md group-hover:text-fd-accent-foreground"
							>
								{tab.entry}
							</a>
							<p id={descriptionId} className="text-sm text-fd-muted-foreground">
								{tab.description}
							</p>
							<span
								aria-hidden="true"
								className="mt-auto pt-2 text-sm text-fd-muted-foreground transition-transform group-hover:translate-x-1"
							>
								{tab.title} →
							</span>
						</div>
					)
				})}
			</div>
		</section>
	)
}

/** One route an Agent reads by: what it is, and its line with a copy control. */
function RouteCard({ route }: { readonly route: AgentRoute }) {
	const [copied, copy] = useCopy(route.snippet)
	return (
		<li className="flex flex-col gap-3 rounded-md border p-5">
			<h3 className="text-base font-semibold">{route.title}</h3>
			<p className="text-sm text-fd-muted-foreground">{route.description}</p>
			<div className="mt-auto flex items-start gap-2 rounded-sm border bg-fd-secondary p-2">
				<code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-fd-secondary-foreground">
					{route.snippet}
				</code>
				<button
					type="button"
					onClick={copy}
					aria-label={`Copy ${route.title}`}
					className="rounded-sm p-1 text-fd-muted-foreground transition-colors hover:text-fd-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
				>
					<CopyGlyph copied={copied} />
				</button>
				<CopiedStatus copied={copied} what={route.title} />
			</div>
		</li>
	)
}

/** The three ways an Agent reads the Docs Portal on its own. */
export function AgentRoutes() {
	return (
		<section aria-labelledby="agent-routes-heading" className="flex flex-col gap-6">
			<SectionHeading id="agent-routes-heading" number="02" label="For Agents">
				{AGENT_ROUTES_HEADING}
			</SectionHeading>
			<ul className="grid gap-4 md:grid-cols-3">
				{ROUTES.map((route) => (
					<RouteCard key={route.title} route={route} />
				))}
			</ul>
		</section>
	)
}
