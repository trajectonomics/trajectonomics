# The README demo

`traj-demo.gif` is the terminal recording at the top of the root README. It runs `traj` 0.4.0
from npm against a fictional ledger in a new temp directory, so it never touches a real
`~/.traj`. Every figure is fictional and in THB.

To re-render it:

```bash
bash docs/demo/render.sh
```

`render.sh` needs [vhs](https://github.com/charmbracelet/vhs) (with `ttyd` and `ffmpeg`), `jq` and
Node. Scratch files and the browser that vhs downloads go under `~/.cache/demo-gif`, or
`DEMO_GIF_CACHE` when set.

- `demo.tape` is the script: what is typed, and what is hidden.
- `make-scenario.sh` writes the demo Scenario from the ledger's own account ids, which are
  generated per ledger.
- `render.sh` pins the release and runs the tape.

When the commands change, check every line against `traj help <command>` for 0.4.0 before
you re-render.
