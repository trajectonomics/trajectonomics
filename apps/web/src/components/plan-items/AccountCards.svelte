<script lang="ts">
import type { AccountCard } from "../../lib/view/plan-items/accounts"
import Money from "../ui/Money.svelte"
import ItemSwitch from "../what-if/ItemSwitch.svelte"

interface Props {
	cards: readonly AccountCard[]
	currency: string
	editable: boolean
	onEdit: (id: string) => void
	/** The plan and the content hash the page read for it: the what-if switch names both. */
	plan: string
	contentHash: string
	onTry: (id: string) => void
}

let { cards, currency, editable, onEdit, plan, contentHash, onTry }: Props = $props()
</script>

<ul class="grid gap-3 sm:grid-cols-2">
	{#each cards as card (card.id)}
		<li class="rounded-lg border border-border bg-card p-4">
			<div class="flex items-start justify-between gap-3">
				<h2 class="font-semibold break-all">{card.id}</h2>
				{#if editable}
					<button
						type="button"
						aria-label="Edit {card.id}"
						onclick={() => onEdit(card.id)}
						class="shrink-0 rounded-md border border-border px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
					>
						Edit
					</button>
				{/if}
			</div>
			<p class="mt-1 text-sm text-muted-foreground">{card.kind === "asset" ? "Asset" : "Debt"}</p>
			<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-muted-foreground">Rate</dt>
				<dd>{card.rate}{card.compounding === null ? "" : `, ${card.compounding}`}</dd>
				{#if card.lockedUntil !== null}
					<dt class="text-muted-foreground">Locked until</dt>
					<dd>{card.lockedUntil}</dd>
				{/if}
				<dt class="text-muted-foreground">Baseline balance</dt>
				<dd>
					{#if card.balance === null}
						no balance
					{:else}
						<Money amount={card.balance} {currency} />
					{/if}
				</dd>
			</dl>
			{#if editable}
				<ItemSwitch {plan} {contentHash} path="accounts.{card.id}" label={card.id} onTry={() => onTry(card.id)} />
			{/if}
		</li>
	{/each}
</ul>
