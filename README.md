# 64 Pixels, Ten Identities — Initial Prototype

DSC 209R Final Project prototype by Krishna Kanth Kodanganti.

## Research question

**How do 64 pixel-intensity values capture the visual structure of handwritten digits, and where do different digit identities begin to overlap?**

This is a D3.js explorable-explanation prototype using the public Optical Recognition
of Handwritten Digits dataset distributed through scikit-learn/UCI.

## What is already implemented

- Interactive 8×8 pixel explorer with real handwritten samples
- Hoverable exact pixel intensities
- D3 PCA “Digit Galaxy” of all 1,797 samples
- Hover glyph preview in the galaxy
- Digit filtering
- Explicit selection mode with rectangular brushing
- Dynamic selected-label composition
- Dynamic average glyph for the brushed neighborhood
- Two-digit average-shape comparison
- Interactive pixel-difference heatmap
- AND–BUT–THEREFORE narrative structure
- Required prototype writeup on the web page
- Responsive layout for a typical laptop screen

## Dataset

- 1,797 real handwritten samples
- Labels 0–9
- 64 pixel-intensity features
- 8×8 image representation
- Pixel intensities from 0 to 16
- Not synthetic

Dataset documentation:
https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_digits.html

UCI source:
https://archive.ics.uci.edu/dataset/80/optical+recognition+of+handwritten+digits

## Local testing

The site loads `data/digits.csv`, so use a local server instead of opening
`index.html` directly.

With VS Code Live Server:
1. Open this repository folder.
2. Open `index.html`.
3. Click **Go Live**.

## GitHub Pages setup

Recommended repository name:

`handwriting-geometry`

Push these files to the repository root, then enable:

Settings → Pages → Deploy from a branch → `main` → `/(root)`

Expected URL:

https://krishnakanth172.github.io/handwriting-geometry/

## Before Canvas submission

Verify:
- Page does not 404.
- Repo is public.
- Pixel explorer works.
- Galaxy hover works.
- Digit filters work.
- Selection mode + brush works.
- Comparison selectors work.
- Prototype writeup appears on the page.
