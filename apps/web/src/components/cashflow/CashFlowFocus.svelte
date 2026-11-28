<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionRun } from "../../lib/contract"
import { chooseRollup, rollupsOf } from "../../lib/view/cashflow/cashflow"
import { cashflowFocusView } from "../../lib/view/cashflow/focus"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import Money from "../ui/Money.svelte"
import CashflowBar from "./CashflowBar.svelte"

interface Props {
	/** The projection run of the Scenario the page shows. */
	run: ProjectionRun
	/** The year the address bar asks for. An unknown one shows the first. */
	year: string
}

/** The page's focus point: the picked year as one bar of its uses, what is left over written above it. */
let { run, year }: Props = $props()
const focus = $derived(
	cashflowFocusView(chooseRollup(rollupsOf(run), year), run.currency, preferences.hidden),
)
</script>

{#if focus}
	<FocusPoint label={focus.label} tone={focus.short ? "warn" : "plain"}>
		{#snippet visual(tone)}
			<div class="flex min-h-[200px] w-full flex-col justify-center gap-2">
				<div class="flex min-w-0 items-baseline justify-end gap-2">
					<FocusAnswer {tone}><Money
							amount={focus.answer}
							currency={focus.currency}
							compact
						/></FocusAnswer>
					<span class="text-sm text-muted-foreground">{focus.short ? "short" : "left over"}</span>
				</div>
				<CashflowBar {focus} />
				<p class="text-xs text-muted-foreground">
					<Money amount={focus.moneyIn} currency={focus.currency} compact /> in
				</p>
			</div>
		{/snippet}
	</FocusPoint>
{/if}
