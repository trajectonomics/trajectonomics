import type { ProjectionCompare } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import { taxStatusWords } from "../../lib/view/tax"
import { Badge } from "../ui/Badge"

export interface CompareNotesProps {
	readonly data: ProjectionCompare
}

/** The tax status, the birth date the ages count from, and the sentences a person reads first. */
export function CompareNotes({ data }: CompareNotesProps) {
	return (
		<section aria-label="Assumptions" className="space-y-3 text-sm">
			<div className="flex flex-wrap items-center gap-2">
				<Badge>{taxStatusWords(data.tax)}</Badge>
				{data.birthDate && (
					<span className="text-muted-foreground">
						Ages count from {formatDate(data.birthDate)}
					</span>
				)}
			</div>
			{data.notes.length > 0 && (
				<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
					{data.notes.map((note) => (
						<li key={note}>{note}</li>
					))}
				</ul>
			)}
		</section>
	)
}
