---
title: dan-mx
slug: dan-mx
summary: A lighting protocol for pixel-dense LED displays on IP networks. Variable-size frames, per-frame compression, and color encoding that follows what the eye can see.
status: prototype
year: 2026
order: 4
featured: true
stack: [Python, C++17, ESP32, UDP]
repo: https://github.com/pixeldestrukt/dan-mx
---

## What it does

DMX's 512-byte universe was designed for 1986-era RS-485 wiring, and Art-Net and
sACN wrap that same frame in UDP. dan-mx starts from the other end: what would a
lighting protocol look like if it were designed for gigabit Ethernet, cheap
microcontrollers with DMA, and human vision?

- **No universe ceiling.** A frame addresses whatever range of pixels the sender
  wants to update.
- **Compression chosen per frame.** The encoder tries RAW, pixel-level RLE, and
  DELTA (XOR against the previous frame, then RLE) and sends the smallest. A
  one-pixel change in a noisy 100-pixel frame goes from 214 bytes to 23.
- **Color in the protocol.** Each frame declares its transfer function (linear,
  gamma 2.2, sRGB) and its channel packing, including a G6R5B5 mode that gives
  green the bits it deserves.
- **Disposable frames.** UDP for frame data, multicast for groups. A dropped
  frame is replaced by the next one; a keyframe interval caps how long a receiver
  that missed a delta can stay out of sync.

## Frame

A fixed 14-byte big-endian header, then the body:

```
 offset  size  field
     0    4B   magic "DMX2"
     4    1B   version
     5    1B   flags
     6    1B   encoding     (RAW, RLE, DELTA)
     7    1B   color_space  (RGB888, RGB565, G6R5B5, RGB888_LINEAR)
     8    1B   transfer     (LINEAR, GAMMA_22, SRGB)
     9    1B   seq
    10    2B   start_pixel
    12    2B   pixel_count
```

## Status

Two reference implementations, byte-compatible with each other: a Python sender
and receiver with 33 tests, and a heap-free C++17 decoder for the ESP32 with an
example that drives a WS2812 strip through FastLED. Delta encoding, keyframe
recovery and perceptual packing work. Dithering, palette mode and gradient runs
are next, and multi-receiver sync and discovery are open questions.
