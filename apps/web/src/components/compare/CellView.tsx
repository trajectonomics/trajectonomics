import type { Cell } from "../../lib/view/compare"
import { Money } from "../ui/Money"

export interface CellViewProps {
	readonly cell: Cell
}

/** A figure cell: a money string or a word, with its note on a line under it. */
export function CellView({ cell }: CellViewProps) {
	const { value, note } = cell
	return (
		<span className="block">
			{value.kind === "money" ? <Money amount={value.amount} /> : <span>{value.text}</span>}
			{note && <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span>}
		</span>
	)
}
