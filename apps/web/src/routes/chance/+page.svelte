<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import ChancePage from "../../components/pages/ChancePage.svelte"
</script>

<svelte:head>
	<title>Chance of success · Dashboard</title>
</svelte:head>

<ChancePage
	scenario={queryParam("scenario", "")}
	onScenario={(value) => setQueryParam("scenario", value)}
/>
