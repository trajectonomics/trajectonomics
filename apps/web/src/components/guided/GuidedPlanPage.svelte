<script lang="ts">
import { tick } from "svelte"
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
	type Step,
} from "../../lib/view/guided/steps"
import GuidedSteps from "./GuidedSteps.svelte"
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
/** The step's heading, focused whenever the step changes so a reader hears where they are. */
let heading = $state<HTMLHeadingElement | undefined>()
let lastStep: Step | null = null
$effect(() => {
	const current = step
	if (lastStep === null) {
		lastStep = current
		return
	}
	if (lastStep === current) return
	lastStep = current
	void tick().then(() => heading?.focus())
})

/** Next advances while the step holds no problem, and otherwise shows every problem where the person is. */
function advance(): void {
	if (problems.length > 0) {
		guidedSession.showProblems = true
		return
	}
	guidedSession.advance()
}
</script>

<div class="space-y-6" data-guided>
	<GuidedSteps {step} />
	{#if onStep("household")}
		<HouseholdStep people={draft.people} problems={peopleProblems}
			showProblems={guidedSession.showProblems} bind:heading
			onName={(index, name) => guidedSession.changePerson(seed.people, index, nameChange(name))}
			onChange={(index, change) => guidedSession.changePerson(seed.people, index, change)}
			onAdd={(role) => guidedSession.addPerson(seed.people, role)}
			onRemove={(index) => guidedSession.removePerson(seed.people, index)} />
	{:else if onStep("money") && seed.money.path === "history"}
		<MoneyStep money={seed.money} rows={draft.rows} showProblems={guidedSession.showProblems} bind:heading
			onRow={(id, change) => guidedSession.changeRow(seed.rows, id, change)} />
	{:else if onStep("money")}
		<TotalsStep totals={draft.totals} showProblems={guidedSession.showProblems} bind:heading
			onTotal={(field, value) => guidedSession.changeTotal(seed.totals, field, value)} />
	{:else}
		<StopStep name={guidedSession.name} age={guidedSession.age} {lifeExpectancy} stored={draft.stored}
			saveable={editSession.token !== null} saving={editSession.busy}
			refusal={guidedSession.refusal ?? editSession.error} hint={guidedSession.hint}
			reloadable={guidedSession.reloadable} showProblems={guidedSession.showProblems} bind:heading
			onName={(name) => (guidedSession.name = name)}
			onAge={(age) => (guidedSession.age = age)}
			onSave={() => guidedSession.save(snapshot)} onReload={() => guidedSession.reload()} />
	{/if}
	<div class="flex flex-wrap gap-2">
		<button type="button" class={BUTTON} disabled={previousOf(step) === null}
			onclick={() => guidedSession.back()}>Back</button>
		{#if nextOf(step) !== null}
			<button type="button" class={PRIMARY} onclick={advance}>Next</button>
		{/if}
		<button type="button" class={BUTTON} onclick={() => guidedSession.cancelAndLeave()}>Cancel</button>
	</div>
	{#if editSession.token === null}
		<p class="text-sm text-muted-foreground">
			Saving is off here: run <code class="font-mono">traj dashboard</code> to save a plan.
		</p>
	{/if}
</div>
