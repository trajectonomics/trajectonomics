<script lang="ts">
import { queryParam, setQueryParam } from "../../../client/query-param.svelte.js"
import ChancePathPage from "../../../components/pages/ChancePathPage.svelte"
</script>

<svelte:head>
	<title>Future · Dashboard</title>
</svelte:head>

<ChancePathPage
	scenario={queryParam("scenario", "")}
	index={queryParam("index", "")}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
