# Upload to GitHub — Exact Commands

Use these commands to push this repo to your **public org repository**. Replace `YOUR_ORG` with your GitHub org name (e.g. `indigo-virtual`) and confirm the repo name matches.

---

## 1. Go to the project folder

```bash
cd /Users/arkosharma/Developer/IGO/indigo-virtual-wallpapers
```

---

## 2. Initialize Git (if not already a git repo)

```bash
git init
```

---

## 3. Add the GitHub remote

Use your org name and repo name. If the repo is `https://github.com/indigo-virtual/indigo-virtual-wallpapers`:

```bash
git remote add origin https://github.com/YOUR_ORG/indigo-virtual-wallpapers.git
```

Example for org `indigo-virtual`:

```bash
git remote add origin https://github.com/indigo-virtual/indigo-virtual-wallpapers.git
```

If you use SSH:

```bash
git remote add origin git@github.com:YOUR_ORG/indigo-virtual-wallpapers.git
```

---

## 4. Stage all files

```bash
git add .
```

---

## 5. First commit

```bash
git commit -m "Initial commit: wallpaper API with metadata generator"
```

---

## 6. Set main branch and push

If your default branch is `main`:

```bash
git branch -M main
git push -u origin main
```

If the repo already has content (e.g. a README created on GitHub), pull first:

```bash
git branch -M main
git pull origin main --rebase
git push -u origin main
```

---

## 7. Match CDN config (optional)

Ensure `scripts/generate-wallpapers-json.js` uses your real org and repo:

```js
const REPO_OWNER = "YOUR_ORG"; // e.g. indigo-virtual
const REPO_NAME = "indigo-virtual-wallpapers";
const BRANCH = "main";
```

Then regenerate metadata and commit:

```bash
npm run generate:wallpapers
git add data/
git commit -m "Regenerate API data with correct CDN URLs"
git push
```

---

## Quick copy-paste (fill in YOUR_ORG)

```bash
cd /Users/arkosharma/Developer/IGO/indigo-virtual-wallpapers
git init
git remote add origin https://github.com/YOUR_ORG/indigo-virtual-wallpapers.git
git add .
git commit -m "Initial commit: wallpaper API with metadata generator"
git branch -M main
git push -u origin main
```

After the first push, your API will be available at:

`https://cdn.jsdelivr.net/gh/YOUR_ORG/indigo-virtual-wallpapers@main/data/index.json`
