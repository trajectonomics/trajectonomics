<script lang="ts">
import type { FlowCard } from "../../lib/view/plan-items/flows"
import type { PlanDensity } from "../../lib/view/plan-items/tabs"
import type { MarkMap } from "../../lib/view/what-if/items"
import CompactFlowCards from "./CompactFlowCards.svelte"
import FullFlowCards from "./FullFlowCards.svelte"

interface Props {
	cards: readonly FlowCard[]
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

/** The Flows of one page: full cards, or the Plan's compact grid that opens each one in the drawer. */
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
	<CompactFlowCards {cards} {currency} {editable} {addNoun} {onAdd} onOpen={onEdit} />
{:else}
	<FullFlowCards {cards} {marks} {currency} {editable} {actions} {onEdit} {plan} {contentHash} {onTry} />
{/if}
