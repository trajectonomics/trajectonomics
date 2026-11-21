import type { Fi, Read } from "../../lib/contract"
import { EmptyState } from "../ui/EmptyState"
import { ReadView } from "../ui/ReadView"
import { FiResult } from "./FiResult"

export interface FiSectionsProps {
	/** The FI Reads of the Snapshot, by Scenario name. */
	readonly fi: Readonly<Record<string, Read<Fi>>>
}

/** One section per Scenario, each with its own FI answer. */
export function FiSections({ fi }: FiSectionsProps) {
	const entries = Object.entries(fi)
	if (entries.length === 0) return <EmptyState title="No Scenario to read" />
	return (
		<div className="space-y-12">
			{entries.map(([name, read], index) => (
				<section key={name} aria-labelledby={`fi-scenario-${index}`} className="space-y-6">
					<h2 id={`fi-scenario-${index}`} className="text-xl font-semibold tracking-tight">
						{name}
					</h2>
					<ReadView
						read={read}
						label={`FI date of ${name}`}
						render={(answer) => <FiResult fi={answer} argv={read.argv} />}
					/>
				</section>
			))}
		</div>
	)
}
