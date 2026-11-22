import { z } from "zod"
import type { DocumentSpec, Leaf } from "../command"
import { defineCommand, ok } from "../command"
import { registryListing } from "../error-listing"
import { fail } from "../errors"
import { NOT_SUPPORTED } from "../schema/limits"
import { detailSchema, listingSchema } from "../schema/output"
import { findNode, leavesOf, pathWords } from "../tree"

/** The document form as `traj schema` prints it: its flag, its schema and its alternate form (ADR-0047). */
function documentDetail(document: DocumentSpec) {
	const alternate = document.alternate
	return {
		flag: document.flag,
		schema: z.toJSONSchema(document.schema, { io: "input" }),
		...(document.required === undefined
			? {}
			: { required: document.required.map((entry) => entry.field) }),
		...(alternate === undefined
			? {}
			: {
					alternate: {
						flag: alternate.flag,
						schema: z.toJSONSchema(alternate.schema, { io: "input" }),
					},
				}),
	}
}

export const schema: Leaf = defineCommand({
	name: "schema",
	summary: "Describe the commands and the error registry",
	positionals: ["path"],
	input: z.strictObject({
		path: z.array(z.string()).default([]).describe("A command or group path; omit to list all."),
	}),
	output: z.union([listingSchema(), detailSchema()]),
	examples: [
		{
			command: "traj schema",
			description: "List commands, every error code and what this version does not support.",
		},
		{ command: "traj schema init --json", description: "Show the input and output of init." },
	],
	errorCodes: ["unknown_command"],
	run: (input, ctx) => {
		const path = pathWords(input.path)
		const node = findNode(ctx.root, path)
		if (!node) {
			return fail("unknown_command", {
				message: `Unknown command: ${path.join(" ")}`,
				hint: 'Run "traj schema" to list commands.',
			})
		}
		const placed = leavesOf(node, [...path])
		if (node.kind === "group") {
			const commands = placed.map(({ path, leaf }) => ({
				name: path.join(" "),
				summary: leaf.summary,
			}))
			return ok(
				path.length === 0
					? { commands, errors: registryListing(), notSupported: [...NOT_SUPPORTED] }
					: { commands },
			)
		}
		const document = node.document === undefined ? {} : { document: documentDetail(node.document) }
		const documents =
			node.flagDocuments === undefined
				? {}
				: {
						flagDocuments: node.flagDocuments.map((entry) => ({
							flag: entry.flag,
							schema: z.toJSONSchema(entry.schema, { io: "input" }),
						})),
					}
		return ok({
			name: path.join(" "),
			summary: node.summary,
			...(node.description === undefined ? {} : { description: node.description }),
			positionals: [...node.positionals],
			input: z.toJSONSchema(node.input, { io: "input" }),
			...document,
			...documents,
			output: z.toJSONSchema(node.output, { io: "output" }),
			examples: node.examples.map((example) => ({ ...example })),
			errorCodes: [...node.errorCodes].sort(),
		})
	},
})
