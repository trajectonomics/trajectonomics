import { twinPath } from "../../lib/agent/twin-path"
import { AGENT_LINE_LOAD } from "../../lib/agent-line"
import { AGENT_START_HEADING, AGENT_START_LEAD, agentPrompt } from "../../lib/agent-start"
import { PORTAL_PURPOSE } from "../../lib/portal"
import { SITE_ORIGIN } from "../../lib/site"
import { DOCS_BASE_PATH, DOCS_INDEX_PATH } from "../../lib/tabs"
import { CopyPromptButton } from "./copy"

/** The Landing Page's own Markdown twin, which an Agent reads in place of this page. */
const LANDING_TWIN_PATH = twinPath(DOCS_BASE_PATH)

/** The prompt the page shows and copies, with the Portal's absolute URLs. */
const PROMPT = agentPrompt(SITE_ORIGIN)

/** The hero's left column: the release line, the headline, the purpose and the Agent's two files. */
export function Hero({ releaseLine }: { readonly releaseLine?: string | undefined }) {
	return (
		<div className="flex flex-col gap-6">
			{releaseLine === undefined ? null : (
				<p className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs text-fd-muted-foreground">
					<span aria-hidden="true" className="size-1.5 rounded-full bg-fd-primary" />
					<span>{releaseLine}</span>
				</p>
			)}
			<h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl">
				Your Agent asks.
				<br />
				<span className="text-fd-muted-foreground">traj computes.</span>
			</h1>
			<p className="max-w-xl text-lg text-fd-muted-foreground">
				{PORTAL_PURPOSE} <code className="font-mono text-fd-foreground">traj</code> never calls a
				model, so every number your Agent gives you is one the tool returned.
			</p>
			<p className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fd-muted-foreground">
				<span>Agents start at</span>
				<a
					href={DOCS_INDEX_PATH}
					{...AGENT_LINE_LOAD}
					className="font-mono text-fd-muted-foreground underline decoration-fd-border underline-offset-4 transition-colors hover:text-fd-foreground"
				>
					llms.txt
				</a>
				<a
					href={LANDING_TWIN_PATH}
					{...AGENT_LINE_LOAD}
					className="font-mono text-fd-muted-foreground underline decoration-fd-border underline-offset-4 transition-colors hover:text-fd-foreground"
				>
					index.md
				</a>
			</p>
		</div>
	)
}

/** The prompt a reader hands their Agent, as a panel with its own copy control. */
export function AgentPrompt() {
	return (
		<section
			aria-labelledby="agent-start-heading"
			className="flex flex-col overflow-hidden rounded-md border bg-fd-card"
		>
			<div className="flex flex-col gap-2 border-b p-5">
				<div className="flex items-center justify-between gap-4">
					<h2 id="agent-start-heading" className="text-base font-semibold">
						{AGENT_START_HEADING}
					</h2>
					<CopyPromptButton prompt={PROMPT} />
				</div>
				<p className="text-sm text-fd-muted-foreground">{AGENT_START_LEAD}</p>
			</div>
			<pre
				data-agent-prompt=""
				className="overflow-x-auto whitespace-pre-wrap break-words p-5 font-mono text-sm leading-relaxed text-fd-card-foreground"
			>
				{PROMPT}
			</pre>
		</section>
	)
}
