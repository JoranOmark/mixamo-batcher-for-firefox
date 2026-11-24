# Firefox Add-ons submission for 1.3.0

## Listing

**Animation Pack Exporter for Mixamo**

Save the Mixamo animations you choose into packs and download each pack as a ZIP.

Create a project, select your character and build a pack from the motions you preview. Keep a skinned T-pose alongside skinless motions for Godot or choose your own export preferences. Set the format, frame rate, keyframe reduction, skin and supported in-place motion per project or clip. Projects stay in Firefox and can be backed up to JSON. An interrupted download offers a partial ZIP when any files have finished.

Independent community port of Faris Mustafa's MIT-licensed Mixamo Batcher. Requires a Mixamo account and desktop Firefox 140 or later. Unaffiliated with Adobe and Mozilla. [Support and issue tracker](https://github.com/JoranOmark/mixamo-batcher-for-firefox/issues)

## Privacy disclosure

The add-on reads the Mixamo session token from the signed-in Mixamo page and sends it to the Mixamo API at www.mixamo.com. It sends the selected character, motion and export settings to Mixamo to produce each requested file. Firefox fetches that file from the HTTPS storage address supplied by Mixamo. The file request omits cookies and the Adobe token. For an unfamiliar host, Firefox asks for permission to access that specific host. The extension stores project definitions and selected animation data in the Firefox profile and offers a user-initiated JSON backup. The developer receives no telemetry, session tokens or pack data.

## Reviewer instructions

1. Build the matching source ZIP using the Windows environment and commands in README.md. The XPI contains the release manifest and upstream MIT license. The page hook, panel scripts and styles ship inside the package.
2. Sign in to Mixamo with a test account, choose a character and refresh the page. Create a project and a pack. Confirm that the pack starts with a T-pose using the With Skin override.
3. Preview a walk with an In Place option, add it to the pack, adjust a motion slider, then reopen that clip. Check the stored slider value. Open project settings and verify FBX Binary, 30 FPS, no reduction, Without Skin and In Place. Per-clip overrides are available under Pack Animations.
4. Download the two-file pack. Confirm the ZIP contains the T-pose and walk. When Mixamo supplies a previously unapproved host, the panel asks for that hostname alone. The optional HTTPS wildcard lets the add-on request the exact origin at runtime. The two known storage hosts are listed in the manifest.
5. Reload Mixamo and reopen the saved pack. Export a backup from Home and use Import to restore it. The README includes a Godot playback check.
