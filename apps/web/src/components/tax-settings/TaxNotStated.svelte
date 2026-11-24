<script lang="ts">
import type { GroupKey } from "../../lib/view/tax-settings/groups"
import type { NotStated } from "../../lib/view/tax-settings/not-stated"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	items: readonly NotStated[]
	/** Opens the drawer on the group that holds the item; absent when the page changes nothing. */
	onEdit?: ((group: GroupKey) => void) | undefined
	disabled: boolean
}

let { items, onEdit, disabled }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-left text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<!-- What the plan does not state: each deduction class `traj` reports as not stated, opening the same drawer as its group's card. -->
{#if items.length > 0}
	<section aria-labelledby="tax-not-stated" class="space-y-3">
		<h3 id="tax-not-stated" class="text-sm font-semibold">Not in your plan yet</h3>
		<p class="text-sm text-muted-foreground">The tax figures leave these out until you state them.</p>
		<ul class="flex flex-wrap gap-2">
			{#each items as item (item.class)}
				<li>
					{#if item.place === "flows"}
						<SiteLink href="/optimize/allowances/" class="inline-block rounded-md border border-border px-3 py-1.5 text-sm underline">{item.label} (a contribution Flow)</SiteLink>
					{:else if onEdit}
						{@const group = item.place}
						<button type="button" {disabled} onclick={() => onEdit(group)} class={button}>{item.label}</button>
					{:else}
						<span class="inline-block rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">{item.label}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
