<script lang="ts">
import Money from "../ui/Money.svelte"
import WasText from "../what-if/WasText.svelte"

interface Props {
	/** What the Account was charged over the whole plan, as `traj` states it; null when it states none. */
	fees: string | null
	/** What the Account paid out over the whole plan, as `traj` states it; null when it states none. */
	payouts: string | null
	/** The baseline's figure beside a tried one: undefined when the session left it alone, "" when the baseline stated none. */
	wasFees?: string | undefined
	wasPayouts?: string | undefined
	currency: string
}

/** The engine's totals for one Account over the whole plan, drawn as stated: the page adds nothing (web ADR 0002, ADR 0017). */
let { fees, payouts, wasFees, wasPayouts, currency }: Props = $props()
</script>

{#if fees !== null || payouts !== null}
	<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
		{#if payouts !== null}
			<dt class="text-muted-foreground">Paid out over the plan</dt>
			<dd><Money amount={payouts} {currency} /><WasText was={wasPayouts === "" ? undefined : wasPayouts} money {currency} /></dd>
		{/if}
		{#if fees !== null}
			<dt class="text-muted-foreground">Fees over the plan</dt>
			<dd><Money amount={fees} {currency} /><WasText was={wasFees === "" ? undefined : wasFees} money {currency} /></dd>
		{/if}
	</dl>
{/if}
