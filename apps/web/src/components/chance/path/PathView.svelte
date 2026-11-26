<script lang="ts">
import { currentAccountNames } from "../../../client/account-names.svelte.js"
import { editSession } from "../../../client/edit.svelte.js"
import { currentSearch } from "../../../client/location.svelte.js"
import { pathReads } from "../../../client/path-reads.svelte.js"
import type { Snapshot } from "../../../lib/contract"
import { editsShown } from "../../../lib/edit/shown"
import { chanceHref } from "../../../lib/view/chance/links"
import { resolvePath } from "../../../lib/view/chance/path-state"
import { chooseScenario } from "../../../lib/view/plan"
import EmptyState from "../../ui/EmptyState.svelte"
import PathResult from "./PathResult.svelte"

interface Props {
	snapshot: Snapshot
	/** The plan and the path's index as the address bar names them, and the terms of the chart. */
	scenario: string
	index: string
	terms: string
	onTerms: (value: string) => void
}

/** One future of a plan's chance: read in advance, or live through the server, and held against the chance on screen. */
let { snapshot, scenario, index, terms, onTerms }: Props = $props()
const plan = $derived(chooseScenario(snapshot.params.scenarios, scenario))
const chance = $derived(plan === null ? undefined : snapshot.reads.chance[plan])
const token = $derived(editSession.token)
const resolution = $derived(
	resolvePath({
		chance,
		index,
		stored: plan === null ? undefined : snapshot.reads.paths[plan],
		live: (value) => (plan === null ? undefined : pathReads.entry(plan, value)),
		canRead: editsShown(token, currentSearch()),
	}),
)
const state = $derived(resolution.state)
// The page asks the server for a path it does not hold, once for each run of the chance.
$effect(() => {
	const wanted = resolution.wanted
	if (wanted !== null && token !== null && plan !== null) {
		void pathReads.load(token, plan, wanted.index, wanted.run)
	}
})
</script>

{#if state.kind === "ready"}
	<PathResult
		path={state.path}
		chance={state.chance}
		plan={plan ?? ""}
		names={currentAccountNames()}
		{terms}
		{onTerms}
		argv={state.argv}
	/>
{:else if state.kind === "loading"}
	<p role="status" class="text-muted-foreground">Reading this future from traj.</p>
{:else if state.kind === "unavailable"}
	<EmptyState title="A live dashboard can open this future">
		<p>
			This Snapshot holds only the futures it read in advance. Start the Dashboard with <code>traj dashboard</code> to open any future
			year by year. <a href={chanceHref(currentSearch(), plan ?? "")} class="text-accent underline-offset-4 hover:underline">Back to Chance of success</a>
		</p>
	</EmptyState>
{:else}
	<div role="alert" class="space-y-2 rounded-lg border border-destructive p-4 text-sm">
		<p class="font-medium">This future could not be opened.</p>
		{#if state.fromCli}<p data-cli>{state.message}</p>{:else}<p>{state.message}</p>{/if}
		<a href={chanceHref(currentSearch(), plan ?? "")} class="text-accent underline-offset-4 hover:underline">Back to Chance of success</a>
	</div>
{/if}
