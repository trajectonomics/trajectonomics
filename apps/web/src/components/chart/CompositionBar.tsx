import { shares } from "../../lib/chart"
import { cx } from "../ui/cx"
import { Money } from "../ui/Money"

/** One part of a whole: its label, the CLI's amount string, and the number its width is drawn from. */
export interface CompositionSegment {
	readonly label: string
	readonly amount: string
	/** A non-negative number, placed as the segment's width. Never shown. */
	readonly value: number
}

export interface CompositionBarProps {
	/** What the bar divides, read out by a screen reader, such as "Assets by account". */
	readonly label: string
	readonly segments: readonly CompositionSegment[]
	readonly currency?: string | undefined
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	readonly hidden?: boolean | undefined
}

const SWATCHES = ["bg-primary", "bg-accent", "bg-muted-foreground", "bg-ring"] as const

function swatchOf(index: number): string {
	return SWATCHES[index % SWATCHES.length] ?? "bg-primary"
}

/** A bar split into segments with a 2 px gap, and a legend of each part's amount and share. */
export function CompositionBar({ label, segments, currency, hidden }: CompositionBarProps) {
	const parts = shares(segments.map((segment) => segment.value))
	const rows = segments.map((segment, index) => ({
		...segment,
		share: parts[index] ?? 0,
		swatch: swatchOf(index),
	}))
	return (
		<figure className="space-y-4">
			<div
				role="img"
				aria-label={label}
				className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm bg-muted"
			>
				{rows
					.filter((row) => row.share > 0)
					.map((row) => (
						<span
							key={row.label}
							style={{ flexGrow: row.share, flexBasis: 0 }}
							className={row.swatch}
						/>
					))}
			</div>
			<ul className="space-y-2 text-sm">
				{rows.map((row) => (
					<li key={row.label} className="flex items-center justify-between gap-3">
						<span className="flex min-w-0 items-center gap-2">
							<span aria-hidden="true" className={cx("size-3 shrink-0 rounded-sm", row.swatch)} />
							<span className="truncate">{row.label}</span>
						</span>
						<span className="flex shrink-0 items-baseline gap-3">
							<Money amount={row.amount} currency={currency} hidden={hidden} />
							<span className="w-12 text-right text-muted-foreground tabular-nums">
								{Math.round(row.share * 100)}%
							</span>
						</span>
					</li>
				))}
			</ul>
		</figure>
	)
}
