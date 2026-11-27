import { twinPath } from "../../lib/agent/twin-path"
import { AGENT_LINE_LOAD } from "../../lib/agent-line"
import { DOCS_BASE_PATH, DOCS_INDEX_PATH } from "../../lib/tabs"
import { DivisionOfLabour } from "./hero-picture"
import { rise } from "./motion"

/** The Landing Page's own Markdown twin, which an Agent reads in place of this page. */
const LANDING_TWIN_PATH = twinPath(DOCS_BASE_PATH)

/** The classes of the two files an Agent starts at: mono chips on the page ground. */
const AGENT_FILE_LINK =
	"rounded-sm border px-2 py-1 font-mono text-xs text-fd-muted-foreground transition-colors hover:border-fd-accent hover:text-fd-accent"

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

/** The hero's left column: the release line, the headline, the division of labour, the files. */
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
			<div {...rise(2)}>
				<DivisionOfLabour />
			</div>
			<p {...rise(3)} className="text-base text-fd-muted-foreground">
				<code className="font-mono text-fd-foreground">traj</code> never calls a model, so every
				number comes from the tool.
			</p>
			<p {...rise(4)} className="flex flex-wrap items-center gap-2 text-xs">
				<span className="text-xs text-fd-muted-foreground">Agents start at</span>
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
