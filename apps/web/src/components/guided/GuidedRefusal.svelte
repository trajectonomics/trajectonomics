<script lang="ts">
import FormAlert from "../ui/FormAlert.svelte"
import { BUTTON, HINT } from "./styles"

interface Props {
	/** The CLI's message when it refused the save, unchanged. */
	refusal: string
	/** The hint the CLI offers under its refusal. */
	hint: string | null
	/** Whether the refusal offers Reload, as a ledger that moved since the page read it does. */
	reloadable: boolean
	onReload: () => void
}

let { refusal, hint, reloadable, onReload }: Props = $props()
</script>

<div class="space-y-2">
	<FormAlert message={refusal} />
	{#if hint}<p class={HINT}>{hint}</p>{/if}
	{#if reloadable}<button type="button" class={BUTTON} onclick={onReload}>Reload</button>{/if}
</div>
