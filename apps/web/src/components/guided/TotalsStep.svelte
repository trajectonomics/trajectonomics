<script lang="ts">
import { maskedFocus } from "../../client/masked-focus.js"
import { preferences } from "../../client/preferences.svelte.js"
import { maskMoney } from "../../lib/format"
import { type TotalsDraft, totalProblem } from "../../lib/view/guided/money-draft"
import { HINT, INPUT, LABEL, PROBLEM } from "./styles"

interface Props {
	totals: TotalsDraft
	/** Whether Next found a problem, so every field shows its own. */
	showProblems: boolean
	/** The step's heading, which the page focuses when the step changes. */
	heading?: HTMLHeadingElement | undefined
	onTotal: (field: "income" | "spending", value: string) => void
}

let { totals, showProblems, heading = $bindable(), onTotal }: Props = $props()
const FIELDS = [
	{ field: "income", label: "Income per month", id: "guided-total-income" },
	{ field: "spending", label: "Spending per month", id: "guided-total-spending" },
] as const
let focused = $state<string | null>(null)
interface Touched {
	income?: boolean
	spending?: boolean
}
let touched = $state<Touched>({})
/** The problem to show at a total: after Next, or once the person has typed in or left it. */
const shownProblem = (field: "income" | "spending"): string | null =>
	showProblems || touched[field] === true ? totalProblem(totals[field]) : null
/** The total the field shows, masked while Hide amounts is on and the field is not focused. */
const shownTotal = (field: "income" | "spending"): string =>
	preferences.hidden && focused !== field && totals[field].trim() !== ""
		? maskMoney(totals[field])
		: totals[field]
</script>

<section class="space-y-4">
	<h2 bind:this={heading} tabindex="-1" class="text-base font-semibold">Your money</h2>
	<p class={HINT}>Enter your income and spending per month.</p>
	{#each FIELDS as field (field.field)}
		{@const problem = shownProblem(field.field)}
		{@const masked = preferences.hidden && focused !== field.field && totals[field.field].trim() !== ""}
		<div class="space-y-1.5">
			<label for={field.id} class={LABEL}>{field.label}</label>
			<input id={field.id} class={INPUT} value={shownTotal(field.field)} inputmode="decimal" autocomplete="off"
				use:maskedFocus={() => preferences.hidden && totals[field.field].trim() !== ""}
				onfocus={() => (focused = field.field)}
				onblur={() => {
					focused = null
					touched[field.field] = true
				}}
				aria-invalid={problem ? "true" : undefined}
				aria-describedby={problem ? `${field.id}-problem` : masked ? `${field.id}-masked` : undefined}
				oninput={(event) => {
					touched[field.field] = true
					onTotal(field.field, event.currentTarget.value)
				}} />
			{#if masked}<span id="{field.id}-masked" class="sr-only">Amount hidden. Select the field to see and edit it.</span>{/if}
			{#if problem}<p id="{field.id}-problem" role="alert" class={PROBLEM}>{problem}</p>{/if}
		</div>
	{/each}
</section>
