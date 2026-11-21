<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import TaxPage from "../../components/pages/TaxPage.svelte"
</script>

<svelte:head>
	<title>Tax · Dashboard</title>
</svelte:head>

<TaxPage scenario={queryParam("scenario", "")} onScenario={(name) => setQueryParam("scenario", name)} />
