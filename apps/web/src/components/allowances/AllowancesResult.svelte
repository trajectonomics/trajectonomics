<script lang="ts">
import type { ProjectionAllowances, ScenarioDocument } from "../../lib/contract"
import { allowancesView } from "../../lib/view/allowances"
import { NO_PEOPLE, type PersonNames } from "../../lib/view/item-names"
import EmptyState from "../ui/EmptyState.svelte"
import LaterYears from "./LaterYears.svelte"
import ReturnSection from "./ReturnSection.svelte"
import YearCard from "./YearCard.svelte"

interface Props {
	data: ProjectionAllowances
	plan: { name: string; contentHash: string; doc: ScenarioDocument } | null
	/** The household's people, so a Return is named by the role the CLI states ("You", "Your partner"). */
	people?: PersonNames
}

let { data, plan, people = NO_PEOPLE }: Props = $props()
const view = $derived(allowancesView(data))
</script>

<!-- The CLI's reading of one plan: one section per Return, this tax year first, the later years, the assumptions and the notes. -->
<div class="space-y-8">
	{#if view.current === null && view.later.length === 0}
		<EmptyState title="No whole tax year to read">
			<p>The plan holds no whole tax year after the As-of.</p>
		</EmptyState>
	{/if}
	{#if view.returns.length > 0}
		{#each view.returns as one (one.key)}
			<ReturnSection {one} currency={view.currency} {plan} {people} />
		{/each}
	{:else}
		{#if view.current}<YearCard year={view.current} currency={view.currency} {plan} {people} />{/if}
		{#if view.later.length > 0}<LaterYears years={view.later} currency={view.currency} {plan} {people} />{/if}
	{/if}
	{#if view.assumptions.length > 0}
		<details class="rounded-lg border border-border p-4 text-sm">
			<summary class="cursor-pointer font-medium">Details: the tax figures used</summary>
			<ul class="mt-2 list-disc space-y-1 pl-5">
				{#each view.assumptions as line (line.key)}
					<li><code class="font-mono text-xs">{line.path}</code>: <span data-cli>{line.text}</span></li>
				{/each}
			</ul>
		</details>
	{/if}
	<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
		{#each view.notes as note (note.text)}<li>{#if note.fromCli}<span data-cli>{note.text}</span>{:else}{note.text}{/if}</li>{/each}
	</ul>
</div>
