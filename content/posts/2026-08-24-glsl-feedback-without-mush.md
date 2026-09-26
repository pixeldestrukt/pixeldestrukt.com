---
title: GLSL feedback loops that do not turn to mush
slug: glsl-feedback-without-mush
date: 2026-08-24
summary: Ping-pong feedback is four lines of code and a hundred ways to lose contrast. Notes on decay, clamping and keeping a loop alive for an hour-long set.
tags: [GLSL, realtime, technique]
---

Feedback is the cheapest way to get motion that looks considered rather than
generated. Sample last frame, offset it slightly, blend in something new. The
whole technique fits on a napkin:

```glsl
uniform sampler2D uPrev;   // last frame
uniform float     uTime;
uniform vec2      uRes;

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;

    // Zoom and rotate the previous frame a hair.
    vec2 c  = uv - 0.5;
    float a = 0.004;
    c = mat2(cos(a), -sin(a), sin(a), cos(a)) * c * 0.995;

    vec3 prev = texture(uPrev, c + 0.5).rgb;
    vec3 seed = source(uv);

    gl_FragColor = vec4(max(seed, prev * 0.96), 1.0);
}
```

That runs beautifully for ten seconds and then either saturates to white or
drains to black. The difference between a demo and something you can leave
running for an hour is entirely in how you manage the loop's energy.

## Decay must beat injection

The loop is a geometric series. If your decay factor is `d` and you inject
brightness `s` each frame, the steady state is `s / (1 - d)`. At `d = 0.96` that
is 25× your injected brightness — which is why `0.96` blows out. Either inject
less or decay harder, and know which knob you are turning:

| Decay | Steady-state gain |
|---:|---:|
| 0.90 | 10× |
| 0.96 | 25× |
| 0.99 | 100× |

## Use max, not add, for the blend

`prev * d + seed` accumulates. `max(seed, prev * d)` does not — the new content
can only ever reach its own brightness, and the trail decays underneath it. It
costs the same and it is stable by construction.

## Keep the buffer floating point

An 8-bit feedback buffer quantises at every pass. With `d = 0.96`, a value of
`4/255` decays to `3.84/255`, rounds back to `4`, and that pixel never dies —
you get permanent dirty specks in the dark areas. `RGBA16F` fixes it outright.
It is the single highest-value change in this whole list.

## Clamp in the loop, not at the output

```glsl
vec3 fed = max(seed, prev * uDecay);
fed = clamp(fed, 0.0, 4.0);        // headroom, but bounded
gl_FragColor = vec4(fed, 1.0);
```

Allowing values above 1.0 gives bloom something to work with. Allowing them to
run unbounded gives you NaNs, and a single NaN in a feedback buffer propagates
until you reset the texture.

## Break symmetry deliberately

A pure zoom is hypnotic for about forty seconds. Adding a slow rotation, a tiny
per-channel offset for chromatic drift, and a low-amplitude domain warp buys
another twenty minutes of interest:

```glsl
vec2 warp(vec2 p, float t) {
    return p + 0.002 * vec2(
        sin(p.y * 9.0 + t * 0.7),
        cos(p.x * 11.0 - t * 0.5)
    );
}
```

Sample the three channels at three slightly different scales and the loop reads
as optical rather than digital.

## The escape hatch

Whatever else you do, bind a **clear** control and put it somewhere you can hit
blind. Feedback systems get into states you did not design, and the only cure is
zeroing the buffer. On my rigs it is a dedicated pad, unmapped from anything
else, for exactly that reason.
