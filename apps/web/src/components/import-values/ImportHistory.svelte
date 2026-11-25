<script lang="ts">
import { importSession } from "../../client/import-values.svelte.js"
import type { ValueSheet } from "../../lib/view/record-values/types"
import ImportWizard from "./ImportWizard.svelte"
import { BUTTON } from "./styles"

interface Props {
	sheet: ValueSheet
}

let { sheet }: Props = $props()
</script>

<!-- The button that opens the import wizard; its drawer is the wizard. Shown with the sheet's button, so only where an Edit is. -->
<button
	type="button"
	onclick={() => importSession.show()}
	class={BUTTON}
>
	Import a balance history
</button>
<ImportWizard {sheet} />
