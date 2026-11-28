<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import EstatePage from "../../components/pages/EstatePage.svelte"
import { estateChoice } from "../../lib/view/estate"

/** The Estate's own date: `?estate=`, with an old `?at=` link read in its place (web ADR 0033). */
const estate = $derived(estateChoice(queryParam("estate", ""), queryParam("at", "")))
</script>

<EstatePage
	scenario={queryParam("scenario", "")}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
	at={estate}
	onAt={(value) => setQueryParam("estate", value)}
/>
