import { Fragment } from "react"

/**
 * The audience entries' pictures: each is decoration for the eye only (aria-hidden), because the
 * card's link and description already carry the meaning to a screen reader.
 */

/** The label above a picture's content. */
function PictureLabel({ children }: { readonly children: string }) {
	return (
		<p className="font-mono text-xs uppercase tracking-widest text-fd-muted-foreground">
			{children}
		</p>
	)
}

/** The Operator entry's picture: a balance command and its answer. */
export function TerminalPicture() {
	return (
		<div
			aria-hidden="true"
			className="rounded-md border bg-fd-secondary p-3 font-mono text-xs text-fd-muted-foreground"
		>
			<p>$ traj balance</p>
			<p className="mt-1 text-fd-foreground">879.50 THB</p>
		</div>
	)
}

/** The three steps a contributor takes, each with a small glyph. */
const CONTRIBUTION_STEPS = [
	{ label: "Report", path: "M5 21V4m0 0h11l-2 4 2 4H5" },
	{ label: "Change", path: "M4 20h4L20 8l-4-4L4 16Z" },
	{ label: "Check", path: "M4 12l5 5L20 6" },
] as const

/** The Contributor entry's picture: Report, Change, Check. */
export function ContributionPicture() {
	return (
		<div
			aria-hidden="true"
			className="flex items-center gap-2 rounded-md border bg-fd-secondary p-3 text-xs text-fd-secondary-foreground"
		>
			{CONTRIBUTION_STEPS.map((step, at) => (
				<Fragment key={step.label}>
					<span className="flex items-center gap-1.5">
						<svg
							aria-hidden="true"
							focusable="false"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="size-3.5 shrink-0"
						>
							<path d={step.path} />
						</svg>
						{step.label}
					</span>
					{at < CONTRIBUTION_STEPS.length - 1 ? (
						<span className="text-fd-muted-foreground">→</span>
					) : null}
				</Fragment>
			))}
		</div>
	)
}

/** The Agent routes' source: one docs page, read as Markdown. */
export function DocsPagePicture() {
	return (
		<div className="agent-source flex flex-col gap-1 rounded-md border bg-fd-card p-5">
			<PictureLabel>Source</PictureLabel>
			<p className="text-base font-semibold">Any docs page</p>
			<p className="text-xs text-fd-muted-foreground">as Markdown</p>
		</div>
	)
}
