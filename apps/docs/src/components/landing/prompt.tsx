import { Fragment } from "react"
import { AGENT_START_HEADING, AGENT_START_LEAD, agentPrompt } from "../../lib/agent-start"
import { SITE_ORIGIN } from "../../lib/site"
import { Mascot } from "../mascot"
import { CopyPromptButton } from "./copy"
import { fade, rise } from "./motion"

/** The prompt the page shows and copies, with the Portal's absolute URLs. */
const PROMPT = agentPrompt(SITE_ORIGIN)

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
			{/* The Mascot peeks over the panel's top hairline, its hands on the accent line, the way the
			    Site's robot rests on its demo window ([site ADR 0026], docs ADR 0018). It sits above the
			    heading and button, so it never covers a word or a control. */}
			<Mascot
				pose="peek"
				eager
				className="absolute right-4 bottom-[calc(100%-6px)] z-10 w-14 sm:w-16 lg:w-24"
			/>
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
