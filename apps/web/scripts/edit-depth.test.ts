import { afterAll, describe, expect, test } from "bun:test"
import { MAX_BODY_DEPTH } from "../src/lib/edit/depth"
import { disposeEditor, SLOW_MS, setupEditor } from "./edit-fixture.test-support"
import { editRequest } from "./edit-request.test-support"

describe("POST /edit refuses a body that nests too deep", () => {
	// The Edit is valid in every field but one Set's value, which nests: only the depth cap refuses it, so a
	// test with the cap removed sees zod's own RangeError (a 100000-deep value) or a 200 (a 33-deep one).
	const deepEdits: [string, (value: string) => string][] = [
		[
			"apply-overrides",
			(value) =>
				`{"kind":"apply-overrides","name":"base","contentHash":"jcs1:sha256:${"ab".repeat(32)}","sets":[{"path":"flows.x","value":${value}}],"removals":[]}`,
		],
		[
			"copy-plan",
			(value) =>
				`{"kind":"copy-plan","from":"base","name":"deep-copy","sets":[{"path":"flows.x","value":${value}}],"removals":[]}`,
		],
	]
	for (const [kind, body] of deepEdits) {
		for (const depth of [100_000, MAX_BODY_DEPTH + 1]) {
			test(
				`a ${kind} whose Set value nests ${depth} levels deep is refused with 400 in the server's own JSON, not a 500 page`,
				async () => {
					const editing = await setupEditor()
					const deep = body(`${"[".repeat(depth)}${"]".repeat(depth)}`)
					const response = await editing.edit(editRequest({}, deep), 4321)
					expect(response.status).toBe(400)
					expect(response.headers.get("content-type")).toContain("application/json")
					expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
						"invalid_edit",
					)
				},
				SLOW_MS,
			)
		}
	}
})

afterAll(disposeEditor)
