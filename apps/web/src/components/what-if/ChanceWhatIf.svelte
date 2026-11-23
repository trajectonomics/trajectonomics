<script lang="ts">
import type { ProjectionChance } from "../../lib/contract"
import { chanceTriple } from "../../lib/view/what-if/chance"
import type { WhatIfLens } from "../../lib/what-if/lens"
import ChanceFigure from "./ChanceFigure.svelte"
import WhatIfPanel from "./WhatIfPanel.svelte"

interface Props {
	lens: WhatIfLens
	/** The plan's own chance read in the Snapshot, or null when it holds none. */
	baseline: ProjectionChance | null
}

/** The what-if's success share beside the baseline's, as two values: "from 72.00% to 81.00%". */
let { lens, baseline }: Props = $props()
const chance = $derived(lens.chance === null ? null : chanceTriple(lens.chance, baseline))
</script>

{#if chance}
	<WhatIfPanel plan={lens.plan} intro="The chance of success with the session's changes.">
		<ChanceFigure {chance} />
	</WhatIfPanel>
{/if}
