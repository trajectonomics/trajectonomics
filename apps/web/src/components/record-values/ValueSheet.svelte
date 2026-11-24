<script lang="ts">
import { valueSheetSession as session } from "../../client/record-values.svelte.js"
import { savedView } from "../../lib/view/record-values/saved"
import type { ValueSheet } from "../../lib/view/record-values/types"
import Drawer from "../ui/Drawer.svelte"
import SavedValues from "./SavedValues.svelte"
import ValueForm from "./ValueForm.svelte"

interface Props {
	sheet: ValueSheet
}

let { sheet }: Props = $props()
const saved = $derived(session.saved === null ? null : savedView(session.saved, sheet))
</script>

<!-- Full width on a phone, a column on a wider screen. After a save it shows what traj stated, and Done closes it. -->
<Drawer open={session.open} title="Record today's values" onClose={() => session.close()}>
	<div class="min-w-0 space-y-6">
		{#if saved}
			<SavedValues view={saved} onDone={() => session.close()} />
		{:else}
			<ValueForm {sheet} />
		{/if}
	</div>
</Drawer>
