<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import ComparePage from "../../components/pages/ComparePage.svelte"
</script>

<ComparePage
	terms={queryParam("terms", "nominal")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
