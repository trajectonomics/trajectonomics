import { z } from "zod"

/** A safe integer, the CLI's count, index, basis-point and age shape. */
export const integer = z.number().int().safe()
