<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import ComparePage from "../../components/pages/ComparePage.svelte"
</script>

<svelte:head>
	<title>Compare plans · Dashboard</title>
</svelte:head>

<ComparePage
	terms={queryParam("terms", "nominal")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
