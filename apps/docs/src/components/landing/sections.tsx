import { AGENT_ROUTES_HEADING, type AgentRoute, agentRoutes } from "../../lib/agent-start"
import { SITE_ORIGIN } from "../../lib/site"
import { TABS, tabUrl } from "../../lib/tabs"
import { CopiedStatus, CopyGlyph, useCopy } from "./copy"
import { ContributionPicture, DocsPagePicture, TerminalPicture } from "./entry-pictures"

/** The ways an Agent reads the Portal, with the Portal's absolute URLs. */
const ROUTES = agentRoutes(SITE_ORIGIN)

/** A section's quiet label: a real heading, small enough not to compete with the pictures. */
function SectionLabel({ id, children }: { readonly id: string; readonly children: string }) {
	return (
		<h2 id={id} className="font-mono text-xs uppercase tracking-widest text-fd-muted-foreground">
			{children}
		</h2>
	)
}

/** One entry per Tab: its picture, then its `entry` as the card's one link, stretched over it. */
export function AudienceEntries() {
	return (
		<section aria-labelledby="audiences-heading" className="flex flex-col gap-4">
			<SectionLabel id="audiences-heading">Read it yourself</SectionLabel>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
				{TABS.map((tab, at) => {
					const descriptionId = `${tab.folder}-entry-description`
					const primary = at === 0
					return (
						<div
							key={tab.folder}
							className={`group relative flex flex-col gap-3 rounded-md border bg-fd-card p-6 text-fd-card-foreground transition-[border-color,transform] duration-300 hover:border-fd-accent focus-within:ring-2 focus-within:ring-fd-ring motion-safe:hover:-translate-y-1 ${primary ? "border-fd-accent lg:col-span-3" : "lg:col-span-2"}`}
						>
							{primary ? <TerminalPicture /> : <ContributionPicture />}
							{primary ? (
								<p className="w-fit rounded-full bg-fd-accent px-3 py-1 font-mono text-xs font-medium tracking-wide text-fd-accent-foreground">
									{tab.label}
								</p>
							) : (
								<p className="font-mono text-xs uppercase tracking-widest text-fd-muted-foreground">
									{tab.label}
								</p>
							)}
							<a
								href={tabUrl(tab)}
								aria-describedby={descriptionId}
								className="text-lg font-medium outline-none after:absolute after:inset-0 after:rounded-md"
							>
								{tab.entry}
							</a>
							<p id={descriptionId} className="text-sm text-fd-muted-foreground">
								{tab.description}
							</p>
							<span
								aria-hidden="true"
								className="mt-auto pt-2 text-sm text-fd-muted-foreground transition-[color,transform] duration-300 group-hover:translate-x-1 group-hover:text-fd-accent"
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

/** One route an Agent reads by: its label, what it does, and its line with a copy control. */
function RouteCard({ route }: { readonly route: AgentRoute }) {
	const [state, copy] = useCopy(route.snippet)
	return (
		<li className="flex flex-col gap-2 rounded-md border bg-fd-card p-4 transition-colors duration-300 hover:border-fd-accent">
			<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<h3 className="text-sm font-semibold">{route.title}</h3>
				<p className="text-xs text-fd-muted-foreground">{route.description}</p>
			</div>
			<div className="mt-auto flex items-start gap-2 rounded-sm border bg-fd-secondary p-2">
				<code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-fd-secondary-foreground">
					{route.snippet}
				</code>
				<button
					type="button"
					onClick={copy}
					aria-label={`Copy ${route.title}`}
					className={`shrink-0 rounded-sm p-1 transition-colors hover:text-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring ${state === "copied" ? "text-fd-accent" : "text-fd-muted-foreground"}`}
				>
					<CopyGlyph state={state} />
				</button>
				<CopiedStatus state={state} what={route.title} />
			</div>
		</li>
	)
}

/** The three ways an Agent reads the Docs Portal, branching from any docs page. */
export function AgentRoutes() {
	return (
		<section aria-labelledby="agent-routes-heading" className="flex flex-col gap-4">
			<SectionLabel id="agent-routes-heading">{AGENT_ROUTES_HEADING}</SectionLabel>
			<div className="grid gap-4 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,2fr)] lg:items-center lg:gap-8">
				<DocsPagePicture />
				<ul className="agent-routes flex flex-col gap-3">
					{ROUTES.map((route) => (
						<RouteCard key={route.title} route={route} />
					))}
				</ul>
			</div>
		</section>
	)
}
