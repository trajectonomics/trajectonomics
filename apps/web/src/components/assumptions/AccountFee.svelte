<script lang="ts">
import { ROUNDING_CHOICES } from "../../lib/view/withdrawals/options"
import Field from "../plan-items/Field.svelte"

interface Props {
	/** The Account's id, which names each field. */
	id: string
	/** The share and how each monthly charge rounds, as the Account form's fee section holds them. */
	rate: string
	rounding: string
	/** The problems at this Account's fee fields, found by the keys the Account form uses. */
	rateProblem: string | undefined
	roundingProblem: string | undefined
	disabled?: boolean
}

let {
	id,
	rate = $bindable(),
	rounding = $bindable(),
	rateProblem,
	roundingProblem,
	disabled = false,
}: Props = $props()
</script>

<!-- The yearly fee of the Account form, here beside the return it comes off. Empty is no fee; the share is the person's own estimate. -->
<div class="grid gap-4 sm:grid-cols-2">
	<Field id="fee-rate-{id}" label="Fee a year" inputmode="decimal" hint="A percent, such as 1.5. Empty is no fee." bind:value={rate} problem={rateProblem} {disabled} />
	<Field id="fee-rounding-{id}" label="Each monthly charge rounds" options={ROUNDING_CHOICES} bind:value={rounding} problem={roundingProblem} {disabled} />
</div>
