<script lang="ts">
import { planNameError } from "../../lib/edit/name"
import { ageProblem } from "../../lib/view/guided/stop"
import GuidedRefusal from "./GuidedRefusal.svelte"
import { HINT, INPUT, LABEL, PRIMARY, PROBLEM } from "./styles"

interface Props {
	name: string
	age: string
	/** The holder's life expectancy, which the age stays under. */
	lifeExpectancy: number | null
	/** Every name the ledger holds: a new plan cannot repeat one. */
	stored: readonly string[]
	/** Whether the server gave the page a token, so the plan can be saved. */
	saveable: boolean
	saving: boolean
	/** The CLI's message when it refused the save, unchanged. */
	refusal: string | null
	/** The hint the CLI offers under its refusal. */
	hint: string | null
	/** Whether the refusal offers Reload, as a ledger that moved since the page read it does. */
	reloadable: boolean
	/** Whether Next found a problem, so every field shows its own. */
	showProblems: boolean
	/** The step's heading, which the page focuses when the step changes. */
	heading?: HTMLHeadingElement | undefined
	onName: (name: string) => void
	onAge: (age: string) => void
	onSave: () => void
	onReload: () => void
}

let {
	name,
	age,
	lifeExpectancy,
	stored,
	saveable,
	saving,
	refusal,
	hint,
	reloadable,
	showProblems,
	heading = $bindable(),
	onName,
	onAge,
	onSave,
	onReload,
}: Props = $props()
const nameProblem = $derived(planNameError(name, stored, "plan"))
const ageText = $derived(ageProblem(age, lifeExpectancy))
/** Save waits on every problem. */
const held = $derived(saving || nameProblem !== null || ageText !== null)
interface Touched {
	name?: boolean
	age?: boolean
}
let touched = $state<Touched>({})
/** A field shows its own problem after Next, once it holds text, or once the person has touched it. */
const shows = (problem: string | null, text: string, wasTouched: boolean | undefined) =>
	problem !== null && (showProblems || text.trim() !== "" || wasTouched === true) ? problem : null
const shownName = $derived(shows(nameProblem, name, touched.name))
const shownAge = $derived(shows(ageText, age, touched.age))
</script>

<section class="space-y-4">
	<h2 bind:this={heading} tabindex="-1" class="text-base font-semibold">When you would stop working</h2>
	<div class="space-y-1.5">
		<label for="guided-age" class={LABEL}>Stop-work age</label>
		<p class={HINT}>The age you stop working. Every income that stops with it ends then.</p>
		<input id="guided-age" class={INPUT} inputmode="numeric" autocomplete="off" value={age}
			oninput={(event) => {
				touched.age = true
				onAge(event.currentTarget.value)
			}}
			onblur={() => (touched.age = true)}
			aria-invalid={shownAge ? "true" : undefined}
			aria-describedby={shownAge ? "guided-age-problem" : undefined} />
		{#if shownAge}<p id="guided-age-problem" role="alert" class={PROBLEM}>{shownAge}</p>{/if}
	</div>
	<div class="space-y-1.5">
		<label for="guided-name" class={LABEL}>Plan name</label>
		<input id="guided-name" class={INPUT} autocomplete="off" value={name}
			oninput={(event) => {
				touched.name = true
				onName(event.currentTarget.value)
			}}
			onblur={() => (touched.name = true)}
			aria-invalid={shownName ? "true" : undefined}
			aria-describedby={shownName ? "guided-name-problem" : undefined} />
		{#if shownName}<p id="guided-name-problem" role="alert" class={PROBLEM}>{shownName}</p>{/if}
	</div>
	{#if refusal}<GuidedRefusal {refusal} {hint} {reloadable} {onReload} />{/if}
	{#if saveable}
		<button type="button" class={PRIMARY} disabled={held} onclick={onSave}>
			{saving ? "Saving…" : "Save plan"}
		</button>
	{/if}
</section>
