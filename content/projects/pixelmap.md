---
title: Pixelmap engine
slug: pixelmap
summary: A pixel-mapping renderer that takes fixture geometry as input and outputs sACN, with power budgeting built into the render loop.
status: shipping
year: 2026
order: 1
featured: true
stack: [C++, GLSL, sACN, Art-Net]
---

## What it does

Takes a physical fixture layout — strips, panels, arbitrary point clouds — and
renders realtime content onto it, sampling a texture per pixel position rather
than treating each fixture as a separate video surface. Output goes out as
sACN/E1.31 or Art-Net.

## Why it exists

Off-the-shelf pixel mappers assume your fixtures form rectangles. Scenic LED
rarely does. A staircase handrail, a hanging matrix with gaps in it, a dome —
each needs the content sampled at the *real* position of each pixel, which means
geometry has to be first-class input, not a grid approximation.

## Notable pieces

- **Geometry from CSV or JSON.** Each pixel carries a position, a universe and a
  channel offset. Layouts come out of the same spreadsheet used to order cable.
- **Power budgeting in the loop.** Total draw is computed per frame and the
  output is scaled to stay under a configured ceiling, so a white frame browns
  nothing out. Scaling is perceptual, not linear.
- **Per-zone frame rates.** Slow architectural zones run at 30 fps while strobe
  zones run at 60, cutting packet rate without a visible cost.
- **Unicast or multicast per node**, because the switch in the rack is not
  always the switch you specified.

## Status

In use on live work. The geometry format and the power-budget stage are the
parts I would call finished; the patch editor is still a text file.
