<script lang="ts">
import { currentAccountNames } from "../../client/account-names.svelte.js"
import { nameOf } from "../../lib/view/account-names"
import type { AccountCard } from "../../lib/view/plan-items/accounts"
import { type MarkMap, NO_MARKS } from "../../lib/view/what-if/items"
import AccountName from "../ui/AccountName.svelte"
import Money from "../ui/Money.svelte"
import ItemSwitch from "../what-if/ItemSwitch.svelte"
import WasText from "../what-if/WasText.svelte"
import AccountLifetimes from "./AccountLifetimes.svelte"
import AccountYears from "./AccountYears.svelte"

interface Props {
	cards: readonly AccountCard[]
	/** What the What-if session changes in each card, by item id: the baseline text struck through, or off. */
	marks?: MarkMap
	currency: string
	editable: boolean
	onEdit: (id: string) => void
	/** The plan and the content hash the page read for it: the what-if switch names both. */
	plan: string
	contentHash: string
	onTry: (id: string) => void
}

let { cards, marks = {}, currency, editable, onEdit, plan, contentHash, onTry }: Props = $props()
const names = $derived(currentAccountNames())
</script>

<ul class="grid gap-3 sm:grid-cols-2">
	{#each cards as card (card.id)}
		{@const mark = marks[card.id] ?? NO_MARKS}
		<li class="rounded-lg border border-border bg-card p-4 {mark.off ? 'opacity-60' : ''}">
			<div class="flex items-start justify-between gap-3">
				<h2 class="font-semibold break-all"><AccountName id={card.id} /></h2>
				{#if editable}
					<button
						type="button"
						aria-label="Edit {nameOf(names, card.id)}"
						onclick={() => onEdit(card.id)}
						class="shrink-0 rounded-md border border-border px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
					>
						Edit
					</button>
				{/if}
			</div>
			<p class="mt-1 text-sm text-muted-foreground">{card.kind === "asset" ? "Asset" : "Debt"}<WasText was={mark.was.kind} /></p>
			<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-muted-foreground">Rate</dt>
				<dd>{card.rate}{card.compounding === null ? "" : `, ${card.compounding}`}<WasText was={mark.was.rate} /><WasText was={mark.was.compounding} /></dd>
				{#if card.lockedUntil !== null}
					<dt class="text-muted-foreground">Locked until</dt>
					<dd>{card.lockedUntil}<WasText was={mark.was.lockedUntil} /></dd>
				{/if}
				{#if card.payout !== null || mark.was.payout !== undefined}
					<dt class="text-muted-foreground">Payout</dt>
					<dd>{card.payout ?? "none"}<WasText was={mark.was.payout} />{#if card.payoutHow !== null || mark.was.payoutHow !== undefined}<span class="block text-xs text-muted-foreground">{card.payoutHow ?? ""}<WasText was={mark.was.payoutHow} /></span>{/if}</dd>
				{/if}
				{#if card.fee !== null || mark.was.fee !== undefined}
					<dt class="text-muted-foreground">Fee</dt>
					<dd>{card.fee ?? "none"}<WasText was={mark.was.fee} /></dd>
				{/if}
				<dt class="text-muted-foreground">Baseline balance</dt>
				<dd>
					{#if card.balance === null}
						no balance
					{:else}
						<Money amount={card.balance} {currency} />
					{/if}
				</dd>
				<AccountLifetimes fees={card.lifetimeFees} payouts={card.lifetimePayouts} wasFees={mark.was.lifetimeFees} wasPayouts={mark.was.lifetimePayouts} {currency} />
			</dl>
			<AccountYears years={card.years} {currency} />
			{#if editable}
				<ItemSwitch {plan} {contentHash} path="accounts.{card.id}" label={nameOf(names, card.id)} onTry={() => onTry(card.id)} />
			{/if}
		</li>
	{/each}
</ul>
