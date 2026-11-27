<script lang="ts">
import { type TotalsDraft, totalProblem } from "../../lib/view/guided/money-draft"
import { HINT, INPUT, LABEL, PROBLEM } from "./styles"

interface Props {
	totals: TotalsDraft
	onTotal: (field: "income" | "spending", value: string) => void
}

let { totals, onTotal }: Props = $props()
const FIELDS = [
	{ field: "income", label: "Income per month", id: "guided-total-income" },
	{ field: "spending", label: "Spending per month", id: "guided-total-spending" },
] as const
</script>

<section class="space-y-4">
	<h2 class="text-base font-semibold">Your money</h2>
	<p class={HINT}>The ledger does not cover three whole months yet, so enter the two totals.</p>
	{#each FIELDS as field (field.field)}
		{@const problem = totalProblem(totals[field.field])}
		<div class="space-y-1.5">
			<label for={field.id} class={LABEL}>{field.label}</label>
			<input id={field.id} class={INPUT} value={totals[field.field]} inputmode="decimal" autocomplete="off"
				aria-invalid={problem ? "true" : undefined}
				aria-describedby={problem ? `${field.id}-problem` : undefined}
				oninput={(event) => onTotal(field.field, event.currentTarget.value)} />
			{#if problem}<p id="{field.id}-problem" role="alert" class={PROBLEM}>{problem}</p>{/if}
		</div>
	{/each}
</section>
