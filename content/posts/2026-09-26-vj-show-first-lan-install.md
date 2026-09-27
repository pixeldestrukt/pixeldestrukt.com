---
title: Four screens, one frame, no internet
slug: vj-show-first-lan-install
date: 2026-09-26
summary: The first real install of vj-show took ninety minutes and hit five problems. None were in the renderer. All of them were in the networking around it.
tags: [WebRTC, networking, installation]
---

The first real install of [vj-show](/work/vj-show/) was four 1080×1920 portrait
screens on a wired LAN with no internet, served from my Mac and left
unattended. It ended with all four screens on the same frame and controlled
from the Mac without me touching a display. Getting there took about ninety
minutes and five separate problems, and none of them were in the rendering.

## The setup

The Mac ran the server: the page, the scene files, and a PeerServer that
introduces the displays to each other. Two display machines each drove two
screens. The Mac's only internet was an iPhone hotspot over Wi-Fi.

Sync is a star. The first display to claim the room becomes leader and owns the
clock and schedule; everything else opens a WebRTC data channel to it. Once
those channels are up the server only matters for loading files and electing a
new leader. That split turned out to decide what broke and what didn't.

## 1. The old server was still running

`server.js` exited on start. Port 8000 was held by `serve.py`, the server it had
replaced, which had been running for a week. The port conflict was easy to spot.
The bigger problem was that the old server serves files but has no PeerServer,
so any screen that had loaded its page from it had nothing to sync with.

A port conflict tells you about itself. A different server quietly answering on
the same port doesn't, so when you replace a server, check for the old one.

## 2. Four screens, four clocks

All four screens were showing the same scenes but not the same frame, and
nothing on screen said anything was wrong. I added two lines of join/leave
logging to the PeerServer and restarted it. No display ever joined.

The cause was a convenience. With `"peerserver": "auto"`, a page tries the
PeerServer at its own origin and falls back to the public one if that doesn't
answer within five seconds. That fallback is what lets the page work off a
plain static host. On an offline LAN it's a trap: the public server can't be
reached, the screen joins nothing, and it runs its own clock. It stays that way
until it reloads, because the choice is made once at page load.

The fix: pages served from a LAN address (`localhost`, `10.x`, `192.168.x`,
`172.16–31.x`, `*.local`) never fall back, and keep retrying the local server.

Getting the fix onto the screens without walking over to them meant reloading
them remotely, and there was no remote reload yet. But every display already
polls the scene list and re-imports any scene module whose source changed. So I
put a one-shot reload at the top of a scene module:

```js
{ const T = 'r1'; try { if (sessionStorage.getItem('forceReload') !== T) {
    sessionStorage.setItem('forceReload', T); location.reload(); } } catch (e) {} }
```

The `sessionStorage` token stops it from reloading forever. It didn't fire until
I also touched `scenes.json`, because the player only re-checks scene sources
when the list itself changes. Within six seconds the leader had claimed the room
and the others had joined, all on the same frame.

A silent fallback is fine when both options work. When one of them can't work
where you're deploying, the fallback turns a clear error into a quiet wrong
result.

## 3. The control page couldn't see the screens

This one had two layers, and fixing the first one hid the second for an hour.

The control page on the Mac said *NO DISPLAY in room "show"*. The server log
showed it joining and dropping every eleven seconds: an eight-second timeout
waiting for the leader, then a retry. The buttons still seemed to work, because
*play now* shows "fading…" locally whether or not the message went anywhere.

**Layer one was macOS.** Recent macOS makes each app ask before it talks to
other devices on the local network. Chrome didn't have that permission, so it
could load pages from the Mac itself but couldn't reach the display machines. A
Chrome launched from the terminal inherits the terminal's permission, which is
why my headless tests passed and the real window failed.

**Layer two was Chrome.** When I moved Wi-Fi back above the wired adapter so the
Mac had internet again, every control page failed, including the ones that had
worked. Listing the WebRTC ICE candidates Chrome offered made it plain:

| Condition | Candidates offered |
|---|---|
| Default | mDNS names for the default-route interface only |
| mDNS off | Wi-Fi addresses only |
| `localhost` + mic permission | Wired, Wi-Fi and IPv6: every interface |

Without camera or mic permission, Chrome only gathers candidates on the
interface that holds the default route. That's deliberate: it limits how much of
your network any page can see. With Wi-Fi first, the displays were only ever
offered a hotspot address they couldn't reach.

Putting the wired LAN first works but takes away the Mac's internet. Instead,
when the control page times out waiting for the leader, it asks for the mic
once, stops the tracks immediately, and reconnects. `getUserMedia` needs a
secure context, so the control page has to be opened at `localhost`, not the LAN
address. A laptop whose default route is the display network doesn't need any
of this.

A machine on two networks can reach the server and still not reach the
displays. Whether it can reach them peer-to-peer depends on OS permissions, the
route table and browser privacy policy.

## 4. "Lock scene" didn't lock anything

With *lock scene* checked, the show kept cycling. That checkbox only pins the
control panel's editor so the sliders stay put. The show itself never knew about
it, and there was no way to stop the schedule at all.

So now there's *hold*. The leader stops advancing, *play now* still works, and
releasing it gives the current scene its full duration. Hold is part of the
state the leader broadcasts, so it survives a leader handover. A control that
only affects the controller should look different from one that affects the
show.

## 5. The Ethernet adapter fell out

Halfway through, the Mac's USB Ethernet adapter disconnected. Every screen put up
a red `reload: Failed to fetch` box and one showed the wrong scene for a while.
But they stayed in sync with each other, because the clock never went through
the server.

The error box would have stayed up after the network came back, because it was
only cleared when the scene list changed. Now it clears on the next successful
poll. The wrong scene is a real limit. With the PeerServer unreachable, a display
that loses the leader can't rejoin or start an election, so it runs its own
schedule until the server is back. When the adapter came back, the leader
reclaimed the room within seconds and the others rejoined on their own.

## What held up

The thing I most wanted to be true was. The control page can come and go, the
Mac can drop off the network, and the screens keep playing the same frame. The
control page is just another peer asking the leader to do things. It's a small
peer-to-peer show-control system that doesn't mind losing its operator.

Nothing needed a trip to a screen: two remote reloads, a change of canvas shape,
and every scene switch all came from the Mac. The two logging lines paid for
themselves in minutes.

## Next time

- Check the port before starting the server, and run it in its own terminal
  under `caffeinate -d`.
- Launch displays in kiosk mode at boot. A browser won't let a page make itself
  fullscreen, so that's the only way to never touch a screen:

  ```sh
  msedge --kiosk http://192.168.0.102:8000/ --edge-kiosk-type=fullscreen --no-first-run
  ```

- Confirm sync from the server log, not by eye: one leader plus one join per
  display.
- Open the control page at `localhost`, allow Local Network, allow the mic once.
- Tape down the Ethernet adapter.

Still open: showing each display's status on the control page instead of
inferring it from a server log, making the panel say when it isn't connected,
and letting a stranded display keep extrapolating the leader's clock instead of
starting its own.
