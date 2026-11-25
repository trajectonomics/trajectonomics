<script lang="ts">
import { figureOf } from "../../lib/view/what-if/figures"
import type { WhatIfLens } from "../../lib/what-if/lens"
import FigureList from "./FigureList.svelte"
import WhatIfPanel from "./WhatIfPanel.svelte"

interface Props {
	lens: WhatIfLens
}

/** The FI date of the what-if beside the baseline's, with the change in months the CLI states. */
let { lens }: Props = $props()
const triple = $derived(lens.compare === null ? null : figureOf(lens.compare, "fi"))
</script>

{#if triple}
	<WhatIfPanel plan={lens.plan} intro="The FI date with the session's changes.">
		<FigureList triples={[triple]} />
	</WhatIfPanel>
{/if}
