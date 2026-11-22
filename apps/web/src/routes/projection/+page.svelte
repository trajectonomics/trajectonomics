<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import ProjectionPage from "../../components/pages/ProjectionPage.svelte"
</script>

<svelte:head>
	<title>Overview · Dashboard</title>
</svelte:head>

<ProjectionPage
	scenario={queryParam("scenario", "")}
	onScenario={(value) => setQueryParam("scenario", value)}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
