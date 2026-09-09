"""Blender headless: Capi_rig.fbx (Rigify) -> capy-raw.glb with GDD clip names.

Usage:
  blender -b --python tools/avatar/export_capy.py -- \
      --fbx tools/avatar/src/Capi_rig.fbx \
      --clip-map tools/avatar/clip-map.json \
      --out tools/avatar/out/capy-raw.glb \
      --tex-size 1024 \
      [--extra-fbx tools/avatar/src/mixamo/*.fbx]

Pipeline:
  1. import FBX (all bones, all takes)
  2. for every take in clip-map, record the armature-space matrix of each DEF-*
     bone per frame (visual evaluation, so ORG/MCH/control bones are honoured)
  3. delete every non-DEF bone, re-parent DEF bones to the nearest DEF ancestor
  4. re-key each DEF bone from the recorded matrices (local basis recomputed
     against the new parent), one action per GDD clip, pushed to NLA tracks
  5. one base-color material per mesh, textures downscaled
  6. export GLB with all NLA tracks as animations
"""
import argparse
import json
import os
import sys

import bpy
from mathutils import Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from poses import build_pose_actions  # noqa: E402

TEX_DIR = None


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--fbx", required=True)
    p.add_argument("--clip-map", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--tex-size", type=int, default=1024)
    p.add_argument("--extra-fbx", nargs="*", default=[])
    return p.parse_args(argv)


def log(msg):
    print(f"[export_capy] {msg}", flush=True)


def find_armature():
    for o in bpy.data.objects:
        if o.type == "ARMATURE":
            return o
    raise RuntimeError("no armature found")


def meshes_of(arm):
    return [
        o for o in bpy.data.objects
        if o.type == "MESH" and any(m.type == "ARMATURE" and m.object == arm for m in o.modifiers)
    ]


def find_action(take):
    if take in bpy.data.actions:
        return bpy.data.actions[take]
    for a in bpy.data.actions:
        if a.name.split("|")[-1] == take:
            return a
    return None


def record_takes(arm, clips):
    """clips: {gdd_name: {take, end?}} -> {gdd_name: (frames, {bone: [Matrix]})}"""
    scene = bpy.context.scene
    if not arm.animation_data:
        arm.animation_data_create()
    def_names = [b.name for b in arm.pose.bones if b.name.startswith("DEF-")]
    recorded = {}
    for gdd, spec in clips.items():
        act = find_action(spec["take"])
        if act is None:
            log(f"WARN take '{spec['take']}' not found for '{gdd}'")
            continue
        arm.animation_data.action = act
        f0 = int(act.frame_range[0])
        f1 = int(spec.get("end", act.frame_range[1]))
        f1 = max(f0 + 1, min(f1, int(act.frame_range[1])))
        mats = {n: [] for n in def_names}
        frames = list(range(f0, f1 + 1))
        for f in frames:
            scene.frame_set(f)
            for n in def_names:
                mats[n].append(arm.pose.bones[n].matrix.copy())
        recorded[gdd] = (frames, mats)
        log(f"recorded {spec['take']} -> {gdd} ({f0}-{f1}, {len(frames)} frames)")
    arm.animation_data.action = None
    scene.frame_set(1)
    return recorded


def strip_non_def_bones(arm):
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    keep = [b for b in eb if b.name.startswith("DEF-")]
    for b in keep:
        p = b.parent
        while p is not None and not p.name.startswith("DEF-"):
            p = p.parent
        b.use_connect = False
        b.parent = p
    for b in list(eb):
        if not b.name.startswith("DEF-"):
            eb.remove(b)
    bpy.ops.object.mode_set(mode="OBJECT")
    for b in arm.data.bones:
        b.inherit_scale = "FULL"
        b.use_inherit_rotation = True
        b.use_local_location = True
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
        for c in list(pb.constraints):
            pb.constraints.remove(c)
    log(f"kept {len(arm.data.bones)} DEF bones")


def rekey(arm, recorded):
    """Rebuild one action per clip from armature-space matrices.
    pose(B) = pose(P) @ rest(P)^-1 @ rest(B) @ basis(B)  =>
    basis(B) = rest(B)^-1 @ rest(P) @ pose(P)^-1 @ pose(B)
    """
    rest = {b.name: b.matrix_local.copy() for b in arm.data.bones}
    parent = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
    order = []
    def visit(b):
        order.append(b.name)
        for c in b.children:
            visit(c)
    for b in arm.data.bones:
        if b.parent is None:
            visit(b)
    actions = {}
    for gdd, (frames, mats) in recorded.items():
        act = bpy.data.actions.new(gdd)
        act.use_fake_user = True
        fc = {}
        for n in order:
            if n not in mats:
                continue
            base = f'pose.bones["{n}"]'
            fc[n] = {
                "location": [act.fcurves.new(base + ".location", index=i, action_group=n) for i in range(3)],
                "rotation_quaternion": [act.fcurves.new(base + ".rotation_quaternion", index=i, action_group=n) for i in range(4)],
                "scale": [act.fcurves.new(base + ".scale", index=i, action_group=n) for i in range(3)],
            }
        rest_inv = {n: rest[n].inverted() for n in order}
        for fi, f in enumerate(frames):
            for n in order:
                if n not in mats:
                    continue
                pose_b = mats[n][fi]
                p = parent[n]
                if p is None:
                    basis = rest_inv[n] @ pose_b
                else:
                    basis = rest_inv[n] @ rest[p] @ mats[p][fi].inverted() @ pose_b
                loc, rot, sca = basis.decompose()
                t = f - frames[0] + 1
                for i in range(3):
                    fc[n]["location"][i].keyframe_points.insert(t, loc[i], options={"FAST"})
                    fc[n]["scale"][i].keyframe_points.insert(t, sca[i], options={"FAST"})
                for i in range(4):
                    fc[n]["rotation_quaternion"][i].keyframe_points.insert(t, rot[i], options={"FAST"})
        for group in fc.values():
            for curves in group.values():
                for c in curves:
                    c.update()
        actions[gdd] = act
        log(f"rekeyed {gdd}: {len(frames)} frames")
    return actions


def push_actions_to_nla(arm, actions):
    ad = arm.animation_data
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    for name, act in actions.items():
        tr = ad.nla_tracks.new()
        tr.name = name
        st = tr.strips.new(name, int(act.frame_range[0]), act)
        st.name = name
    ad.action = None


def load_tex(name):
    for ext in (".png", ".jpg"):
        p = os.path.join(TEX_DIR, name + ext)
        if os.path.exists(p):
            return bpy.data.images.load(p, check_existing=True)
    return None


def rebuild_materials(meshes, tex_size):
    albedo_by_mat = {
        "body": "Capi_01_Body_AlbedoTransparency",
        "eyes": "Capi_01_Eyes_AlbedoTransparency",
        "hair": "Capi_01_hair_AlbedoTransparency",
        "mouth": "Capi_01_mouth_AlbedoTransparency",
    }
    cache = {}
    for me in meshes:
        for slot in me.material_slots:
            key = (slot.material.name if slot.material else "body").split(".")[0].lower()
            tex_name = albedo_by_mat.get(key, albedo_by_mat["body"])
            if tex_name in cache:
                slot.material = cache[tex_name]
                continue
            mat = bpy.data.materials.new("capy_" + key)
            mat.use_nodes = True
            nt = mat.node_tree
            bsdf = nt.nodes["Principled BSDF"]
            bsdf.inputs["Roughness"].default_value = 0.9
            bsdf.inputs["Metallic"].default_value = 0.0
            img = load_tex(tex_name)
            if img is not None:
                if img.size[0] > tex_size:
                    img.scale(tex_size, tex_size)
                img.name = tex_name
                tn = nt.nodes.new("ShaderNodeTexImage")
                tn.image = img
                nt.links.new(tn.outputs["Color"], bsdf.inputs["Base Color"])
            cache[tex_name] = mat
            slot.material = mat


def main():
    global TEX_DIR
    a = parse_args()
    TEX_DIR = os.path.dirname(os.path.abspath(a.fbx))
    with open(a.clip_map) as f:
        cm = json.load(f)
    clips = dict(cm["clips"])

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=a.fbx, use_anim=True, ignore_leaf_bones=True)
    arm = find_armature()
    meshes = meshes_of(arm)
    log(f"armature={arm.name} bones={len(arm.data.bones)} meshes={[m.name for m in meshes]}")

    for extra in a.extra_fbx:
        before = set(bpy.data.actions.keys())
        bpy.ops.import_scene.fbx(filepath=extra, use_anim=True, ignore_leaf_bones=True)
        gdd = os.path.splitext(os.path.basename(extra))[0]
        for n in set(bpy.data.actions.keys()) - before:
            bpy.data.actions[n].name = gdd
            clips[gdd] = {"take": gdd}
        for o in [o for o in bpy.data.objects if o.type == "ARMATURE" and o != arm]:
            bpy.data.objects.remove(o, do_unlink=True)

    fps = bpy.context.scene.render.fps
    for name, act in build_pose_actions(arm, fps, log).items():
        clips[name] = {"take": act.name}
    only = os.environ.get("CAPY_ONLY_CLIPS")
    if only:
        clips = {k: v for k, v in clips.items() if k in only.split(",")}
    log(f"fps={fps} clips={list(clips)}")
    recorded = record_takes(arm, clips)
    for act in list(bpy.data.actions):
        bpy.data.actions.remove(act)
    strip_non_def_bones(arm)
    actions = rekey(arm, recorded)
    push_actions_to_nla(arm, actions)
    rebuild_materials(meshes, a.tex_size)

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    for m in meshes:
        m.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=a.out,
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_nla_strips=True,
        export_frame_range=False,
        export_force_sampling=True,
        export_optimize_animation_size=True,
        export_skins=True,
        export_all_influences=False,
        export_apply=True,
        export_image_format="AUTO",
        export_materials="EXPORT",
        export_yup=True,
    )
    log(f"wrote {a.out} ({os.path.getsize(a.out)/1e6:.2f} MB)")


if __name__ == "__main__":
    main()
