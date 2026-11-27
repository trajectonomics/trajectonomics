<script lang="ts">
import { queryParam, setQueryParam } from "../../../client/query-param.svelte.js"
import PlanYearsPage from "../../../components/pages/PlanYearsPage.svelte"
</script>

<svelte:head>
	<title>Year by year · Dashboard</title>
</svelte:head>

<PlanYearsPage
	scenario={queryParam("scenario", "")}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
