import { OAUTH_CLIENTS, type OAuthClientDefinition } from "./clients"
import { OAUTH_RESOURCES } from "./resources"

export type ClientManifestProblem = {
	clientId: string
	problem: string
}

/** Checks the invariants the gate requires; the generator and the tests call it. */
export function clientManifestProblems(
	clients: readonly OAuthClientDefinition[] = OAUTH_CLIENTS,
): ClientManifestProblem[] {
	const problems: ClientManifestProblem[] = []
	const seen = new Set<string>()
	for (const client of clients) {
		problems.push(...clientIdProblems(client, seen))
		problems.push(...resourceProblems(client))
		problems.push(...grantProblems(client))
	}
	return problems
}

function clientIdProblems(
	client: OAuthClientDefinition,
	seen: Set<string>,
): ClientManifestProblem[] {
	const problems: ClientManifestProblem[] = []
	if (!/^[A-Za-z0-9._~-]+$/.test(client.clientId)) {
		problems.push(problem(client, "client id is not a plain public id"))
	}
	if (seen.has(client.clientId)) problems.push(problem(client, "client id is duplicated"))
	seen.add(client.clientId)
	return problems
}

function resourceProblems(client: OAuthClientDefinition): ClientManifestProblem[] {
	const resource = OAUTH_RESOURCES.find((candidate) => candidate.identifier === client.resource)
	if (resource === undefined) {
		return [problem(client, `resource ${client.resource} is not registered`)]
	}
	return client.scopes
		.filter((scope) => !resource.allowedScopes.includes(scope))
		.map((scope) => problem(client, `scope ${scope} is not allowed for ${client.resource}`))
}

function grantProblems(client: OAuthClientDefinition): ClientManifestProblem[] {
	const problems: ClientManifestProblem[] = []
	if (client.applicationType === "web" && !client.requirePkce) {
		problems.push(problem(client, "a web client must require PKCE"))
	}
	if (client.grantTypes.includes("authorization_code") && !client.responseTypes.includes("code")) {
		problems.push(problem(client, "an authorization-code client must allow the code response"))
	}
	return problems
}

function problem(client: OAuthClientDefinition, text: string): ClientManifestProblem {
	return { clientId: client.clientId, problem: text }
}
