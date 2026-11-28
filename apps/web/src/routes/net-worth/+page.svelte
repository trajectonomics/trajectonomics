<script lang="ts">
import { queryParam } from "../../client/query-param.svelte.js"
import NetWorthPage from "../../components/pages/NetWorthPage.svelte"
</script>

<NetWorthPage scenario={queryParam("scenario", "")} />
