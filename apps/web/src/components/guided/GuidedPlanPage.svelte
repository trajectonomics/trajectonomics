<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { guidedSession } from "../../client/guided-plan.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { seedOf } from "../../lib/view/guided/compose"
import { nameChange, peopleOf } from "../../lib/view/guided/people"
import {
	type GuidedDraft,
	nextOf,
	previousOf,
	problemsOf,
	STEP_LABELS,
	STEPS,
} from "../../lib/view/guided/steps"
import HouseholdStep from "./HouseholdStep.svelte"
import MoneyStep from "./MoneyStep.svelte"
import StopStep from "./StopStep.svelte"
import { BUTTON, PRIMARY } from "./styles"
import TotalsStep from "./TotalsStep.svelte"

interface Props {
	/** The Snapshot the steps start from. */
	snapshot: Snapshot
}

let { snapshot }: Props = $props()
const seed = $derived(seedOf(snapshot))
const draft: GuidedDraft = $derived(guidedSession.draftOf(snapshot))
const problems = $derived(problemsOf(guidedSession.step, draft))
const peopleProblems = $derived(peopleOf(draft.people).problems)
const lifeExpectancy = $derived(peopleOf(draft.people).holderLifeExpectancy)
const step = $derived(guidedSession.step)
const onStep = (one: string) => step === one
</script>

<div class="space-y-6">
	<nav aria-label="Steps">
		<ol class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
			{#each STEPS as one, index (one)}
				<li aria-current={onStep(one) ? "step" : undefined}
					class={onStep(one) ? "font-semibold text-foreground" : "text-muted-foreground"}>
					{index + 1}. {STEP_LABELS[one]}
				</li>
			{/each}
		</ol>
	</nav>
	{#if onStep("household")}
		<HouseholdStep people={draft.people} problems={peopleProblems}
			onName={(index, name) => guidedSession.changePerson(seed.people, index, nameChange(name))}
			onChange={(index, change) => guidedSession.changePerson(seed.people, index, change)}
			onAdd={(role) => guidedSession.addPerson(seed.people, role)} />
	{:else if onStep("money") && seed.money.path === "history"}
		<MoneyStep money={seed.money} rows={draft.rows}
			onRow={(id, change) => guidedSession.changeRow(seed.rows, id, change)} />
	{:else if onStep("money")}
		<TotalsStep totals={draft.totals}
			onTotal={(field, value) => guidedSession.changeTotal(seed.totals, field, value)} />
	{:else}
		<StopStep name={guidedSession.name} age={guidedSession.age} {lifeExpectancy} stored={draft.stored}
			saveable={editSession.token !== null} saving={editSession.busy}
			refusal={guidedSession.refusal} reloadable={guidedSession.reloadable}
			onName={(name) => (guidedSession.name = name)}
			onAge={(age) => (guidedSession.age = age)}
			onSave={() => guidedSession.save(snapshot)} onReload={() => guidedSession.reload()} />
	{/if}
	<div class="flex flex-wrap gap-2">
		<button type="button" class={BUTTON} disabled={previousOf(step) === null}
			onclick={() => guidedSession.back()}>Back</button>
		{#if nextOf(step) !== null}
			<button type="button" class={PRIMARY} disabled={problems.length > 0}
				onclick={() => (guidedSession.step = nextOf(step) ?? step)}>Next</button>
		{/if}
		<button type="button" class={BUTTON} onclick={() => guidedSession.cancelAndLeave()}>Cancel</button>
	</div>
	{#if editSession.token === null}
		<p class="text-sm text-muted-foreground">
			Saving is off here: run <code class="font-mono">traj dashboard</code> to save a plan.
		</p>
	{/if}
</div>
