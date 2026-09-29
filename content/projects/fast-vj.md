---
title: fast-vj
slug: fast-vj
summary: A realtime VJ sampler for the Raspberry Pi 4. Fullscreen 1080p video with GLSL effects at 60fps, triggered over OSC and scripted in LuaJIT.
status: ongoing
year: 2026
order: 3
featured: true
stack: [C, GLSL, LuaJIT, OSC, Raspberry Pi]
repo: https://github.com/pixeldestrukt/fast-vj
---

## What it does

Plays a library of video clips, images and audio clips, triggered by OSC from
any controller, DAW or custom software, and runs GLSL fragment shader effects
over them. Live audio, from a microphone or a playing clip, is analysed with an
FFT and handed to the shaders as a texture. A LuaJIT patch with `on_frame(dt)`
and `on_osc(addr, val)` callbacks ties it together.

It is inspired by [Veejay](http://veejayhq.net/), built from scratch for
speed on constrained hardware. The target is fullscreen 1080p at 60fps on a
Pi 4, which earlier Pd/GEM and software-renderer approaches couldn't reach.

## Why it's fast on a Pi

- **Unified memory.** The Pi 4's CPU and GPU share RAM, so uploading a decoded
  frame is a `memcpy` within the same memory pool, not a bus transfer. Stream
  textures use `glTexSubImage2D`, which never reallocates. Reallocating on every
  frame is what made the Pd/GEM `pix_buffer` approach slow.
- **MJPEG, decoded with NEON.** Clips are MJPEG AVIs, `mmap`'d at startup.
  libjpeg-turbo decodes a 1080p frame in about 5 ms, and every frame is
  independently decodable, so seeking is instant and triggers land within a
  frame.
- **Shaders cost nothing extra.** Once the frame is on the GPU, a kaleidoscope
  pass costs the same as no effect.

## How it works

An OSC listener thread writes pending triggers; the render loop runs at vsync,
polls them, calls into Lua, decodes the current video frame and draws. The ALSA
callback pushes audio into a ring buffer that the render loop drains once per
frame into two 1D textures: a 2048-sample waveform and a 2048-bin spectrum.
Shaders sample the current frame, the waveform and the spectrum freely, and
new ones are plain GLSL files dropped into `shaders/`, with no build step.
