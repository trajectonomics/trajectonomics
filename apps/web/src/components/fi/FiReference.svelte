<script lang="ts">
import type { ReferenceView } from "../../lib/view/fi/reference"
import Fact from "../projection/Fact.svelte"
import Money from "../ui/Money.svelte"

interface Props {
	reference: ReferenceView
	currency: string
}

/** The rule-of-thumb reference: labelled as a reference, with the figures the CLI states for it. */
let { reference, currency }: Props = $props()
const headingId = $props.id()
</script>

<section
	aria-labelledby={headingId}
	class="space-y-4 rounded-lg border border-dashed border-border p-4 sm:p-5"
>
	<h2 id={headingId} class="text-base font-semibold">Rule-of-thumb reference, not the answer</h2>
	<p class="text-sm text-muted-foreground">
		The survival date above decides financial independence. The rule of thumb is shown for
		comparison only, and it never moves that date.
	</p>
	{#if reference.multipleInWords}
		<p class="text-lg font-medium">{reference.multipleInWords}</p>
	{/if}
	<dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
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
</section>
