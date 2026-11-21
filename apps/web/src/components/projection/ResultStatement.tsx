import type { ReactNode } from "react"
import { type ProjectionShape, statementOf } from "../../lib/view/projection/statement"
import { Badge } from "../ui/Badge"
import { Provenance } from "../ui/Provenance"
import { Fact } from "./Fact"
import { HashText, NoteList, OverrideList } from "./StatementParts"

export interface ResultStatementProps {
	/** The echo fields a result states at its root: the As-of, engine, Scenario, Overrides and notes. */
	readonly shape: ProjectionShape
	/** The argv of the Read the result came from. */
	readonly argv: readonly string[]
	/** Extra facts a page states beside the echo, such as an FI definition. */
	readonly children?: ReactNode
}

/** What a result says about itself: its tax status, its echo, its Overrides and notes, and its command. */
export function ResultStatement({ shape, argv, children }: ResultStatementProps) {
	const statement = statementOf(shape)
	return (
		<section
			aria-labelledby="result-statement"
			className="space-y-4 rounded-lg border border-border p-4 sm:p-5"
		>
			<h2 id="result-statement" className="text-base font-semibold">
				What this result says about itself
			</h2>
			<div>
				<Badge>{statement.tax}</Badge>
			</div>
			<dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<Fact label="As of" value={statement.asOf} />
				<Fact label="Horizon" value={statement.horizon} />
				<Fact label="Engine" value={statement.engine} />
				<Fact label="Scenario" value={statement.scenario} />
				{statement.hashes.map((hash) => (
					<Fact key={hash.label} label={hash.label} value={<HashText hash={hash} />} />
				))}
				{children}
			</dl>
			<OverrideList overrides={statement.overrides} />
			<NoteList notes={statement.notes} />
			<Provenance argv={argv} />
		</section>
	)
}
