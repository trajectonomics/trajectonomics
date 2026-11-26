<script lang="ts">
import type { Words } from "../../lib/view/words"
import Money from "../ui/Money.svelte"
import WasText from "../what-if/WasText.svelte"

interface Props {
	/** What the Account was charged over the whole plan, as `traj` states it; null when it states none. */
	fees: string | null
	/** What the Account paid out over the whole plan, as `traj` states it; null when it states none. */
	payouts: string | null
	/** The baseline's figure beside a tried one: undefined when the session left it alone, "" when the baseline stated none. */
	wasFees?: string | Words | undefined
	wasPayouts?: string | Words | undefined
	currency: string
}

/** The engine's totals for one Account over the whole plan, drawn as stated: the page adds nothing (web ADR 0002, ADR 0017). */
let { fees, payouts, wasFees, wasPayouts, currency }: Props = $props()
</script>

<!-- Only dt/dd pairs: the card's own <dl> holds them, so they line up with its other rows. -->
{#if payouts !== null || wasPayouts !== undefined}
	<dt class="text-muted-foreground">Paid out over the plan</dt>
	<dd>{#if payouts === null}None{:else}<Money amount={payouts} {currency} />{/if}<WasText was={wasPayouts} money={wasPayouts !== ""} {currency} /></dd>
{/if}
{#if fees !== null || wasFees !== undefined}
	<dt class="text-muted-foreground">Fees over the plan</dt>
	<dd>{#if fees === null}None{:else}<Money amount={fees} {currency} />{/if}<WasText was={wasFees} money={wasFees !== ""} {currency} /></dd>
{/if}
