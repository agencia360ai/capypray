"""Authored poses/clips for GDD clip names the FBX takes lack (kneel_pray, pray_hands_full, heart_full).

Each pose is a set of bone-local rotation/location offsets layered on top of a base take (the idle
breathing), keyed with smooth ease in / hold / ease out so the clip starts and ends on the idle pose.
Angles are degrees in Rigify DEF bone-local space (Y along the bone). Conventions found with the viewer
probe (?probe=BONE:x,y,z): upper_arm.R -Z raises sideways, +X swings forward; forearm.R -Z bends in the
arm plane, +X forward; head +X nods down, +Y turns, +Z tilts; the left side mirrors Z.
"""
import math

import bpy
from mathutils import Euler, Quaternion, Vector


def _mirror(rot):
    x, y, z = rot
    return (x, -y, -z)


# paws pressed together under the chin
ARMS_PRAY = {
    # elbows forward and in, paws meet in front of the belly (found with a pose search against the body mesh)
    "DEF-upper_arm.R": {"rot": (110, 0, -40)},
    "DEF-forearm.R": {"rot": (15, 0, 35)},
    "DEF-upper_arm.L": {"rot": (110, 0, 40)},
    "DEF-forearm.L": {"rot": (15, 0, -35)},
}
# paws crossed over the heart, right on top
ARMS_HEART = {
    # paws crossed over the chest, resting on the surface
    "DEF-upper_arm.R": {"rot": (120, 0, -40)},
    "DEF-forearm.R": {"rot": (60, 0, 20)},
    "DEF-upper_arm.L": {"rot": (120, 0, 40)},
    "DEF-forearm.L": {"rot": (60, 0, -20)},
}
FINGER_CURL = {}
for side in ("L", "R"):
    for f in ("f_index", "f_middle", "f_pinky"):
        for seg in ("01", "02", "03"):
            FINGER_CURL[f"DEF-{f}.{seg}.{side}"] = {"rot": (20, 0, 0)}

# t0..t1: ease in, t2..t3: ease out (seconds). Bones without timing use the pose defaults.
POSES = {
    "pray_hands_full": {
        "base": "stand.idle.01",
        "duration": 3.0,
        "timing": (0.0, 0.55, 2.5, 3.0),
        "bones": {
            **ARMS_PRAY,
            **FINGER_CURL,
            "DEF-spine.006": {"rot": (22, 0, 0)},
            "DEF-spine.004": {"rot": (6, 0, 0)},
        },
    },
    "heart_full": {
        "base": "stand.idle.01",
        "duration": 2.2,
        "timing": (0.0, 0.45, 1.7, 2.2),
        "bones": {
            **ARMS_HEART,
            "DEF-spine.006": {"rot": (8, 0, -8)},
        },
    },
    "kneel_pray": {
        "base": "stand.idle.01",
        "duration": 8.0,
        "timing": (0.0, 0.8, 7.0, 8.0),
        "bones": {
            # whole body drops by the shin length (the FBX rig has two roots: `root` carries the DEF spine,
            # `MCH-torso.parent` carries face, arms and legs), legs fold under with the shins on the ground
            "root": {"loc": (0, 0, -0.36)},
            "MCH-torso.parent": {"loc": (0, 0, -0.36)},
            "DEF-thigh.L": {"rot": (-12, 0, 0)},
            "DEF-thigh.R": {"rot": (-12, 0, 0)},
            "DEF-shin.L": {"rot": (95, 0, 0)},
            "DEF-shin.R": {"rot": (95, 0, 0)},
            "DEF-foot.L": {"rot": (-40, 0, 0)},
            "DEF-foot.R": {"rot": (-40, 0, 0)},
            # hands join a beat later, head bows last
            **{k: {**v, "timing": (0.5, 1.2, 6.6, 7.4)} for k, v in ARMS_PRAY.items()},
            **{k: {**v, "timing": (0.5, 1.2, 6.6, 7.4)} for k, v in FINGER_CURL.items()},
            "DEF-spine.006": {"rot": (26, 0, 0), "timing": (0.9, 1.5, 6.4, 7.2)},
            "DEF-spine.004": {"rot": (8, 0, 0), "timing": (0.9, 1.5, 6.4, 7.2)},
        },
    },
}


def _smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def _weight(t, timing):
    t0, t1, t2, t3 = timing
    if t < t1:
        return _smooth((t - t0) / max(1e-6, t1 - t0))
    if t < t2:
        return 1.0
    return 1.0 - _smooth((t - t2) / max(1e-6, t3 - t2))


def _find_action(name):
    if name in bpy.data.actions:
        return bpy.data.actions[name]
    for a in bpy.data.actions:
        if a.name.split("|")[-1] == name:
            return a
    return None


def _curves(act, path):
    return {fc.array_index: fc for fc in act.fcurves if fc.data_path == path}


def build_pose_actions(arm, fps, log=print):
    """Return {clip_name: Action}. Each action is a trimmed copy of its base take with pose offsets keyed in."""
    out = {}
    for name, spec in POSES.items():
        base = _find_action(spec["base"])
        if base is None:
            log(f"WARN pose {name}: base take {spec['base']} missing")
            continue
        act = base.copy()
        act.name = name
        act.use_fake_user = True
        f0 = int(base.frame_range[0])
        n = int(round(spec["duration"] * fps))
        f1 = min(f0 + n, int(base.frame_range[1]))
        frames = list(range(f0, f1 + 1))
        # trim: drop keys after f1 on every curve
        for fc in act.fcurves:
            for kp in reversed(fc.keyframe_points):
                if kp.co[0] > f1:
                    fc.keyframe_points.remove(kp)
        # face, ears and shoulders hang off the ORG-* twins of the spine bones (constraints are lost in FBX),
        # so every DEF spine delta is mirrored onto its ORG twin to keep the head in one piece
        bones = dict(spec["bones"])
        for bone, off in spec["bones"].items():
            twin = "ORG-" + bone[4:] if bone.startswith("DEF-") else None
            if twin and twin in arm.pose.bones and twin not in bones:
                bones[twin] = off
        for bone, off in bones.items():
            if bone not in arm.pose.bones:
                log(f"WARN pose {name}: bone {bone} missing")
                continue
            timing = off.get("timing", spec["timing"])
            path = f'pose.bones["{bone}"]'
            rot_q = _curves(act, path + ".rotation_quaternion")
            rot_e = _curves(act, path + ".rotation_euler")
            loc = _curves(act, path + ".location")
            euler_mode = arm.pose.bones[bone].rotation_mode if rot_e else "QUATERNION"

            def base_rot(f):
                if rot_q:
                    return Quaternion([rot_q[i].evaluate(f) if i in rot_q else (1.0 if i == 0 else 0.0) for i in range(4)])
                if rot_e:
                    return Euler([rot_e[i].evaluate(f) if i in rot_e else 0.0 for i in range(3)], euler_mode).to_quaternion()
                return Quaternion()

            def base_loc(f):
                return Vector([loc[i].evaluate(f) if i in loc else 0.0 for i in range(3)])

            samples = [(f, base_rot(f), base_loc(f)) for f in frames]
            for fc in list(act.fcurves):
                if fc.data_path in (path + ".rotation_quaternion", path + ".rotation_euler", path + ".location"):
                    act.fcurves.remove(fc)
            qcurves = [act.fcurves.new(path + ".rotation_quaternion", index=i, action_group=bone) for i in range(4)]
            lcurves = [act.fcurves.new(path + ".location", index=i, action_group=bone) for i in range(3)]
            delta_rot = Euler([math.radians(a) for a in off.get("rot", (0, 0, 0))], "XYZ").to_quaternion()
            delta_loc = Vector(off.get("loc", (0, 0, 0)))
            for f, q0, l0 in samples:
                w = _weight((f - f0) / fps, timing)
                q = q0 @ Quaternion().slerp(delta_rot, w)
                l = l0 + delta_loc * w
                for i in range(4):
                    qcurves[i].keyframe_points.insert(f, q[i], options={"FAST"})
                for i in range(3):
                    lcurves[i].keyframe_points.insert(f, l[i], options={"FAST"})
            for c in qcurves + lcurves:
                c.update()
            arm.pose.bones[bone].rotation_mode = "QUATERNION"
        out[name] = act
        log(f"pose {name}: {len(frames)} frames from {spec['base']}")
    return out
