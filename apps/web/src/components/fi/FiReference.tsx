import { useId } from "react"
import type { ReferenceView } from "../../lib/view/fi/reference"
import { Fact } from "../projection/Fact"
import { Money } from "../ui/Money"

export interface FiReferenceProps {
	readonly reference: ReferenceView
	readonly currency: string
}

/** The rule-of-thumb reference: labelled as a reference, with the figures the CLI states for it. */
export function FiReference({ reference, currency }: FiReferenceProps) {
	const headingId = useId()
	return (
		<section
			aria-labelledby={headingId}
			className="space-y-4 rounded-lg border border-dashed border-border p-4 sm:p-5"
		>
			<h2 id={headingId} className="text-base font-semibold">
				Rule-of-thumb reference, not the answer
			</h2>
			<p className="text-sm text-muted-foreground">
				The survival date above decides financial independence. The rule of thumb is shown for
				comparison only, and it never moves that date.
			</p>
			<dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<Fact label="Multiplier" value={reference.multiplier} />
				<Fact label="Measured at" value={reference.date} />
				<Fact label="Basis" value={reference.basis} />
				<Fact label="Window" value={reference.window} />
				<Fact label="Terms" value={reference.terms} />
				<Fact label="Met" value={reference.met} />
				<Fact label="Window length" value={reference.partial} />
				{reference.multiple && <Fact label="Multiple" value={reference.multiple} />}
				{reference.amounts.map((amount) => (
					<Fact
						key={amount.label}
						label={amount.label}
						value={<Money amount={amount.amount} currency={currency} />}
					/>
				))}
			</dl>
		</section>
	)
}
