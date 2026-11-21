import type { ReactNode } from "react"
import { usePathname } from "../../client/location"
import { useSnapshot } from "../../client/use-snapshot"
import type { Snapshot } from "../../lib/contract"
import { withSearch } from "../../lib/view/links"
import type { SnapshotState } from "../../lib/view/state"
import { EmptyState } from "./EmptyState"
import { SiteLink } from "./SiteLink"

/** The command that writes a Snapshot of the person's own ledger, run in apps/web. */
export const SNAPSHOT_COMMAND = "bun run dashboard -- --as-of YYYY-MM-DD --horizon YYYY-MM-DD"

export interface PageShellProps {
	/** The page's heading, such as "Net worth". */
	readonly title: string
	/** One sentence under the heading, on what the page shows. */
	readonly intro?: string
	/** Renders the page from the ready Snapshot. Runs only when the Snapshot is ready. */
	readonly render: (snapshot: Snapshot) => ReactNode
}

/** A page's frame: its heading, and the body for whichever state the Snapshot is in. */
export function PageShell(props: PageShellProps) {
	const state = useSnapshot()
	const pathname = usePathname()
	return <PageShellView {...props} state={state} pathname={pathname} />
}

export interface PageShellViewProps extends PageShellProps {
	readonly state: SnapshotState
	/** The page's own path, so "View the demo" stays on the page. */
	readonly pathname: string
}

/** The frame with the Snapshot state given, so each state can be rendered and tested on its own. */
export function PageShellView({ title, intro, render, state, pathname }: PageShellViewProps) {
	return (
		<section aria-labelledby="page-title" className="space-y-6">
			<header>
				<h1 id="page-title" className="text-2xl font-semibold tracking-tight">
					{title}
				</h1>
				{intro && <p className="mt-2 max-w-prose text-muted-foreground">{intro}</p>}
			</header>
			<PageBody state={state} pathname={pathname} render={render} />
		</section>
	)
}

interface PageBodyProps {
	readonly state: SnapshotState
	readonly pathname: string
	readonly render: (snapshot: Snapshot) => ReactNode
}

function PageBody({ state, pathname, render }: PageBodyProps) {
	switch (state.status) {
		case "loading":
			return (
				<p role="status" className="text-muted-foreground">
					Loading the Snapshot.
				</p>
			)
		case "missing":
			return <MissingSnapshot pathname={pathname} />
		case "invalid":
			return (
				<div role="alert" className="rounded-lg border border-destructive p-4 text-sm">
					<p className="font-medium">
						The Snapshot at {state.url} {state.reason}.
					</p>
					{state.details.length > 0 && (
						<ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
							{state.details.map((detail) => (
								<li key={detail}>{detail}</li>
							))}
						</ul>
					)}
					<p className="mt-2 text-muted-foreground">
						Write a new Snapshot with <code className="font-mono">{SNAPSHOT_COMMAND}</code>.
					</p>
				</div>
			)
		case "ready":
			return <>{render(state.snapshot)}</>
	}
}

function MissingSnapshot({ pathname }: { readonly pathname: string }) {
	return (
		<EmptyState title="No Snapshot yet">
			<p>
				Write one from your own ledger, in apps/web, with this command. The dates are the As-of and
				the horizon you want to see.
			</p>
			<pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
				<code>{SNAPSHOT_COMMAND}</code>
			</pre>
			<p className="mt-3">
				<SiteLink
					href={withSearch(pathname, "?demo=1")}
					className="text-accent underline-offset-4 hover:underline"
				>
					View the demo
				</SiteLink>
			</p>
		</EmptyState>
	)
}
