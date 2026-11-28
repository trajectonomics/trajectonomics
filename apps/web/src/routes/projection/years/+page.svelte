<script lang="ts">
import { queryParam, setQueryParam } from "../../../client/query-param.svelte.js"
import PlanYearsPage from "../../../components/pages/PlanYearsPage.svelte"
</script>

<PlanYearsPage
	scenario={queryParam("scenario", "")}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
