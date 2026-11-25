// Cloudflare Worker entry for moojot.trajectonomics.com. Logic lives in release.js:
// the Workers runtime treats every named export of this file as an entrypoint.
import { handle } from "./release.js";

export default {
  fetch: (request, env, ctx) => handle(request, env, ctx),
};
