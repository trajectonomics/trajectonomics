<script lang="ts">
import type { AccountCard } from "../../lib/view/plan-items/accounts"
import type { PlanDensity } from "../../lib/view/plan-items/tabs"
import type { MarkMap } from "../../lib/view/what-if/items"
import CompactAccountCards from "./CompactAccountCards.svelte"
import FullAccountCards from "./FullAccountCards.svelte"

interface Props {
	cards: readonly AccountCard[]
	/** What the What-if session changes in each card, by item id: the baseline text struck through, or off. */
	marks?: MarkMap
	currency: string
	editable: boolean
	/** False on the drawer's face, which shows no Edit control: the form is right below it. */
	actions?: boolean
	/** How the cards are drawn: the page's full card, or the Plan's compact one. */
	density?: PlanDensity
	/** The words of the dashed card that adds one, when the list draws one. */
	addNoun?: string | undefined
	onAdd?: (() => void) | undefined
	onEdit: (id: string) => void
	/** The plan and the content hash the page read for it: the what-if switch names both. */
	plan: string
	contentHash: string
	onTry: (id: string) => void
}

/** The plan's Accounts: full cards, or the Plan's compact grid that opens each one in the drawer. */
let {
	cards,
	marks = {},
	currency,
	editable,
	actions = true,
	density = "full",
	addNoun,
	onAdd,
	onEdit,
	plan,
	contentHash,
	onTry,
}: Props = $props()
</script>

{#if density === "compact"}
	<CompactAccountCards {cards} {currency} {editable} {addNoun} {onAdd} onOpen={onEdit} />
{:else}
	<FullAccountCards {cards} {marks} {currency} {editable} {actions} {onEdit} {plan} {contentHash} {onTry} />
{/if}
