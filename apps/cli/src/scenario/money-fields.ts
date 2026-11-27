import { z } from "zod"
import { scenarioDocument } from "./document-form"
import type { Node } from "./field-paths"

export * from "./field-paths"

/** The published schema of the minor-unit form, the one `traj schema scenario apply` prints. */
export const PUBLISHED: Node = z.toJSONSchema(scenarioDocument, { io: "input" }) as Node
