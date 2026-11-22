<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { planNameError } from "../../lib/edit/name"
import { chooseScenario } from "../../lib/view/projection/scenario"

interface Props {
	/** The Scenario names the Snapshot holds: a copy's name must not repeat one of them. */
	names: readonly string[]
	/** The plan the pages show: the one a copy is made from, and the one a delete removes. */
	selected: string
	/** Shows a plan by its name. A copy shows itself; after a delete the first plan left shows. */
	onPlan: (name: string) => void
}

let { names, selected, onPlan }: Props = $props()
let mode: "idle" | "copy" | "delete" = $state("idle")
let draft = $state("")
let problem: string | null = $state(null)

const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

function startCopy(): void {
	mode = "copy"
	draft = ""
	problem = null
}

async function copy(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	problem = planNameError(draft, names)
	if (problem !== null) return
	const name = draft.trim()
	if (await editSession.run({ kind: "copy-plan", from: selected, name })) {
		mode = "idle"
		onPlan(name)
	}
}

async function remove(): Promise<void> {
	if (await editSession.run({ kind: "delete-plan", name: selected })) {
		mode = "idle"
		onPlan(chooseScenario(names, "") ?? "")
	}
}
</script>

<!-- Copy and delete a plan through traj. Each write runs on the server, and the page then shows the new Snapshot. -->
<div class="space-y-2">
	{#if mode === "copy"}
		<form onsubmit={copy} class="space-y-2">
			<label for="plan-copy-name" class="block text-sm text-foreground">Name of the copy</label>
			<input
				id="plan-copy-name"
				bind:value={draft}
				autocomplete="off"
				class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
			/>
			<div class="flex gap-2">
				<button type="submit" disabled={editSession.busy} class={button}>Copy</button>
				<button type="button" onclick={() => (mode = "idle")} class={button}>Cancel</button>
			</div>
		</form>
	{:else if mode === "delete"}
		<p class="text-sm text-foreground">Delete the plan {selected}? Its name is freed for reuse.</p>
		<div class="flex gap-2">
			<button type="button" onclick={remove} disabled={editSession.busy} class={button}>
				Delete plan
			</button>
			<button type="button" onclick={() => (mode = "idle")} class={button}>Keep plan</button>
		</div>
	{:else}
		<div class="flex flex-wrap gap-2">
			<button type="button" onclick={startCopy} disabled={editSession.busy} class={button}>
				Copy plan
			</button>
			<button type="button" onclick={() => (mode = "delete")} disabled={editSession.busy} class={button}>
				Delete plan
			</button>
		</div>
	{/if}
	{#if problem ?? editSession.error}
		<p role="alert" class="text-sm text-destructive">{problem ?? editSession.error}</p>
	{/if}
</div>
