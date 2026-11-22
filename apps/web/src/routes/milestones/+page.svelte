<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import MilestonesPage from "../../components/pages/MilestonesPage.svelte"
</script>

<svelte:head>
	<title>Milestones · Dashboard</title>
</svelte:head>

<MilestonesPage
	scenario={queryParam("scenario", "")}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
