<script lang="ts">
import { planEditor } from "../../client/plan-editor.svelte.js"
import type { PlanRow } from "../../lib/view/plans/rows"
import Badge from "../ui/Badge.svelte"
import { cx } from "../ui/cx"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	names: readonly string[]
	selected: string
	rows: readonly PlanRow[]
	/** Runs when a plan is picked; the menu shuts through `onClose` after it. */
	onChange: (name: string) => unknown
	/** Whether the server answers Edits, so a new plan can be made here. */
	editable?: boolean
	/** Shuts the menu, so a link or a drawer opens from a closed menu. */
	onClose: () => void
}

let { names, selected, rows, onChange, editable = false, onClose }: Props = $props()

function pick(name: string): void {
	onChange(name)
	onClose()
}

function newPlan(): void {
	onClose()
	planEditor.open("new")
}
</script>

<!-- The plans the pages can show: one item each, the plan on screen checked, then the Plans page and a new plan. -->
{#each names as name (name)}
	{@const row = rows.find((one) => one.name === name)}
	<button
		type="button"
		role="menuitemradio"
		tabindex={-1}
		aria-checked={name === selected}
		onclick={() => pick(name)}
		class={cx(
			"flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm",
			name === selected
				? "bg-secondary font-medium text-foreground"
				: "text-muted-foreground hover:text-foreground",
		)}
	>
		<span class="min-w-0 flex-1 truncate">{name}</span>
		{#if row?.main}<Badge tone="accent">Main</Badge>{/if}
	</button>
{/each}
<div role="separator" class="my-1 border-t border-border"></div>
<SiteLink
	href="/plans/"
	role="menuitem"
	tabindex={-1}
	onclick={onClose}
	class="block rounded-md px-2.5 py-1.5 text-sm text-accent underline-offset-4 hover:underline"
>
	All plans
</SiteLink>
{#if editable}
	<button
		type="button"
		role="menuitem"
		tabindex={-1}
		onclick={newPlan}
		class="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-foreground hover:text-accent"
	>
		New plan
	</button>
{/if}
