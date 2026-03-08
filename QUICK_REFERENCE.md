# Quick reference

## Adding wallpapers

- Drop image files into `wallpapers/` (`.jpg`, `.jpeg`, `.png`, `.webp`)
- Run `npm run generate:wallpapers`
- Thumbnails and metadata are generated automatically

## Author / naming

- Run the generator once, then open `data/wallpaper-meta.json`
- Find the entry by **id** (slug, e.g. `wallpaper-1`); use **filename** to match when you added many at once
- Set `author`, `author_id`, `source` as needed; leave `added` and `filename` as-is
- Run `npm run generate:wallpapers` again so API JSON picks up the changes

## Deleting wallpapers

- Remove the image from `wallpapers/`
- Run `npm run generate:wallpapers`
- Script removes the entry from metadata and deletes the thumbnail

## Pushing to GitHub

- `cd` to this repo → `git init` (if needed) → `git remote add origin https://github.com/YOUR_ORG/indigo-virtual-wallpapers.git`
- `git add .` → `git commit -m "..."` → `git branch -M main` → `git push -u origin main`
- Set `REPO_OWNER` / `REPO_NAME` / `BRANCH` in `scripts/generate-wallpapers-json.js` to match your repo, then run `npm run generate:wallpapers` and commit `data/` if you want correct CDN URLs
