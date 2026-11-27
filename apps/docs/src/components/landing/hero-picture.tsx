import type { ReactNode } from "react"

/**
 * The hero's picture: one question through the Agent to traj, with the Quickstart's own figure.
 * Every node is real text in HTML, so a screen reader reads the same flow a sighted reader sees.
 */

/** One node card of the flow, with the arrow that leads to the next node; `grow` widens a node. */
function HeroStep({
	children,
	arrow,
	grow = "sm:flex-1",
}: {
	readonly children: ReactNode
	readonly arrow: boolean
	readonly grow?: string
}) {
	return (
		<li className={`flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-6 ${grow}`}>
			<div className="flex min-w-0 flex-1 flex-col justify-center gap-2 rounded-md border bg-fd-card p-4">
				{children}
			</div>
			{arrow ? (
				<span
					aria-hidden="true"
					className="self-center rotate-90 text-fd-muted-foreground sm:rotate-0"
				>
					→
				</span>
			) : null}
		</li>
	)
}

/** The label above a node's content. */
function NodeLabel({ children }: { readonly children: string }) {
	return (
		<p className="font-mono text-xs uppercase tracking-widest text-fd-muted-foreground">
			{children}
		</p>
	)
}

export function DivisionOfLabour() {
	return (
		<ol
			aria-label="How a question gets its answer"
			className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0"
		>
			<HeroStep arrow>
				<NodeLabel>You</NodeLabel>
				<p className="rounded-md border bg-fd-secondary px-3 py-2 text-sm">
					What&apos;s my net worth?
				</p>
			</HeroStep>
			<HeroStep arrow grow="sm:flex-[1.4]">
				<NodeLabel>Your Agent</NodeLabel>
				{/* Breaks only between the command and its flag, never inside the date. */}
				<code className="rounded-sm bg-fd-secondary px-2 py-1 font-mono text-xs">
					<span className="whitespace-nowrap">traj balance</span>{" "}
					<span className="whitespace-nowrap">--as-of 2026-03-31</span>
				</code>
			</HeroStep>
			<HeroStep arrow={false} grow="sm:flex-[1.2]">
				<NodeLabel>traj</NodeLabel>
				<p className="whitespace-nowrap font-mono text-xl font-semibold">879.50 THB</p>
			</HeroStep>
		</ol>
	)
}
