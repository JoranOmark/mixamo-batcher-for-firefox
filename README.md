# Mixamo Batcher for Firefox

## Try the Firefox development build

1. Download or clone this repository. In its folder, use Node.js and pnpm 6.35.1 to run `pnpm install --frozen-lockfile` and then `pnpm build`.
2. In Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/manifest.json`. Load it again after restarting Firefox. After rebuilding, click **Reload** beside the add-on.
3. Open or refresh [Mixamo](https://www.mixamo.com/), sign in, and preview a character. In the Batcher panel, name a project and click **Create Project**. Name a pack and click **Create Pack**.
4. Preview an animation on Mixamo. When its name appears under **Add Animations**, click **Add To Pack**. Click **Download Pack** to save one ZIP containing the pack’s files.

## Export settings and Godot

Under **Show Project Settings → Download Preferences**, choose the defaults for clips in every pack in that project. To customize one clip, expand it under **Pack Animations** and enable **Override Project Preferences**. The override has its own set of download settings.

| Setting | New project | Other choices |
| --- | --- | --- |
| Format | FBX Binary | FBX ASCII, FBX for Unity, FBX 7.4, FBX 6.1, Collada |
| Frames per second | 30 | 24 or 60 |
| Keyframe reduction | None | Uniform or Non-Uniform |
| Skin | Without Skin | With Skin |
| In Place | On for supported clips | Off or Use saved Mixamo preview |

Each new pack includes a **T-Pose** with **With Skin** selected as a clip override. For Godot, start with that file for the character mesh and skeleton. Unzip the pack and use the remaining FBX files as animations for the same rig. Use **In Place** for walks and runs when your movement code drives the character. Choose **Off** for a clip such as a lunge when you want the authored movement. See [Godot’s root motion guide](https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html#root-motion).

Older projects and their JSON backups use **Use saved Mixamo preview** until you change the project setting. Clips that do not support In Place keep the motion supplied by Mixamo.

## Download permissions

The add-on uses Mixamo for selection and export and has access to two known Mixamo storage hosts. If Mixamo returns a file on a different HTTPS host, the pack pauses and shows its hostname. Click **Review download permission**, choose **Allow host** in the tab that opens, then approve the Firefox prompt to continue the same pack. Firefox can reuse that grant for future downloads. **Cancel download** stops the pack. File requests omit cookies and the Adobe sign-in token.

## About the project

**Mixamo Batcher allows you to create and save animation packs, and download them as an archive file.**

![Preview](./images/preview.jpg)

Mixamo is an excellent tool that makes it quick and easy to use 3D motion capture data. However, the standard Mixamo user interface is rather minimal, and over time some built in features have been removed. Mixamo Batcher extends the standard Mixamo UI by inserting some additional features while viewing the site.

Among the features, some included are:

- Project management
- Project wide preferences e.g. download all files as fbx for Unity
- Animation packs that will load the correct character model
- Quickly scaffold out character animation packs by duplicating packs
- Tweaking parameters in Mixamo automatically syncs to pack animations
- Download the entire pack as a single archive file
- Per animation download preferences

This activity will be saved into your browser's local storage, with the ability to export and import project data as JSON.

# Usage

The first thing you will be met with when loading the extension is a home screen with some controls and a list of your projects.

From this screen, you can `Import/Export` projects, create a new project, or view an existing project.

## Creating a project

A project is the way to group together multiple character animation packs.

Entering a project name into the input and clicking "Create Project" will create and save the project.

![Preview](./images/creating-a-project.png)

_After a project is created, it will be automatically loaded._

## Altering project settings

Once you have created a project, you can change its settings:

- You can change the name of the project.
- Changing download settings will apply to all packs and animations in the project. However, they can be overriden on a per-animation basis, see following sections.
- You can delete the project

![Preview](./images/altering-project-settings.png)

## Creating a pack

A pack is a set of animations belonging to a specific character. When you create a pack, it will use the current character being previewed in Mixamo.

Viewing a pack after it has been created will trigger that character to be loaded again.

New packs will come with a single animation, a `T-Pose` with project settings overridden to come `With Skin`.

![Preview](./images/creating-a-pack.png)

_After a pack is created, it will be automatically loaded._

## Altering pack settings

Once you have created a project, you can change its settings:

- You can change the name of the pack.
- You can change the character the pack uses.
- You can duplicate the pack with a different name.
- You can delete the pack.

![Preview](./images/altering-pack-settings.png)

## Adding an animation to a pack

Once you have selected an animation to preview in Mixamo (in this example the "Throw" animation), you are able to add it to your pack.

![Preview](./images/adding-an-animation.png)

## Syncing animation parameters

When previewing an animation in Mixamo, changing any animation parameters will cause those parameters to be synced back to the currently selected pack and saved, if the animation exists in that pack.

If you then later click on the animation in Mixamo Batcher, it will be loaded with those parameters.

# Technical Details

The primary functionality of this extension is achieved by [hooking into browser XHR](https://github.com/farism/mixamo-batcher/blob/main/src/xhr.ts) and taking additional steps based on which data is being fetched, for example:

- If a new character is uploaded we can fetch some additional data once the upload has completed.
- If we are selecting an animation from a pack, we can override the response coming back from Mixamo API to set some initial animation parameters, e.g. `Character Arm-Space`. This enables us to "save" parameters per animation.

Some basic chrome extension functionality is also used, e.g. updating the tab when an animation has been clicked, which will cause Mixamo to filter down the product list.

## Limitations

- Must be logged into Mixamo.com
- Data is saved in browser localStorage. Uninstalling the extension or clearing extension data will result in data loss. There is an import/export feature to get around this. Depending on popularity a remote data solution could be provided.
- Application functionality is highly dependent on the structure of Mixamo. If the website or APIs change drastically, the extension will most likely break in some way.
- Selecting an animation from a pack may load up more than one page of animations. If the target animation is not on the first page it won't be selected.
- ZIP creation keeps the pack in browser memory. Split a large pack if Firefox runs out of memory.

# License

MIT, see LICENSE file
