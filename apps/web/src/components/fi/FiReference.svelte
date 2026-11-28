<script lang="ts">
import type { ReferenceView } from "../../lib/view/fi/reference"
import Fact from "../projection/Fact.svelte"
import Money from "../ui/Money.svelte"

interface Props {
	reference: ReferenceView
	currency: string
}

/** The rule-of-thumb reference: one quiet line, with every figure the CLI states for it behind Details. */
let { reference, currency }: Props = $props()
</script>

<div class="space-y-2">
	<p class="text-sm text-muted-foreground">Rule of thumb · {reference.multipleInWords}</p>
	<details class="text-sm">
		<summary class="cursor-pointer">Rule-of-thumb reference, not the answer</summary>
		<p class="mt-2 text-muted-foreground">
			The survival date above decides financial independence. The rule of thumb is shown for
			comparison only, and it never moves that date.
		</p>
		<dl class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
			<Fact label="Measured at">{reference.date}</Fact>
			<Fact label="Basis">{reference.basis}</Fact>
			<Fact label="Window">{reference.window}</Fact>
			<Fact label="Terms">{reference.terms}</Fact>
			<Fact label="Met">{reference.met}</Fact>
			<Fact label="Window length">{reference.partial}</Fact>
			{#each reference.amounts as amount (amount.label)}
				<Fact label={amount.label}><Money amount={amount.amount} {currency} /></Fact>
			{/each}
		</dl>
	</details>
</div>
