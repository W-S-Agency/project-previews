# project-previews

Client preview deliverables for 2Penguins / WS Agency.

> ⚠️ **Active content lives on the `gh-pages` branch** — that is the live branch
> served by GitHub Pages.
>
> ➡️ **https://w-s-agency.github.io/project-previews/**

This `main` branch is intentionally a **pointer only** and is no longer the
default branch. Do **not** push previews here — they would not be published.

To publish a preview, push to `gh-pages`:

```bash
git checkout gh-pages
# add  <project>/  files (each folder needs an index.html)
git add <project>/
git commit -m "Add <project> preview"
git push origin gh-pages
```

URL pattern: `https://w-s-agency.github.io/project-previews/<project>/`

The previous content of this `main` branch is preserved in git history
(restore any file with `git checkout <old-sha> -- <path>`).
