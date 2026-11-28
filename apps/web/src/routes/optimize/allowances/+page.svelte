<script lang="ts">
import { queryParam } from "../../../client/query-param.svelte.js"
import AllowancesPage from "../../../components/pages/AllowancesPage.svelte"
</script>

<AllowancesPage scenario={queryParam("scenario", "")} />
