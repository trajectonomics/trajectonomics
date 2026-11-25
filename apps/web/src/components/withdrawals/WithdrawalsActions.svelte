<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentItemText } from "../../client/item-names.svelte.js"
import type { HouseholdDocument } from "../../lib/contract"
import type { WithdrawalContext } from "../../lib/view/withdrawals/context"
import { mainFlow, ruleFlows } from "../../lib/view/withdrawals/rule"
import Drawer from "../ui/Drawer.svelte"
import ItemName from "../ui/ItemName.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import SpendingForm from "./SpendingForm.svelte"

interface Props {
	name: string
	contentHash: string
	ctx: WithdrawalContext
	household: HouseholdDocument | null
}

let { name, contentHash, ctx, household }: Props = $props()
/** Null when the drawer is shut; else the Flow it edits, or none for a new one. */
let drawer: { id?: string } | null = $state(null)
const main = $derived(mainFlow(ctx.doc.flows))
const others = $derived(ruleFlows(ctx.doc.flows).filter((flow) => flow.id !== main?.id))
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<!-- "Set how you spend in retirement" opens the right-side drawer: one form, one Edit, or a try in the What-if session. -->
<div class="flex flex-wrap gap-2">
	<button type="button" class={button} disabled={editSession.busy} onclick={() => (drawer = main === undefined ? {} : { id: main.id })}>
		{main === undefined ? "Set how you spend in retirement" : `Change ${currentItemText("flow", main.id)}`}
	</button>
	{#each others as flow (flow.id)}
		<button type="button" class={button} disabled={editSession.busy} onclick={() => (drawer = { id: flow.id })}>Change <ItemName kind="flow" id={flow.id} /></button>
	{/each}
</div>
<Drawer open={drawer !== null} title={drawer?.id === undefined ? "Set how you spend in retirement" : `Change ${currentItemText("flow", drawer.id)}`} onClose={() => (drawer = null)}>
	<StaleNotice />
	{#if drawer !== null}
		<SpendingForm {name} {contentHash} {ctx} {household} flowId={drawer.id} onDone={() => (drawer = null)} />
	{/if}
</Drawer>
