<script lang="ts">
import { queryParam } from "../client/query-param.svelte.js"
import OverviewPage from "../components/pages/OverviewPage.svelte"
</script>

<svelte:head>
	<title>Overview · Dashboard</title>
</svelte:head>

<OverviewPage scenario={queryParam("scenario", "")} />
