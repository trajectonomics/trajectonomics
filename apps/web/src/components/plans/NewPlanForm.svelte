<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentSearch } from "../../client/location.svelte.js"
import { selectPlan } from "../../client/select-plan.svelte.js"
import { planNameError } from "../../lib/edit/name"
import { withSearch } from "../../lib/view/links"
import { newPlanEdit, type StartFrom } from "../../lib/view/plans/edits"
import PlanForm from "./PlanForm.svelte"
import { FIELD } from "./styles"

interface Props {
	/** Every name the ledger holds: a new plan cannot repeat one. */
	stored: readonly string[]
	/** The plans a copy can be made of. */
	names: readonly string[]
	/** The Snapshot's As-of, which the accounts are read at. */
	asOf: string
	/** The plan to copy, when the form is the Copy action of a plan's menu; empty for a new plan. */
	copyOf: string
	onDone: () => void
}

let { stored, names, asOf, copyOf, onDone }: Props = $props()
let name = $state("")
let from: "accounts" | "copy" = $state("accounts")
let plan = $state("")
let problem: string | null = $state(null)
const first = $derived(names[0] ?? "")
$effect(() => {
	from = copyOf === "" ? "accounts" : "copy"
	plan = copyOf === "" ? first : copyOf
})

async function save(): Promise<void> {
	problem = planNameError(name, stored)
	if (problem !== null) return
	const start: StartFrom = from === "copy" ? { from, plan } : { from }
	if (await editSession.run(newPlanEdit(name, start, asOf))) {
		selectPlan(name.trim())
		onDone()
	}
}
</script>

<PlanForm submit={copyOf === "" ? "Make plan" : "Copy"} {problem} onSubmit={save} onCancel={onDone}>
	<div class="space-y-1.5">
		<label for="plan-new-name" class="block text-sm font-medium text-foreground">Name</label>
		<input id="plan-new-name" bind:value={name} autocomplete="off" class={FIELD} />
	</div>
	{#if copyOf === ""}
		<fieldset class="space-y-2">
			<legend class="text-sm font-medium text-foreground">Start from</legend>
			<label class="flex items-center gap-2 text-sm">
				<input type="radio" bind:group={from} value="accounts" /> From my accounts today
			</label>
			<label class="flex flex-wrap items-center gap-2 text-sm">
				<input type="radio" bind:group={from} value="copy" /> A copy of
				<select bind:value={plan} aria-label="Plan to copy" class={FIELD}>
					{#each names as option (option)}<option value={option}>{option}</option>{/each}
				</select>
			</label>
		</fieldset>
	{:else}
		<p class="text-sm text-muted-foreground">A copy of {copyOf}.</p>
	{/if}
	{#if copyOf === ""}
		<p class="text-sm">
			<a class="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				href={withSearch("/plans/new/", currentSearch())}>Set up step by step</a>
		</p>
	{/if}
</PlanForm>
