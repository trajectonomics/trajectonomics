<script lang="ts">
import { restoreSelect } from "../ui/restore"
import PlanActions from "./PlanActions.svelte"

interface Props {
	/** The Scenario names the Snapshot holds. The switcher is hidden when there are none. */
	names: readonly string[]
	/** The Scenario the pages show. */
	selected: string
	/** Returns false when the page refused the switch: the select then shows the plan the page still shows. */
	onChange: (name: string) => unknown
	/** Whether the server answers Edits: then the plan can be copied and deleted. */
	editable?: boolean
}

let { names, selected, onChange, editable = false }: Props = $props()
</script>

<!-- The plan switcher: a labelled select of the Scenarios. The pages that show a Scenario follow it. -->
{#if names.length > 0}
	<div class="space-y-1.5">
		<label
			for="scenario-switcher"
			class="block px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
		>
			Scenario
		</label>
		<select
			id="scenario-switcher"
			value={selected}
			onchange={(event) => {
				if (onChange(event.currentTarget.value) === false) restoreSelect(event.currentTarget, selected)
			}}
			class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
		>
			{#each names as name (name)}
				<option value={name}>{name}</option>
			{/each}
		</select>
		{#if editable}
			<PlanActions {names} {selected} onPlan={onChange} />
		{/if}
	</div>
{/if}
