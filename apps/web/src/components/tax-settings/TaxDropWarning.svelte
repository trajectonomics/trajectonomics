<script lang="ts">
import type { SharedDropWarning } from "../../lib/view/tax-settings/flags"
import MaskedAmount from "../ui/MaskedAmount.svelte"

interface Props {
	/** The words before the stored amount, the amount, and the words after it, so only the digits are masked. */
	warning: SharedDropWarning
}

let { warning }: Props = $props()
</script>

<!-- The sentence's words stay; Hide amounts hides only the stored amount's digits. -->
<p role="status" class="text-sm text-destructive">{warning.before}<MaskedAmount digits={warning.amount.digits} after={warning.amount.after} />{warning.after}</p>
