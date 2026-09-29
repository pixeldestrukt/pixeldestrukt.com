---
title: Blender Art-Net bake
slug: blender-artnet-textures
summary: Blender as a lighting engine for an LED panel. Cycles bakes the light falling on a surface into the panel's pixel grid, and a script sends it out as Art-Net.
status: prototype
year: 2026
order: 6
stack: [Python, Blender, Cycles, Art-Net]
repo: https://github.com/pixeldestrukt/blender-artnet-textures
---

## What it does

A plane in a Blender scene stands in for a physical LED panel, and its UV map
matches the panel's pixel grid. Lights in the scene light the plane like any
other object. The script then:

1. **Bakes** all incident light on the plane with Cycles
   (`bake(type='COMBINED')`) into a texture the size of the panel, 64×64 by
   default. Direct and indirect light, shadows and material response are all in
   it.
2. **Reads the pixels back** as a numpy array and converts them to 8-bit RGB.
3. **Sends Art-Net**, packing the pixels into 512-byte universes (about 24 for a
   64×64 panel) over UDP.

UV baking needs no camera. Cycles evaluates the light at each point on the
surface, so the output is what the surface sees, not what a viewport sees.

## What didn't work

It isn't realtime. A Cycles bake is a full render pass, and even at 16 samples
it's too slow to loop. The bake also blocks Blender's main thread, so the UI
freezes on every pass and you can't drag a light and watch the panel follow.
EEVEE or OpenGL baking, or a separate background Blender process, are the
obvious next things to try.

Pixel order is plain linear, so serpentine-wired panels would need a remapping
step.
