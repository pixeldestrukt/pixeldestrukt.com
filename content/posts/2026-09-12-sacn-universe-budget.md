---
title: Budgeting sACN universes before you buy the strip
slug: sacn-universe-budget
date: 2026-09-12
summary: Universe count, packet rate and switch capacity are one problem, not three. Here is the arithmetic I run before ordering any LED for a show.
tags: [LED, sACN, networking]
---

Every LED job I have seen go wrong on site went wrong in a spreadsheet weeks
earlier. The failure looks like flicker, or a section that lags a frame behind
its neighbour, and it gets blamed on the controller. It is almost always the
universe budget.

## The arithmetic

One sACN universe carries 512 channels. For RGB pixels that is 170 pixels per
universe, with two channels left stranded. For RGBW it is 128.

```text
pixels_per_universe = floor(512 / channels_per_pixel)
universes           = ceil(total_pixels / pixels_per_universe)
packets_per_second  = universes * target_fps
```

A 12,000-pixel RGB rig at 44 fps:

| Quantity | Value |
|---|--:|
| Pixels per universe | 170 |
| Universes | 71 |
| Packets/sec | 3,124 |
| Payload | ~2.9 Mbit/s |

Under 3 Mbit/s sounds like nothing. The bandwidth is never the problem — the
**packet rate** is. Consumer gigabit switches will move 3 Mbit/s all day and
still drop frames at three thousand small multicast packets per second, because
the limit that bites is packets per second and multicast group handling, not
line rate.

## What I actually check

- **Pixels per output, not per controller.** A controller rated for 16
  universes often means four outputs of four universes, and a run that crosses
  an output boundary will tear.
- **Multicast vs unicast.** Multicast is the spec default and the reason cheap
  switches fall over. If the fixture count is fixed and known, unicast to each
  node is more predictable.
- **IGMP snooping.** On if multicast, and verified on — not just enabled in the
  web UI. Without it every port sees every universe.
- **A dedicated VLAN.** Lighting data shares a switch with nothing. Not the
  media server's file copy, definitely not house wifi.
- **Headroom.** I size for 25% spare universes. Somebody always adds a fixture.

## Refresh rate is a choice, not a constant

The reflex is to push 60 fps everywhere. For most architectural and scenic
looks, 30 fps halves the packet rate and is visually indistinguishable — except
on fast strobes and hard camera pans, where it is very much not. Decide per
zone, not per system:

```python
def packet_rate(pixels, channels_per_pixel, fps):
    per_universe = 512 // channels_per_pixel
    universes = -(-pixels // per_universe)   # ceil division
    return universes, universes * fps

for fps in (30, 44, 60):
    print(fps, packet_rate(12000, 3, fps))
```

Run that before the order goes in. It costs nothing and it has saved me a
next-day switch purchase more than once.

## Power, briefly

Universe planning and power planning fail together. WS2812B at full white draws
roughly 60 mA per pixel; 12,000 pixels is 720 A at 5 V, which is 3.6 kW before
losses. Nobody builds for that, and nobody needs to — but the *cap* has to live
in the renderer, not in hope. I clamp total output power in software and inject
for the real measured ceiling plus margin.

More on how I measure that ceiling in a later note.
