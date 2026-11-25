<script lang="ts">
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import PlanItemsBody from "../plan-items/PlanItemsBody.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** Which items the page lists: Income, Expenses, or Assets and debts. */
	kind: PlanKind
	/** The Scenario the address bar asks for. */
	scenario: string
	/** Whether the Edit controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

let { kind, scenario, editable }: Props = $props()
const page = $derived(PLAN_PAGES[kind])
</script>

<PageShell title={page.title} intro={page.intro}>
	{#snippet children(snapshot)}
		<PlanItemsBody {snapshot} {kind} {scenario} {editable} />
	{/snippet}
</PageShell>
