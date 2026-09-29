---
title: voxeled
slug: voxeled
summary: Open volumetric LED show control — describe a piece once (every LED's position, normal and wiring), see it as it will really look, drive it over Art-Net / DDP / sACN, and let other tools perform through it.
status: ongoing
year: 2026
order: 0
featured: true
stack: [JavaScript, three.js, WebGL, Art-Net, DDP, sACN, Node]
repo: https://github.com/pixeldestrukt/voxeled
---

## What it does

An LED sculpture is a lot of pixels in space, each pointing somewhere. voxeled keeps that as
the *map* — position **and emission normal** for every LED, in millimetres — plus the wiring, in
one small layout file, and builds everything else on top: a 3D viewer, a **simulator** that
renders each LED as an emitter (viewing angle, dark backsides, the steel blocking light), spatial
**patterns** that move through the piece in real units, a **builder** for placing fixtures by
dragging, and real output over Art-Net, DDP, sACN and my own dan-mx. Other tools — a console,
xLights, TouchDesigner, a web page — can drive it at the same time, merged per pixel by priority.

**[Live demo](https://pixeldestrukt.github.io/voxeled/viewer/?example=columns&sim=1)**: runs
entirely in your browser. Press **S** for the simulator, **E** to drag the columns around,
**P** to see the layout that made it. **[Getting started](https://pixeldestrukt.github.io/voxeled/docs/START.html)**
walks through using it for your own LEDs — drop in a panel, a strip, a CAD model or a Blender
export; nothing is uploaded, your files stay in the browser.

## Why it exists

Every LED piece I've built ended up with its own one-off three.js visualizer and its own
hand-rolled mapping script, and none of the existing tools fit: the sequencers think in 2D
buffers draped on shapes, the art engines keep points with no orientation, the pro media servers
are closed and priced per universe, and none of them let another tool perform *through* them.
The thing that was missing is unglamorous: an open house system that owns the map and the patch
and gets out of the way.

## How it works

- **The layout is the source of truth.** Fixtures (a rolled panel, a rope along a path, a CAD
  model with the chips modelled, a baked export) placed as instances; arrays and rings from one
  line; structures — the sculpture's own CAD — drawn around the LEDs and used as occluders.
- **Normals are first-class.** They come from the geometry (a parametrization, the chip's thin
  axis, a rope's radial direction), so the simulator can show what a strip looks like from
  behind, and patterns like a lantern carried through the room can light only the sides that
  face it.
- **One frame, everywhere.** The hub renders once and fans the identical bytes to the browser
  and to the wire, so the preview is what the LEDs do.
- **No server needed to author.** The whole pipeline is plain modules; the hosted page runs the
  hub in the browser and keeps projects in IndexedDB. The Node hub is only needed for UDP.
- **Inputs merge.** Art-Net, sACN, DDP, TCP and WebSocket sources at once, per-pixel priority /
  HTP / LTP, timeouts and failover to the internal show — the real-controller wiring (which
  universe is which string, strips wired from both ends) is data in the layout.

## Status

Authoring works end to end and is documented; the Möbius LED Heart, the Thread spiral sculpture
(7,200 LEDs on twelve ropes derived from the steel) and a floor of rolled-panel columns are the
pieces it's been built against. Ahead: the camera automapper, chip timing simulation, GDTF/MVR,
and hosting a piece's public face — QR interaction and collaborative patterns — on the same page.
