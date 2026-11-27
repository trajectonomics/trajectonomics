<script lang="ts">
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { selectPlan } from "../../client/select-plan.svelte.js"
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { WRITTEN_REREAD_FAILED_MESSAGE } from "../../lib/edit/failure"
import { planNameError } from "../../lib/edit/name"
import { scenarioNames } from "../../lib/view/plan"

let name = $state("")
const problem = $derived(
	name.trim() === "" ? null : planNameError(name, scenarioNames(currentSnapshot())),
)
const blocked = $derived(editSession.busy || whatIfSession.reading || !whatIfSession.active)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Saves the session as a new plan with its Overrides, and shows the new plan when it ran. */
async function keep(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const plan = name.trim()
	if (!(await whatIfSession.keepAsPlan(plan))) return
	name = ""
	void selectPlan(plan)
}
</script>

<!-- The session's three actions: a new plan, the plan itself, and Revert, which runs nothing. -->
<div class="flex flex-wrap items-start gap-3">
	<form onsubmit={keep} aria-label="Save as new plan" class="flex flex-wrap items-start gap-2">
		<label class="text-sm">
			<span class="sr-only">New plan name</span>
			<input
				bind:value={name}
				placeholder="New plan name"
				class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
			/>
		</label>
		<button type="submit" disabled={blocked || name.trim() === "" || problem !== null} class={button}>
			Save as new plan
		</button>
		{#if problem !== null}<p class="w-full text-sm text-destructive">{problem}</p>{/if}
	</form>
	<button type="button" onclick={() => whatIfSession.applyToPlan()} disabled={blocked} class={button}>
		Apply to this plan
	</button>
	<button type="button" onclick={() => whatIfSession.revert()} disabled={editSession.busy} class={button}>
		Revert
	</button>
</div>
{#if editSession.stale}
	<p role="alert" class="text-sm text-destructive">
		{STALE_PLAN}
		<button type="button" onclick={() => whatIfSession.reload()} class="underline">Reload</button>
	</p>
{:else if editSession.savedUnread}
	<p role="alert" class="text-sm text-destructive">
		{WRITTEN_REREAD_FAILED_MESSAGE}
		<button type="button" onclick={() => whatIfSession.reload()} class="underline">Reload</button>
	</p>
{:else if editSession.error !== null}
	<p role="alert" class="text-sm text-destructive">{editSession.error}</p>
{/if}
