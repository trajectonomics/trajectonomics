// Cloudflare Worker entry for the OpenJot paths on trajectonomics.com, and for the old
// hosts openjot.trajectonomics.com and moojot.trajectonomics.com, which redirect here.
// Logic lives in release.js: the Workers runtime treats every named export of this file as an
// entrypoint.
import { handle } from "./release.js";

export default {
  fetch: (request, env, ctx) => handle(request, env, ctx),
};
