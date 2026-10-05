# Pigment — paint mixing helper

A tiny web tool with two jobs:

1. **Find a recipe** — pick a target color, get a pigment mixing recipe (with ratios) from a 12-pigment acrylic palette.
2. **Shift a color** — enter the color you've already mixed and the color you want; it tells you which pigment to add and roughly how much.

## How it works

Each pigment is modeled as a reflectance spectrum (hand-tuned, 400–700nm). Mixing takes the weighted geometric mean of spectra — the standard approximation for real paint — then converts through CIE 1931 color math (Gaussian-fit color matching functions, D65 adaptation) to sRGB and Lab. Recipes are found by random-restart hill climbing over the pigment weight simplex, minimizing ΔE to the target.

## Honest limits

This is a toy model, not paint chemistry. Real pigments vary by brand, binder, and batch. Treat every ratio as a starting point: mix a test batch and judge by eye.

## Run it

Open `index.html` in a browser, or use the GitHub Pages site. No build step, no dependencies.

## Palette

Titanium White, Ivory Black, Cadmium Yellow, Yellow Ochre, Cadmium Orange, Cadmium Red, Alizarin Crimson, Burnt Sienna, Burnt Umber, Ultramarine Blue, Phthalo Blue, Phthalo Green.
