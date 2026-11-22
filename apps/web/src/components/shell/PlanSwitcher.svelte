<script lang="ts">
interface Props {
	/** The Scenario names the Snapshot holds. The switcher is hidden when there are none. */
	names: readonly string[]
	/** The Scenario the pages show. */
	selected: string
	onChange: (name: string) => void
}

let { names, selected, onChange }: Props = $props()
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
			onchange={(event) => onChange(event.currentTarget.value)}
			class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
		>
			{#each names as name (name)}
				<option value={name}>{name}</option>
			{/each}
		</select>
	</div>
{/if}
