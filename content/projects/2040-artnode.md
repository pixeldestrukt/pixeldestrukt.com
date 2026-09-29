---
title: 2040-ArtNode
slug: 2040-artnode
summary: An open-hardware Art-Net LED controller. RP2354A and W5500 Ethernet driving four WS2812 outputs, with USB-C LiPo charging, laid out for JLCPCB assembly.
status: prototype
year: 2026
order: 5
featured: true
stack: [RP2354A, W5500, KiCad, Python, Art-Net]
repo: https://github.com/pixeldestrukt/2040-artnode
---

## What it does

Receives Art-Net over wired Ethernet and drives four independent addressable LED
outputs (WS2812B, SK6812), 256 pixels each at 30fps. It runs from USB-C or a
LiPo cell, and has headers for an SSD1306 OLED and SWD debugging, on a 100 × 70 mm
two-layer board.

## Design

- **RP2354A** with 2 MB flash in the package, generating the LED signals from PIO
  state machines.
- **W5500** hardwired Ethernet for the Art-Net packets on UDP 6454.
- **SN74AHCT125** level shifter, taking the 3.3 V data up to 5 V for reliable
  signal margins at the pixels.
- **Power:** a TP4056 charger into an MT3608 boost for the 5 V rail, and an
  AMS1117 for 3.3 V. The board carries control signals only. At full white,
  1024 WS2812Bs draw about 61 A, which goes to the strips directly.
- **Every part from the JLCPCB/LCSC catalog**, so turnkey assembly needs no
  custom stocking.

## Generated, not drawn

The schematic, PCB, project file and BOM are all written by Python scripts
(`gen_schematic.py`, `gen_pcb.py`, `gen_project.py`, `gen_bom.py`), with every
symbol inline and no library dependencies. Change the generator, rerun it,
and the KiCad files follow.

## Status

Components are placed and ground pours defined; routing is the next step, then
firmware. Hardware files are CERN-OHL-P v2.
