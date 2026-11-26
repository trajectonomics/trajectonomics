<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte"
import { milestoneTriples } from "../../lib/view/what-if/milestones"
import type { WhatIfLens } from "../../lib/what-if/lens"
import FigureList from "./FigureList.svelte"
import WhatIfPanel from "./WhatIfPanel.svelte"

interface Props {
	lens: WhatIfLens
}

/** Each Milestone's date in the what-if beside its baseline date, with the months the CLI states between them. */
let { lens }: Props = $props()
const triples = $derived(
	lens.compare === null ? [] : milestoneTriples(lens.compare, currentItemNames()),
)
</script>

{#if triples.length > 0}
	<WhatIfPanel plan={lens.plan} intro="When each milestone is reached with the session's changes.">
		<FigureList {triples} />
	</WhatIfPanel>
{/if}
