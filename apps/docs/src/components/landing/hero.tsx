import { Fragment } from "react"
import { twinPath } from "../../lib/agent/twin-path"
import { AGENT_LINE_LOAD } from "../../lib/agent-line"
import { AGENT_START_HEADING, AGENT_START_LEAD, agentPrompt } from "../../lib/agent-start"
import { PORTAL_PURPOSE } from "../../lib/portal"
import { SITE_ORIGIN } from "../../lib/site"
import { DOCS_BASE_PATH, DOCS_INDEX_PATH } from "../../lib/tabs"
import { CopyPromptButton } from "./copy"
import { fade, rise } from "./motion"

/** The Landing Page's own Markdown twin, which an Agent reads in place of this page. */
const LANDING_TWIN_PATH = twinPath(DOCS_BASE_PATH)

/** The prompt the page shows and copies, with the Portal's absolute URLs. */
const PROMPT = agentPrompt(SITE_ORIGIN)

/** The classes of the two links an Agent starts at: mono, underlined in the hairline, orange on hover. */
const AGENT_FILE_LINK =
	"font-mono text-fd-foreground underline decoration-fd-accent underline-offset-4 transition-colors hover:text-fd-accent"

/** The release line as a pill, its dot the brand's orange with a ring that pings outward. */
function ReleasePill({ releaseLine }: { readonly releaseLine: string }) {
	return (
		<p
			{...rise(0)}
			className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs text-fd-muted-foreground"
		>
			<span aria-hidden="true" className="relative flex size-2">
				<span className="absolute inline-flex size-full rounded-full bg-fd-accent opacity-75 motion-safe:animate-ping" />
				<span className="relative inline-flex size-2 rounded-full bg-fd-accent" />
			</span>
			<span>{releaseLine}</span>
		</p>
	)
}

/** The hero's left column: the release line, the headline, the purpose and the Agent's two files. */
export function Hero({ releaseLine }: { readonly releaseLine?: string | undefined }) {
	return (
		<div className="flex flex-col gap-6">
			{releaseLine === undefined ? null : <ReleasePill releaseLine={releaseLine} />}
			<h1
				{...rise(1)}
				className="text-4xl font-semibold leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl"
			>
				Your Agent asks.
				<br />
				<span className="text-fd-accent">traj computes.</span>
			</h1>
			<p {...rise(2)} className="max-w-xl text-lg text-fd-muted-foreground">
				{PORTAL_PURPOSE} <code className="font-mono text-fd-foreground">traj</code> never calls a
				model, so every number your Agent gives you is one the tool returned.
			</p>
			<p
				{...rise(3)}
				className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fd-muted-foreground"
			>
				<span>Agents start at</span>
				<a href={DOCS_INDEX_PATH} {...AGENT_LINE_LOAD} className={AGENT_FILE_LINK}>
					llms.txt
				</a>
				<a href={LANDING_TWIN_PATH} {...AGENT_LINE_LOAD} className={AGENT_FILE_LINK}>
					index.md
				</a>
			</p>
		</div>
	)
}

/** The prompt, one line at a time: each fades in after the one above it, and a caret ends it. */
function PromptText() {
	return (
		<pre
			data-agent-prompt=""
			className="overflow-x-auto whitespace-pre-wrap break-words p-5 font-mono text-sm leading-relaxed text-fd-card-foreground"
		>
			{PROMPT.split("\n").map((line, at) => (
				// The prompt is fixed text, so a line's place is its identity.
				<Fragment key={at}>
					{at === 0 ? null : "\n"}
					<span {...fade(at)}>{line}</span>
				</Fragment>
			))}
			<span
				aria-hidden="true"
				data-landing-caret=""
				className="ml-1 inline-block h-4 w-2 translate-y-0.5 bg-fd-accent"
			/>
		</pre>
	)
}

/** The prompt a reader hands their Agent, as a panel with its own copy control and a drifting glow. */
export function AgentPrompt() {
	return (
		<div {...rise(2)} className="relative isolate min-w-0">
			<div
				aria-hidden="true"
				data-landing-glow=""
				className="pointer-events-none absolute inset-x-0 -inset-y-8 -z-10 rounded-full bg-fd-accent/15 blur-3xl"
			/>
			<section
				aria-labelledby="agent-start-heading"
				className="flex flex-col overflow-hidden rounded-md border bg-fd-card"
			>
				<div aria-hidden="true" className="h-px w-full bg-fd-accent" />
				<div className="flex flex-col gap-2 border-b p-5">
					<div className="flex items-center justify-between gap-4">
						<h2 id="agent-start-heading" className="text-base font-semibold">
							{AGENT_START_HEADING}
						</h2>
						<CopyPromptButton prompt={PROMPT} />
					</div>
					<p className="text-sm text-fd-muted-foreground">{AGENT_START_LEAD}</p>
				</div>
				<PromptText />
			</section>
		</div>
	)
}
