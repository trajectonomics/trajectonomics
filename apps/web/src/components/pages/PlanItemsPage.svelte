<script lang="ts">
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import PlanItemsBody from "../plan-items/PlanItemsBody.svelte"
import PageShell from "../ui/PageShell.svelte"
import SiteLink from "../ui/SiteLink.svelte"

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

<PageShell title={page.title}>
	{#snippet children(snapshot)}
		<SiteLink
			href="/projection/"
			class="text-sm text-accent underline-offset-4 hover:underline print:hidden"
		>
			← Plan
		</SiteLink>
		<PlanItemsBody {snapshot} {kind} {scenario} {editable} />
	{/snippet}
</PageShell>
