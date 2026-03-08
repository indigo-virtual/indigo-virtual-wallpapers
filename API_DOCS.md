# Wallpaper API — Consumer Documentation

How to retrieve wallpapers from the static API in your app. All data is served via **jsDelivr CDN** as JSON; image and thumbnail URLs in responses are full CDN URLs and can be used directly.

---

## Base URL

```
https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/
```

**Example** (replace with your repo):

```
https://cdn.jsdelivr.net/gh/indigo-virtual/indigo-virtual-wallpapers@main/
```

API JSON files live under the `data/` path.

---

## Endpoints

| Endpoint | Method | Description |
| -------- | ------ | ------------ |
| `data/index.json` | GET | Index: total count, page count, page size, list of page filenames, latest feed filename |
| `data/latest.json` | GET | Newest 20 wallpapers (no pagination) |
| `data/page-{N}.json` | GET | One page of wallpapers (50 per page, 1-based). Page 1 = newest |

All responses are JSON. No authentication required.

---

## 1. Get index

**URL:** `{base}/data/index.json`

**Example:** `https://cdn.jsdelivr.net/gh/indigo-virtual/indigo-virtual-wallpapers@main/data/index.json`

**Response:**

```json
{
  "total_wallpapers": 320,
  "total_pages": 7,
  "page_size": 50,
  "latest": "latest.json",
  "pages": ["page-1.json", "page-2.json", "page-3.json", "page-4.json", "page-5.json", "page-6.json", "page-7.json"]
}
```

| Field | Type | Description |
| ----- | ---- | ------------ |
| `total_wallpapers` | number | Total number of wallpapers |
| `total_pages` | number | Number of paginated pages |
| `page_size` | number | Wallpapers per page (50) |
| `latest` | string | Filename of the latest feed (`"latest.json"`) |
| `pages` | string[] | List of page filenames in order (`page-1.json` = newest) |

Use this to know how many pages exist and to build URLs for `latest.json` and `page-N.json`.

---

## 2. Get latest wallpapers (homepage feed)

**URL:** `{base}/data/latest.json`

**Example:** `https://cdn.jsdelivr.net/gh/indigo-virtual/indigo-virtual-wallpapers@main/data/latest.json`

**Response:**

```json
{
  "wallpapers": [
    {
      "id": "wallpaper-1",
      "image": "https://cdn.jsdelivr.net/gh/indigo-virtual/indigo-virtual-wallpapers@main/wallpapers/wallpaper-1.png",
      "thumbnail": "https://cdn.jsdelivr.net/gh/indigo-virtual/indigo-virtual-wallpapers@main/thumbnails/wallpaper-1.png",
      "author": "Nikolas Bartek",
      "author_id": "IGO1113",
      "resolution": "1920x1080",
      "source": "",
      "added": "2026-03-08T16:24:18.545Z"
    }
  ]
}
```

Contains the **20 most recently added** wallpapers. Sorted newest first. No pagination—use for a “Latest” or homepage feed.

---

## 3. Get a page of wallpapers

**URL:** `{base}/data/page-{N}.json`  
**N** = page number (1-based). Page 1 = newest 50.

**Examples:**
- Page 1 (newest): `https://cdn.jsdelivr.net/gh/indigo-virtual/indigo-virtual-wallpapers@main/data/page-1.json`
- Page 2: `.../data/page-2.json`

**Response:**

```json
{
  "wallpapers": [
    {
      "id": "wallpaper-1",
      "image": "https://cdn.jsdelivr.net/gh/indigo-virtual/indigo-virtual-wallpapers@main/wallpapers/wallpaper-1.png",
      "thumbnail": "https://cdn.jsdelivr.net/gh/indigo-virtual/indigo-virtual-wallpapers@main/thumbnails/wallpaper-1.png",
      "author": "Nikolas Bartek",
      "author_id": "IGO1113",
      "resolution": "1920x1080",
      "source": "",
      "added": "2026-03-08T16:24:18.545Z"
    }
  ]
}
```

Each page has up to **50** wallpapers, sorted **newest first** by `added`.

---

## Wallpaper object

Every wallpaper in `latest.json` and `page-N.json` has this shape:

| Field | Type | Description |
| ----- | ---- | ------------ |
| `id` | string | Stable slug (e.g. `wallpaper-1`, `sunset-lake`) |
| `image` | string | Full CDN URL of the full-resolution image |
| `thumbnail` | string | Full CDN URL of the thumbnail (400px width) |
| `author` | string | Display name (default `"Unknown"`) |
| `author_id` | string | Optional author identifier (may be `""`) |
| `resolution` | string | e.g. `"1920x1080"` |
| `source` | string | Optional attribution URL (may be `""`) |
| `added` | string | ISO 8601 timestamp when the wallpaper was added |

Use `image` for full-size and `thumbnail` for lists/grids. Both URLs are ready to use in `<img src="...">` or equivalent.

---

## Usage from your project

### Configuration

Define the API base once (e.g. in config or env):

```javascript
const WALLPAPER_API_BASE = "https://cdn.jsdelivr.net/gh/indigo-virtual/indigo-virtual-wallpapers@main";
```

### Fetch index

```javascript
const res = await fetch(`${WALLPAPER_API_BASE}/data/index.json`);
const index = await res.json();
// index.total_wallpapers, index.total_pages, index.pages, index.latest
```

### Fetch latest (e.g. homepage)

```javascript
const res = await fetch(`${WALLPAPER_API_BASE}/data/latest.json`);
const { wallpapers } = await res.json();
// wallpapers = array of 20 newest wallpaper objects
```

### Fetch a specific page

```javascript
const pageNum = 1; // or 2, 3, ...
const res = await fetch(`${WALLPAPER_API_BASE}/data/page-${pageNum}.json`);
const { wallpapers } = await res.json();
// wallpapers = up to 50 wallpaper objects, newest first
```

### Pagination flow

1. GET `data/index.json` → read `total_pages` and `pages`.
2. To show “latest” only: GET `data/latest.json`.
3. To show full catalog: GET `data/page-1.json`, `data/page-2.json`, … using the filenames in `index.pages` or building `page-${n}.json` for `n = 1 .. total_pages`.

### TypeScript types (optional)

```typescript
interface Wallpaper {
  id: string;
  image: string;
  thumbnail: string;
  author: string;
  author_id: string;
  resolution: string;
  source: string;
  added: string; // ISO 8601
}

interface IndexResponse {
  total_wallpapers: number;
  total_pages: number;
  page_size: number;
  latest: string;
  pages: string[];
}

interface WallpapersResponse {
  wallpapers: Wallpaper[];
}
```

---

## Caching

jsDelivr serves with cache headers. To always get fresh data after a repo update, you can:

- Pin by commit SHA in the URL: `...@<sha>/data/...` (e.g. from GitHub API or your CI).
- Or use `@main` and rely on jsDelivr’s cache TTL for “good enough” freshness.

---

## Error handling

- **404:** File or repo path wrong; check base URL and branch.
- **Non-200:** Check repo is public and the branch exists.
- **Empty `wallpapers`:** Valid; catalog is empty.

Example:

```javascript
const res = await fetch(`${WALLPAPER_API_BASE}/data/latest.json`);
if (!res.ok) throw new Error(`Wallpaper API error: ${res.status}`);
const data = await res.json();
const wallpapers = data.wallpapers ?? [];
```
