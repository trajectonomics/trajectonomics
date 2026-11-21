import type { CompareSideHeading } from "../../lib/view/compare"
import { cx } from "../ui/cx"

export interface CompareSidesProps {
	readonly sides: readonly CompareSideHeading[]
}

/** Each side's letter, Scenario and shortened content hash, with a sample of its line style. */
export function CompareSides({ sides }: CompareSidesProps) {
	return (
		<section aria-label="The two Scenarios" className="grid gap-3 sm:grid-cols-2">
			{sides.map((side) => (
				<div key={side.letter} className="rounded-lg border border-border bg-card p-4">
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<span
							aria-hidden="true"
							className={cx(
								"inline-block w-8 border-t-2",
								side.dashed ? "border-dashed border-accent" : "border-solid border-foreground",
							)}
						/>
						<span>
							{side.letter}, {side.dashed ? "dashed" : "solid"}
						</span>
					</p>
					<p className="mt-2 text-base font-semibold break-all">{side.name}</p>
					<p className="mt-1 font-mono text-xs text-muted-foreground">Content hash {side.hash}</p>
				</div>
			))}
		</section>
	)
}
