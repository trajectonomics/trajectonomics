import type { ProjectionRun } from "../../lib/contract"
import { addLevyCommand, carryInRows, taxBody, taxStatusWords } from "../../lib/view/tax"
import { Badge } from "../ui/Badge"
import { EmptyState } from "../ui/EmptyState"
import { CarryInTable } from "./CarryInTable"
import { TaxChart } from "./TaxChart"
import { TaxHeadline } from "./TaxHeadline"
import { TaxTable } from "./TaxTable"

export interface TaxBodyViewProps {
	readonly name: string
	readonly run: ProjectionRun
}

/** One Scenario's projection as the Tax page shows it: its Levy's years, or the empty state. */
export function TaxBodyView({ name, run }: TaxBodyViewProps) {
	const body = taxBody(run)
	const carry = carryInRows(run.carryIn ?? [])
	return (
		<div className="space-y-8">
			<div className="flex flex-wrap items-center gap-2">
				<Badge>{taxStatusWords(run.tax)}</Badge>
			</div>
			{body.kind === "no-levy" ? (
				<EmptyState title="No Levy in this Scenario">
					<p>Its figures are before tax, because the Scenario has no Levy. Add Thailand's with:</p>
					<pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
						<code>{addLevyCommand(name)}</code>
					</pre>
				</EmptyState>
			) : (
				<>
					<TaxHeadline headline={body.headline} currency={run.currency} />
					<TaxTable rows={body.rows} currency={run.currency} />
					{body.chart && <TaxChart series={body.chart} />}
				</>
			)}
			{carry.length > 0 && <CarryInTable rows={carry} currency={run.currency} />}
			{run.notes.length > 0 && (
				<ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
					{run.notes.map((note) => (
						<li key={note}>{note}</li>
					))}
				</ul>
			)}
		</div>
	)
}
