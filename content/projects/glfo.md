---
title: glfo
slug: glfo
summary: A live video performance framework for Pure Data and GEM, organised as sets, scenes and presets. The predecessor of vlfo.
status: archived
year: 2013
order: 8
stack: [Pure Data, GEM, OpenGL]
repo: https://github.com/pixeldestrukt/glfo
---

## What it does

glfo gives Pure Data/GEM a set of modulation sources for building interactive
visual instruments, and a structure for putting several of them together into a
performance.

- **Sets** are the unit of performance. A set is loaded at the start of a show
  and launches everything else.
- **Scenes** are the segments you transition between. Each is a self-contained
  OpenGL render chain drawn into a framebuffer, which the set can then map as a
  texture onto a card.
- **Presets** store a scene's state, so the values that initialise it, or change
  it drastically once it's running, can be recalled.

## Status

Built in 2013 against Pd-extended. Its ideas carry on in [vlfo](/work/vlfo/),
which keeps the Pd side of a scene and moves the drawing into shaders. vlfo
ships a drop-in for glfo's `param` abstraction, and GEM world units carry over,
so old scenes can be ported.
