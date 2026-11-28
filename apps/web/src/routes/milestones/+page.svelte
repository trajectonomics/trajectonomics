<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import MilestonesPage from "../../components/pages/MilestonesPage.svelte"
</script>

<MilestonesPage
	scenario={queryParam("scenario", "")}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
