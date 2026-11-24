# Firefox 1.3 release

Jöran approved a public desktop Firefox listing. The release retains user-selected packs, sequential exports, existing saved projects, and permission requests for individual download hosts. Adobe's position on this workflow remains unconfirmed. The maintainer will respond to any objection.

| Step | Acceptance |
| --- | --- |
| 1. Build the release | A clean source archive rebuilds the unsigned XPI with the tested extension ID, matching file hashes, the MIT notice and the Firefox consent declaration. |
| 2. Prepare the panel | Use bundled styles and a data-only slider bridge. Preserve project defaults and clip overrides. Offer completed files after an interrupted export. |
| 3. Verify and document | Lint the XPI. Exercise login, pack creation, slider selection, host approval, ZIP contents and partial recovery. Check the panel in Firefox and Edge and try the FBX workflow in Godot. Provide listing copy, privacy information and reviewer steps. |
| 4. Publish | Open the GitHub release PR, submit the tested build and matching source for a listed desktop add-on, then record Mozilla's actual status and public URL. |

## Release checks on November 24, 2026

- The documented Windows build from a fresh source ZIP produced an identical XPI, SHA-256 `692ad5605e7623ee7095ae8652308b347ba2fd20b85a713b4fff6f2d5581cdf0`. The XPI includes the Gecko ID, data declarations and MIT notice. The source includes the panel screenshot.
- Mozilla addons-linter reported zero errors, zero notices and one Android minimum-version warning. Select desktop Firefox only for this release.
- Local Firefox fixtures covered sign-in detection, pack creation and persistence, motion selection, slider restoration, individual download-host approval, partial ZIP recovery, retry and duplicate display names. Two distinct Throw motions produced `Throw.fbx` and `Throw (2).fbx`. Edge passed the two-file export fixture. The 320 px Firefox panel fit without horizontal overflow.
- Godot 4.7.2 played a real walk from the earlier user export on its T-pose skeleton. The 202-animation live Mixamo run used the preceding XPI. The 1.3.0 export checks used local fixture responses.
- Mozilla submission is pending maintainer sign-in. The unsigned candidate and source ZIP are in `artifacts/`. Record the submission status and listing URL here after Mozilla confirms them.
