---
title: vlfo
slug: vlfo
summary: Video LFO. ISF shaders driven from Pure Data over OSC, live in a window, rendered offline at any size, or published over NDI.
status: ongoing
year: 2026
order: 2
featured: true
stack: [Rust, wgpu, ISF, GLSL, OSC, Pure Data, NDI]
repo: https://github.com/pixeldestrukt/vlfo
---

## What it does

Loads an ISF shader and makes every one of its inputs a knob. Each input is
reachable over OSC as `/vlfo/<NAME>`, so a Pure Data patch can drive it with
LFOs the way it would drive a synth. The same shader runs live in a window,
renders offline to PNG frames at any size, or streams out over NDI.

```sh
vlfo run shaders/vlfo-test.fs             # live window, OSC on udp 9000
vlfo render shaders/vlfo-test.fs -o out --frames 300 --fps 30 --size 4800x7200
vlfo serve shaders/vlfo-test.fs --ndi vlfo-1 --output 1920x1080 --fps 60
```

It is the successor to [glfo](/work/glfo/), my old Pd/GEM performance
framework. The Pd side of a scene stays in Pd; only the drawing becomes a
shader.

## How it works

- **Shaders as patches.** `vlfo inputs --pd shader.fs` writes a Pd control panel
  with a number box, toggle or bang per input, already wired up. Shaders reload
  on save and keep their current input values. A shader that fails to compile is
  reported and the previous one keeps running.
- **Node graphs.** A `.vlfo` file describes a shader as chains of nodes, one per
  line, GEM-style: transforms (translate, rotate, grid, mirror), a shape (rect,
  circle, ring), then paint (hsv, alpha, outline). Every numeric literal becomes
  an OSC input automatically. Coordinates are GEM world units, so numbers from
  old glfo scenes carry over.
- **Deterministic rendering.** Logical time is `frame / fps`, so a 4800×7200
  render is just slower, never sped up.
- **NDI without linking.** The NDI runtime is loaded at run time. Render
  resolution is independent of the preview window, and if the sender falls
  behind, frames are dropped with a warning rather than stalling the renderer.

## Status

First slice: one ISF shader per process, headless rendering, NDI out, and
`vlfo check` for testing which files from the public Vidvox ISF corpus translate
through naga. Multi-pass `PASSES`, persistent buffers, image inputs, layers and
audio are not in yet.
