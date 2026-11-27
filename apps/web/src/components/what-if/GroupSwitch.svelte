<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { GroupSwitch } from "../../lib/view/plan-items/group-switch"
import { restoreSwitch } from "../ui/restore"

interface Props {
	/** The plan the switch changes in its session, and the content hash the page read for it. */
	plan: string
	contentHash: string
	/** The loan or the asset, and the paths its switch takes out together. */
	group: GroupSwitch
	/** The name that names the switch to a screen reader. */
	label: string
	/** Opens the drawer in what-if mode, where a value of the whole group is tried rather than saved. */
	onTry: () => void
}

let { plan, contentHash, group, label, onTry }: Props = $props()
const off = $derived(whatIfSession.isGroupOffIn(plan, group.spec))
const ownerOff = $derived(group.owner !== null && whatIfSession.isGroupOffIn(plan, group.owner))
const button =
	"rounded-md border border-border bg-card px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Makes the change the switch asks for; a refused one (another plan holds changes) puts the switch back. */
function change(control: HTMLInputElement): void {
	const made = whatIfSession.setGroupOff(
		plan,
		contentHash,
		group.spec,
		group.removals,
		!control.checked,
	)
	if (!made) restoreSwitch(control, !off)
}
</script>

<!-- One what-if control for the whole loan or asset: the switch takes every part out together, and "What if…" sets its parts together. A debt the ledger holds has no switch, and a loan inside an asset follows the asset. -->
<div class="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
	{#if group.refused === null}
		<label class="inline-flex items-center gap-2">
			<input
				type="checkbox"
				role="switch"
				aria-label="Include {label} in the what-if"
				checked={!off}
				disabled={whatIfSession.saving}
				onchange={(event) => change(event.currentTarget)}
				class="size-4 accent-primary"
			/>
			<span>{off ? "Off in this what-if" : "On"}</span>
		</label>
	{:else}
		<p class="min-w-0 flex-1 text-muted-foreground">
			{group.refused}{#if ownerOff && group.owner !== null} Off with {group.owner.name}.{/if}
		</p>
	{/if}
	<button type="button" onclick={onTry} disabled={whatIfSession.saving || ownerOff} class={button}>What if…</button>
</div>
