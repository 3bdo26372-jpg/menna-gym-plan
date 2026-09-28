# Menna Fit & Flourish

A responsive personal fitness dashboard built for Menna's balanced three-day strength program.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The interface is front-end only and uses local exercise GIF assets.

## Exercise library GIFs

The animated demos in `public/exercises/library/` (one per exercise and one per lighter alternative) are drawn by a script. After changing a movement in `scripts/generate_library_gifs.py`, regenerate them with:

```bash
pip install pillow
python3 scripts/generate_library_gifs.py
```
