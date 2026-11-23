<script lang="ts">
import { queryParam } from "../../../client/query-param.svelte.js"
import AllowancesPage from "../../../components/pages/AllowancesPage.svelte"
</script>

<svelte:head>
	<title>Tax allowances · Dashboard</title>
</svelte:head>

<AllowancesPage scenario={queryParam("scenario", "")} />
