---
title: Art-Net visualizer
slug: artnet-visualizer
summary: A window that stands in for a 64×64 LED matrix. It listens for Art-Net and draws what the panel would show, so you can work without the hardware.
status: shipping
year: 2026
order: 7
stack: [Python, pygame, numpy, Art-Net]
repo: https://github.com/pixeldestrukt/artnet-visualizer
---

## What it does

Listens on UDP 6454, collects the DMX data from each universe, concatenates the
universes in order and maps them onto a 64×64 grid. A panel that size needs
about 24 universes at 170 RGB pixels each. Each LED is drawn as a small square
with a gap, so it reads like the real matrix.

Any Art-Net source works: TouchDesigner, MadMapper, xLights, or the
[Blender bake](/work/blender-artnet-textures/). Point it at the machine
running the visualizer, starting at universe 0.

```sh
python visualizer.py
```

Panel size, pixel size and starting universe are constants at the top of the
script. `c` clears the buffer and `d` prints the universes and channel counts
it has seen.
