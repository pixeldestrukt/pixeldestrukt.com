---
title: vj-show
slug: vj-show
summary: A browser player for running generative visuals unattended across several displays, frame-synced over WebRTC with no pixels on the wire.
status: ongoing
year: 2026
order: 0
featured: true
stack: [WebGL2, GLSL, WebRTC, JavaScript]
repo: https://github.com/pixeldestrukt/vj-show
---

## What it does

Plays a list of generative scenes, GLSL fragment shaders or small JS modules,
on a timed schedule with crossfades. It runs in a browser in kiosk mode, so any
laptop or mini PC with Chromium becomes a display in a minute. Several displays
can show the same image, or tiles of one larger canvas, locked to the same
frame. The whole show is one JSON file, and edits to it go live without a
restart.

## Why it exists

I had a gallery show built in TiXL, and nobody else could host it. Keeping it
running meant keeping TiXL running on my laptop, the only machine with the GPU
to render the patch and push it over NDI to the displays. Pre-rendered video
was the obvious fix and the wrong one, because the point of the work is that
it's live.

Most of that GPU was going to the node editor, and in a gallery nobody is
editing. So this is a player, not a replacement for the authoring tool. Its job
is to run all day on weak hardware without me, and to take new material without
a restart.

## How it works

Every scene is a pure function of show time and its parameters. Two displays
that agree on the clock and the schedule render identical frames without
exchanging pixels. That makes multi-display sync a clock problem, not a video
problem.

- **A leader, not a server.** The first display to claim the room becomes the
  leader and owns the show clock and the schedule. The other displays and any
  control pages open WebRTC data channels to it. A small PeerServer on the LAN
  only introduces peers to each other; the show itself runs peer-to-peer.
- **Tiles from geometry.** Each display knows its position in a grid and renders
  only its region of a shared virtual canvas.
- **Hot reload.** Displays poll the scene list and sources, and recompile just
  what changed, keeping the current scene on screen.
- **A control page that's just another peer.** Sliders, *play now* and *hold* go
  to the leader over the same channels. Close the control page and the show
  keeps going.
- **Watchdog.** If the WebGL context is lost or an error goes uncaught, the page
  reloads itself, backing off if it keeps looping.

## Status

First install on September 26, 2026: four 1080×1920 portrait screens on an
offline wired LAN, served from a Mac. Getting it up surfaced five problems, all
in the networking around the player, not the renderer. They're written up in
[Four screens, one frame, no internet](/notes/vj-show-first-lan-install/).
