<script lang="ts">
import type { PlanRow } from "../../lib/view/plans/rows"
import { cx } from "../ui/cx"
import PlanMenu from "./PlanMenu.svelte"
import PlanTags from "./PlanTags.svelte"

interface Props {
	name: string
	/** What the Snapshot says of the plan, or undefined when it holds nothing but the name. */
	row: PlanRow | undefined
	selected: boolean
	/** Asks the page to show this plan; the name's button runs it. */
	onChoose: () => unknown
	/** Whether the server answers Edits: then the row has its menu. */
	editable: boolean
}

let { name, row, selected, onChoose, editable }: Props = $props()
</script>

<!-- One plan in the switcher: its name (a button that shows it), its marks, and its menu. -->
<li class="space-y-1">
	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			aria-current={selected ? "true" : undefined}
			onclick={onChoose}
			class={cx(
				"min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm break-words outline-none focus-visible:outline-2 focus-visible:outline-ring",
				selected ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
			)}
		>
			{name}
		</button>
		{#if row}<PlanTags {row} />{/if}
	</div>
	{#if editable && row}
		<div class="px-1"><PlanMenu {row} /></div>
	{/if}
</li>
