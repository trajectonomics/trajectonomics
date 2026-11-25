<script lang="ts">
import { planEditor } from "../../client/plan-editor.svelte.js"
import type { PlanRow } from "../../lib/view/plans/rows"
import PlanRowItem from "../plans/PlanRowItem.svelte"
import { BUTTON } from "../plans/styles"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	/** The Scenario names the Snapshot holds, the main plan first. The switcher is hidden when there are none. */
	names: readonly string[]
	/** The Scenario the pages show. */
	selected: string
	/** Returns false when the page refused the switch: the list then shows the plan the page still shows. */
	onChange: (name: string) => unknown
	/** Whether the server answers Edits: then each plan has its menu, and a new plan can be made. */
	editable?: boolean
	/** What the Snapshot says of each plan (its hash, the Main tag, notes). */
	rows?: readonly PlanRow[]
}

let { names, selected, onChange, editable = false, rows = [] }: Props = $props()
</script>

<!-- The plan switcher: the plans the pages can show, with the main plan first. -->
{#if names.length > 0}
	<div class="space-y-2">
		<h2
			id="plan-switcher"
			class="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
		>
			Plans
		</h2>
		<ul aria-labelledby="plan-switcher" class="space-y-2">
			{#each names as name (name)}
				<PlanRowItem
					{name}
					row={rows.find((row) => row.name === name)}
					selected={name === selected}
					{onChange}
					{editable}
				/>
			{/each}
		</ul>
		<div class="flex flex-wrap items-center gap-2 px-1">
			{#if editable}
				<button type="button" onclick={() => planEditor.open("new")} class={BUTTON}>New plan</button>
			{/if}
			<SiteLink href="/plans/" class="text-sm text-accent underline-offset-4 hover:underline">
				See every plan
			</SiteLink>
		</div>
	</div>
{/if}
