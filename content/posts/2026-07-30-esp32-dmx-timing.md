---
title: Getting DMX timing right on an ESP32
slug: esp32-dmx-timing
date: 2026-07-30
summary: The break, the mark-after-break and why bit-banging DMX on a WiFi-enabled chip is a bad plan. Using RMT and UART hardware instead.
tags: [embedded, DMX, ESP32]
---

DMX512 is a slow, forgiving protocol with two unforgiving details: the **break**
and the **mark-after-break**. Get them wrong and half the fixtures on the line
ignore you — usually not the half you tested with.

## The frame

Per packet:

- **Break**: line low, minimum 92 µs (spec) — I target 176 µs.
- **Mark after break**: line high, 12 µs minimum.
- **Start code**: one byte, `0x00` for standard dimmer data.
- **Up to 512 slots**, 250 kbaud, 8N2.

```c
#define DMX_BAUD        250000
#define DMX_BREAK_US    176
#define DMX_MAB_US      16
```

## Why bit-banging fails here

On a bare AVR you can bit-bang this and get away with it. On an ESP32 you
cannot, and the reason is WiFi. The radio stack runs at high priority on the
same cores and will steal tens of microseconds whenever it feels like it. Your
break becomes 240 µs — still legal — but a byte gap inside the payload becomes a
second break, and the fixture resets mid-frame. The symptom is a flicker that
correlates with network activity, which is a miserable thing to debug at 2am.

Use hardware. Two options, both fine:

## Option 1: UART break

The ESP32 UART can generate a break of a specified bit length. Reconfigure the
baud rate to stretch the break, then switch back:

```c
static void dmx_send(const uint8_t *data, size_t len) {
    // Break + MAB via a deliberately slow "byte" of zeros.
    uart_set_baudrate(DMX_UART, 90000);
    const uint8_t brk = 0x00;
    uart_write_bytes(DMX_UART, (const char *)&brk, 1);
    uart_wait_tx_done(DMX_UART, portMAX_DELAY);

    uart_set_baudrate(DMX_UART, DMX_BAUD);
    uart_write_bytes(DMX_UART, (const char *)data, len);   // data[0] == 0x00
    uart_wait_tx_done(DMX_UART, portMAX_DELAY);
}
```

Cheap, uses one peripheral, and the timing is generated in hardware so WiFi
cannot smear it.

## Option 2: RMT for the break, UART for the data

The RMT peripheral exists to emit precisely timed pulse trains. Use it for the
break and mark-after-break, hand off to the UART for the payload. More setup,
but the break width becomes exact rather than "whatever 90000 baud works out
to", which matters if you are chasing a fixture that sits close to the spec
limit.

## Pin the task

Whichever you choose, pin the DMX task to core 1 and leave core 0 to the
network stack:

```c
xTaskCreatePinnedToCore(dmx_task, "dmx", 4096, NULL, 10, NULL, 1);
```

Priority 10 is high enough to win against application work and low enough not
to starve the IDLE task's housekeeping.

## Electrical, since it is always electrical

- A real RS-485 transceiver. An ISO1176 or similar isolated part if the run
  leaves the rack — ground potential differences between dimmer racks are real
  and they kill microcontrollers.
- 120 Ω termination at the far end. One, at the end. Not three.
- 5-pin XLR if you want to be taken seriously, and never share the cable with
  audio.

## Verify with a scope, not with fixtures

Fixtures are too tolerant to be a test instrument. Put a scope on the line,
measure the break, measure the MAB, measure the inter-byte gap under load with
WiFi associated and transmitting. If the numbers hold there, they will hold on
site.
