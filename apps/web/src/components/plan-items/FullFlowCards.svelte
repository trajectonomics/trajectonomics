<script lang="ts">
import { currentItemText } from "../../client/item-names.svelte.js"
import { switchPathsOf } from "../../lib/view/plan-items/flow-switch"
import type { FlowCard } from "../../lib/view/plan-items/flows"
import { frequencyWords } from "../../lib/view/plan-items/frequency"
import { type MarkMap, NO_MARKS } from "../../lib/view/what-if/items"
import Sentence from "../routing/Sentence.svelte"
import ItemName from "../ui/ItemName.svelte"
import Money from "../ui/Money.svelte"
import ItemSwitch from "../what-if/ItemSwitch.svelte"
import WasText from "../what-if/WasText.svelte"

interface Props {
	cards: readonly FlowCard[]
	/** What the What-if session changes in each card, by item id: the baseline text struck through, or off. */
	marks?: MarkMap
	currency: string
	editable: boolean
	/** False on the drawer's face, which shows no Edit control: the form is right below it. */
	actions?: boolean
	onEdit: (id: string) => void
	/** The plan and the content hash the page read for it: the what-if switch names both. */
	plan: string
	contentHash: string
	onTry: (id: string) => void
}

/** The full cards of the Flows, as the pages of Income and Expenses draw them. */
let {
	cards,
	marks = {},
	currency,
	editable,
	actions = true,
	onEdit,
	plan,
	contentHash,
	onTry,
}: Props = $props()
</script>

<ul class="grid gap-3 sm:grid-cols-2">
	{#each cards as card (card.id)}
		{@const mark = marks[card.id] ?? NO_MARKS}
		{@const also = switchPathsOf(card).slice(1)}
		<li class="rounded-lg border border-border bg-card p-4 {mark.off ? 'opacity-60' : ''}">
			<div class="flex items-start justify-between gap-3">
				<h2 class="font-semibold break-all"><ItemName kind="flow" id={card.id} /></h2>
				{#if actions && editable && card.editable}
					<button
						type="button"
						aria-label="Edit {currentItemText("flow", card.id)}"
						onclick={() => onEdit(card.id)}
						class="shrink-0 rounded-md border border-border px-2.5 py-1 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
					>
						Edit
					</button>
				{/if}
			</div>
			<p class="mt-2 text-lg">
				{#if card.amount !== null}
					<Money amount={card.amount} {currency} />
				{:else}
					<span class="text-muted-foreground">computed</span>
				{/if}
				<WasText was={mark.was.amount} money {currency} />
				<span class="ml-1 text-sm text-muted-foreground">{frequencyWords(card.frequency)}</span>
				{#if mark.was.frequency !== undefined}<WasText was={typeof mark.was.frequency === "string" ? frequencyWords(mark.was.frequency) : mark.was.frequency} />{/if}
			</p>
			<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-muted-foreground">{card.startLabel}</dt>
				<dd class="wrap-anywhere"><Sentence parts={card.start.parts} {currency} /><WasText was={mark.was.start} />{#if card.startAnchor !== null} <span class="block text-xs text-muted-foreground">{card.startAnchor}</span>{/if}</dd>
				{#if card.end !== null || mark.was.end !== undefined}
					<dt class="text-muted-foreground">Ends</dt>
					<dd class="wrap-anywhere">{#if card.end !== null}<Sentence parts={card.end.parts} {currency} />{:else}none{/if}{#if mark.was.end}<WasText was={mark.was.end} />{/if}{#if card.endAnchor !== null} <span class="block text-xs text-muted-foreground">{card.endAnchor}</span>{/if}</dd>
				{/if}
				<dt class="text-muted-foreground">Growth</dt>
				<dd>{card.growth}<WasText was={mark.was.growth} /></dd>
				{#if card.category !== null}
					<dt class="text-muted-foreground">Category</dt>
					<dd>{card.category}</dd>
				{/if}
				{#if card.earned !== null}
					<dt class="text-muted-foreground">Income</dt>
					<dd>{card.earned}</dd>
				{/if}
				{#if card.employer !== null}
					<dt class="text-muted-foreground">Employer</dt>
					<dd>{card.employer}<WasText was={mark.was.employer} /></dd>
				{/if}
			</dl>
			{#if editable && card.editable}
				<ItemSwitch {plan} {contentHash} path="flows.{card.id}" {also} label={currentItemText("flow", card.id)} onTry={() => onTry(card.id)} />
			{/if}
		</li>
	{/each}
</ul>
