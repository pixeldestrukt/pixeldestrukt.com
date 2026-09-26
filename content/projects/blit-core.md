---
title: bl1t core
slug: blit-core
summary: The realtime graphics engine behind my performance work — a shader-graph compositor with MIDI-mapped control and no startup wizard.
status: ongoing
year: 2026
order: 2
featured: true
stack: [C++, GLSL, OSC, MIDI, NDI]
---

## What it does

Runs a graph of GLSL passes at frame rate, composites them, and sends the result
to screen, capture or NDI. Every meaningful parameter is exposed for MIDI or OSC
control, and the whole state is a file you can diff.

## Design rules

The engine exists because the commercial tools make a trade I do not want: they
optimise for the first fifteen minutes and against the thousandth hour. So:

- **No modal dialogs.** Anything that can block the render thread on a human is
  a bug.
- **Text state.** The set is a file. It goes in git. A show's look is
  reproducible a year later.
- **Hot reload.** Shaders recompile on save; a compile error keeps the previous
  program bound and prints to an overlay rather than dropping to black.
- **Fixed frame budget.** Passes that overrun are reported by name, so the
  answer to "why is this dropping frames" takes seconds rather than an evening.

## Interop

Reads Syphon/Spout in, publishes NDI out, speaks OSC both directions, and loads
ISF-compatible shaders so the large body of existing work is not stranded.

## Status

Continuously in progress and continuously used, which is the only development
model I trust for performance software. Not currently packaged for anyone else
to run.
