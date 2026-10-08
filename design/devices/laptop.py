"""Notebook 3D fotorrealista (inspirado no MacBook Pro 14") com a tela animada.

Uso (Blender em segundo plano):
  blender -b -P design/devices/laptop.py -- --screen <pasta 0001.jpg...> --frames 360
          --out <pasta> [--still 3] [--samples 64] [--tint 3f8f4a] [--res 960]

Antes, gere o layout/texturas do teclado: python design/devices/gen_textures.py
HDRI: tex/studio_small_09_2k.exr (Poly Haven, CC0).
A câmera faz uma órbita curta em ciclo fechado, então o vídeo faz loop sem emenda.
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "tex")
argv = sys.argv[sys.argv.index("--") + 1:]
opt = {argv[i].lstrip("-"): argv[i + 1] for i in range(0, len(argv), 2)}
SCREEN = opt["screen"]
FRAMES = int(opt.get("frames", 300))
OUT = opt["out"]
STILL = opt.get("still")
SAMPLES = int(opt.get("samples", 64))
TINT = opt.get("tint", "3f6fd8")
RES = int(opt.get("res", 960))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start, scene.frame_end = 1, FRAMES
scene.render.fps = 30


# ---------------------------------------------------------------- helpers
def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def rrect(w, h, r, seg=12):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def link(ob, parent=None):
    bpy.context.collection.objects.link(ob)
    if parent:
        ob.parent = parent
    return ob


def prism(name, w, h, r, z0, z1, mat, bevel=0.0, seg=12, bevel_seg=4, parent=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = rrect(w, h, r, seg)
    bot = [bm.verts.new((x, y, z0)) for x, y in pts]
    top = [bm.verts.new((x, y, z1)) for x, y in pts]
    bm.faces.new(list(reversed(bot)))
    bm.faces.new(top)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    lay = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for lp in f.loops:
            x, y, _ = lp.vert.co
            lp[lay].uv = (x / w + 0.5, y / h + 0.5)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me), parent)
    me.materials.append(mat)
    if bevel > 0:
        m = ob.modifiers.new("bevel", "BEVEL")
        m.width, m.segments = bevel, bevel_seg
        m.limit_method = "ANGLE"
        m.angle_limit = math.radians(40)
        m.harden_normals = True
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
        ob.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
    return ob


def plane(name, w, h, r, z, mat, seg=10, flip=False, parent=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for x, y in rrect(w, h, r, seg)]
    f = bm.faces.new(list(reversed(vs)) if flip else vs)
    lay = bm.loops.layers.uv.new("UVMap")
    for lp in f.loops:
        x, y, _ = lp.vert.co
        lp[lay].uv = (x / w + 0.5, (0.5 - y / h) if flip else (y / h + 0.5))
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me), parent)
    me.materials.append(mat)
    return ob


def mat(name, color, metallic=0.0, rough=0.4, coat=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*srgb(color), 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.05
    b.inputs["Specular IOR Level"].default_value = spec
    return m


def noisy_rough(m, lo, hi, scale=900):
    """Microvariação de rugosidade (alumínio jateado) — evita o aspecto de CG liso."""
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = 6
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = lo
    mr.inputs["To Max"].default_value = hi
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.025
    bump.inputs["Distance"].default_value = 0.002
    nt.links.new(nz.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


# ---------------------------------------------------------------- materials
ALU = noisy_rough(mat("aluminium", "#c3c6cb", metallic=1.0, rough=0.36), 0.32, 0.42)
ALU_PAD = noisy_rough(mat("trackpad", "#bfc2c7", metallic=1.0, rough=0.3), 0.27, 0.33, scale=1400)
BLACK_ANO = mat("black-anodized", "#0d0d0f", metallic=0.7, rough=0.48)
GLASS = mat("glass", "#030304", rough=0.06, coat=1.0, spec=0.6)
PORT = mat("port", "#050506", rough=0.7)
RUBBER = mat("rubber", "#0a0a0a", rough=0.85)


def key_material(KW, KH, anchor):
    m = bpy.data.materials.new("keycap")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.52
    b.inputs["Specular IOR Level"].default_value = 0.45
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.object = anchor
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Location"].default_value = (0.5, 0.5, 0)
    mp.inputs["Scale"].default_value = (1 / KW, 1 / KH, 1)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(TEX, "keyboard.png"))
    tex.image.colorspace_settings.name = "Non-Color"
    tex.extension = "CLIP"
    tex.interpolation = "Cubic"
    nt.links.new(mp.outputs["Vector"], tex.inputs["Vector"])
    # legends only on the key tops
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Normal"], sep.inputs["Vector"])
    gt = nt.nodes.new("ShaderNodeMath")
    gt.operation = "GREATER_THAN"
    gt.inputs[1].default_value = 0.9
    nt.links.new(sep.outputs["Z"], gt.inputs[0])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    nt.links.new(tex.outputs["Color"], mul.inputs[0])
    nt.links.new(gt.outputs[0], mul.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = (*srgb("#121214"), 1)
    mix.inputs["B"].default_value = (*srgb("#dcdcdc"), 1)
    nt.links.new(mul.outputs[0], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    # soft keyboard backlight through the legends
    b.inputs["Emission Color"].default_value = (1.0, 0.97, 0.92, 1)
    em = nt.nodes.new("ShaderNodeMath")
    em.operation = "MULTIPLY"
    em.inputs[1].default_value = 0.55
    nt.links.new(mul.outputs[0], em.inputs[0])
    nt.links.new(em.outputs[0], b.inputs["Emission Strength"])
    return m


def grille_material():
    m = mat("grille", "#c3c6cb", metallic=1.0, rough=0.38)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(TEX, "grille.png"))
    tex.image.colorspace_settings.name = "Non-Color"
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = (*srgb("#c3c6cb"), 1)
    mix.inputs["B"].default_value = (*srgb("#050505"), 1)
    nt.links.new(tex.outputs["Color"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    nt.links.new(tex.outputs["Color"], inv.inputs[1])
    nt.links.new(inv.outputs[0], b.inputs["Metallic"])
    return m


def screen_material():
    files = sorted(f for f in os.listdir(SCREEN) if f.lower().endswith((".jpg", ".png")))
    img = bpy.data.images.load(os.path.join(SCREEN, files[0]))
    img.source = "SEQUENCE" if len(files) > 1 else "FILE"
    m = bpy.data.materials.new("screen")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Cubic"
    tex.extension = "EXTEND"
    if img.source == "SEQUENCE":
        tex.image_user.frame_duration = len(files)
        tex.image_user.frame_start = 1
        tex.image_user.use_auto_refresh = True
        tex.image_user.use_cyclic = True
    emis = nt.nodes.new("ShaderNodeEmission")
    emis.inputs["Strength"].default_value = 1.0
    nt.links.new(tex.outputs["Color"], emis.inputs["Color"])
    gloss = nt.nodes.new("ShaderNodeBsdfGlossy")
    gloss.inputs["Roughness"].default_value = 0.08
    fres = nt.nodes.new("ShaderNodeFresnel")
    fres.inputs["IOR"].default_value = 1.5
    faint = nt.nodes.new("ShaderNodeMath")
    faint.operation = "MULTIPLY"
    faint.inputs[1].default_value = 0.06  # barely-there reflection: content stays clear
    nt.links.new(fres.outputs[0], faint.inputs[0])
    add = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(emis.outputs[0], add.inputs[0])
    nt.links.new(gloss.outputs[0], add.inputs[1])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(faint.outputs[0], mix.inputs[0])
    nt.links.new(emis.outputs[0], mix.inputs[1])
    nt.links.new(add.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m


# ---------------------------------------------------------------- laptop
root = link(bpy.data.objects.new("laptop", None))
W, D, TB = 31.26, 22.12, 1.08

base = prism("base", W, D, 1.1, 0, TB, ALU, bevel=0.22, bevel_seg=7, parent=root)


def cutter(name, w, h, r, z0, z1, loc=(0, 0, 0), seg=10):
    c = prism(name, w, h, r, z0, z1, ALU, seg=seg, smooth=False)
    c.location = loc
    c.display_type = "WIRE"
    c.hide_render = True
    return c


def boolean(target, cutter_ob):
    m = target.modifiers.new(cutter_ob.name, "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.object = cutter_ob
    m.solver = "EXACT"
    # keep weighted normals last
    target.modifiers.move(len(target.modifiers) - 1, 1)


# keyboard pocket
kb = json.load(open(os.path.join(TEX, "keys.json"), encoding="utf-8"))
KW, KH = kb["KW"], kb["KH"]
KY = D / 2 - 1.45 - KH / 2
boolean(base, cutter("kb-cut", KW + 0.36, KH + 0.36, 0.3, TB - 0.07, TB + 1, (0, KY, 0)))
tray = prism("kb-tray", KW + 0.4, KH + 0.4, 0.3, TB - 0.08, TB - 0.06, BLACK_ANO, parent=root, seg=8)
tray.location.y = KY

# thumb scoop on the front edge
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1, location=(0, -D / 2, TB + 0.05))
scoop = bpy.context.active_object
scoop.scale = (2.4, 0.62, 0.36)
scoop.hide_render = True
scoop.display_type = "WIRE"
boolean(base, scoop)

# keys
anchor = link(bpy.data.objects.new("kb-anchor", None), root)
anchor.location = (0, KY, 0)
KEYM = key_material(KW, KH, anchor)
for k in kb["keys"]:
    if k["style"] == "touch":
        tid = prism("touchid", k["w"], k["h"], 0.14, TB - 0.06, TB + 0.035, mat("touchid", "#151517", metallic=0.4, rough=0.15, coat=1.0), bevel=0.02, seg=6, parent=root)
        tid.location = (k["x"], KY + k["y"], 0)
        continue
    key = prism("key", k["w"], k["h"], 0.12, TB - 0.06, TB + 0.03, KEYM, bevel=0.035, seg=6, bevel_seg=3, parent=root)
    key.location = (k["x"], KY + k["y"], 0)

# speaker grilles
GM = grille_material()
for sx in (-1, 1):
    g = plane("grille", 1.05, KH, 0.2, TB + 0.0006, GM, parent=root)
    g.location = (sx * (KW / 2 + 0.95), KY, 0)

# trackpad with its thin gap
PW, PH = 14.0, 8.3
PY = -D / 2 + 0.95 + PH / 2
boolean(base, cutter("pad-cut", PW + 0.07, PH + 0.07, 0.42, TB - 0.03, TB + 1, (0, PY, 0)))
gap = prism("pad-gap", PW + 0.08, PH + 0.08, 0.42, TB - 0.04, TB - 0.03, PORT, parent=root, seg=8)
gap.location.y = PY
pad = prism("trackpad", PW, PH, 0.38, TB - 0.03, TB - 0.002, ALU_PAD, bevel=0.025, seg=10, parent=root)
pad.location.y = PY

# ports (right: HDMI, USB-C, SD — left: MagSafe, USB-C x2, headphone): rounded slots on the sides
def port(x, y, length, height):
    p = prism("port", height, length, height * 0.48, -0.03, 0.03, PORT, seg=6, parent=root)
    p.rotation_euler.y = math.radians(90)
    p.location = (x, y, TB * 0.47)


for y, ln, ht in ((-4.6, 1.45, 0.42), (-2.4, 0.86, 0.27), (0.2, 2.4, 0.16)):
    port(W / 2 - 0.015, y, ln, ht)
for y, ln, ht in ((5.2, 1.65, 0.26), (2.6, 0.86, 0.27), (1.1, 0.86, 0.27), (-6.2, 0.36, 0.36)):
    port(-W / 2 + 0.015, y, ln, ht)
for x, y in ((-12.5, -8.5), (12.5, -8.5), (-12.5, 8.5), (12.5, 8.5)):
    f = prism("foot", 1.1, 1.1, 0.55, -0.12, 0.0, RUBBER, seg=10, parent=root)
    f.location = (x, y, 0)

# hinge (black bar) + lid
PIV = (0, D / 2 - 0.62, TB + 0.24)
bpy.ops.mesh.primitive_cylinder_add(radius=0.34, depth=W - 3.4, vertices=64, location=PIV, rotation=(0, math.radians(90), 0))
hinge = bpy.context.active_object
hinge.data.materials.append(BLACK_ANO)
for p in hinge.data.polygons:
    p.use_smooth = True
hinge.parent = root

pivot = link(bpy.data.objects.new("lid-pivot", None), root)
pivot.location = PIV
LD, LT = 21.55, 0.46
lid = prism("lid", W, LD, 1.1, -0.24, LT - 0.24, ALU, bevel=0.12, bevel_seg=6, parent=pivot)
lid.location = (0, -(LD / 2 - 0.62), 0)
glass = prism("display-glass", W - 0.16, LD - 0.16, 1.02, -0.2475, -0.24, GLASS, bevel=0.01, seg=12, parent=lid)
SW = W - 0.16 - 0.7
SH = SW / 1.545
top_y = -LD / 2 + 0.08 + 0.36
SC_Y = top_y + SH / 2
SCREEN_M = screen_material()
scr = plane("screen", SW, SH, 0.42, -0.2482, SCREEN_M, seg=10, flip=True, parent=lid)
scr.location.y = SC_Y
notch = plane("notch", 3.05, 0.62 * 2, 0.26, -0.2486, mat("notch", "#000000", rough=0.7, spec=0.1), seg=8, flip=True, parent=lid)
notch.location.y = top_y  # half of it hides behind the top bezel
cam_lens = plane("camera", 0.16, 0.16, 0.08, -0.249, mat("lens", "#0c1622", rough=0.05, coat=1.0), seg=8, flip=True, parent=lid)
cam_lens.location.y = top_y + 0.2
pivot.rotation_euler.x = math.radians(-110)

# ---------------------------------------------------------------- studio
tint = srgb(TINT)
FLOOR = mat("floor", "#050506", rough=0.3, spec=0.5)
WALL = mat("wall", "#08080a", rough=0.9)
me = bpy.data.meshes.new("cyc")
bm = bmesh.new()
prof = [(-400, 0), (90, 0), (90, 300)]
L = [bm.verts.new((-400, y, z)) for y, z in prof]
R = [bm.verts.new((400, y, z)) for y, z in prof]
bm.faces.new((L[0], R[0], R[1], L[1]))
bm.faces.new((L[1], R[1], R[2], L[2]))
bm.to_mesh(me)
bm.free()
cyc = link(bpy.data.objects.new("cyclorama", me))
cyc.data.materials.append(FLOOR)
bv = cyc.modifiers.new("bevel", "BEVEL")
bv.width, bv.segments = 70, 24
for p in me.polygons:
    p.use_smooth = True

world = bpy.data.worlds.new("world")
scene.world = world
world.use_nodes = True
wn = world.node_tree
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(TEX, "studio_small_09_2k.exr"))
mp = wn.nodes.new("ShaderNodeMapping")
tc = wn.nodes.new("ShaderNodeTexCoord")
mp.inputs["Rotation"].default_value = (0, 0, math.radians(200))
wn.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
wn.links.new(mp.outputs[0], env.inputs[0])
wn.nodes["Background"].inputs["Strength"].default_value = 0.45
wn.links.new(env.outputs["Color"], wn.nodes["Background"].inputs["Color"])


def area(name, loc, size, power, color=(1, 1, 1), look=(0, 0, 0), visible=False):
    l = bpy.data.lights.new(name, "AREA")
    l.shape = "RECTANGLE"
    l.size, l.size_y = size
    l.energy = power
    l.color = color
    o = link(bpy.data.objects.new(name, l))
    o.location = loc
    o.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    o.visible_camera = visible
    return o


# studio lights only touch the laptop (light linking), so floor and wall stay dark like a product shot
dev = bpy.data.collections.new("laptop-parts")
scene.collection.children.link(dev)
for ob in [root] + list(root.children_recursive):
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    dev.objects.link(ob)
for name, loc, size, power, col, look in (
    ("softbox-top", (0, -18, 85), (110, 55), 95000, (1, 1, 1), (0, 0, 0)),
    ("softbox-back", (0, 70, 75), (140, 45), 70000, (1, 1, 1), (0, -10, 0)),
    ("key-left", (-75, -45, 45), (45, 45), 30000, (1, 0.97, 0.94), (0, 0, 5)),
    ("rim-right", (70, 45, 35), (25, 60), 26000, (0.94, 0.97, 1), (0, 0, 8)),
):
    lo = area(name, loc, size, power, col, look=look)
    lo.light_linking.receiver_collection = dev
area("wall-glow", (0, 30, 6), (90, 20), 60000, tint, look=(0, 90, 40))
# light spilling from the display onto the keyboard (invisible itself)
spill = area("screen-spill", (0, D / 2 - 2.5, 13), (28, 17), 5000, (0.85, 0.9, 1.0), look=(0, -30, 0))
spill.visible_glossy = False

# ---------------------------------------------------------------- camera (short orbit, closed loop)
cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 62
cam_data.dof.use_dof = True
target = link(bpy.data.objects.new("target", None))
target.location = (0, 1.5, 8.5)
cam_data.dof.focus_object = target
cam_data.dof.aperture_fstop = 0.9
cam = link(bpy.data.objects.new("cam", cam_data))
scene.camera = cam
tcn = cam.constraints.new("TRACK_TO")
tcn.target = target
tcn.track_axis = "TRACK_NEGATIVE_Z"
tcn.up_axis = "UP_Y"
R0, H0 = 70, 30
for f in range(1, FRAMES + 1):
    ph = (f - 1) / FRAMES * math.tau
    yaw = math.radians(-24 + 7 * math.sin(ph))
    cam.location = (target.location.x + R0 * math.sin(-yaw), target.location.y - R0 * math.cos(yaw), H0 + 2.2 * math.sin(ph + 1.3))
    cam.keyframe_insert("location", frame=f)

# ---------------------------------------------------------------- render
r = scene.render
r.engine = "CYCLES"
r.resolution_x = r.resolution_y = RES
r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGB"
r.image_settings.compression = 15
scene.view_settings.view_transform = "Standard"
cy = scene.cycles
cy.samples = SAMPLES
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.02
cy.use_denoising = True
cy.denoiser = "OPENIMAGEDENOISE"
cy.max_bounces = 8
cy.glossy_bounces = 4
cy.caustics_reflective = cy.caustics_refractive = False
prefs = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try:
        prefs.compute_device_type = kind
        prefs.get_devices()
        if any(d.type == kind for d in prefs.devices):
            for d in prefs.devices:
                d.use = d.type == kind
            cy.device = "GPU"
            break
    except Exception:  # noqa: BLE001
        pass

os.makedirs(OUT, exist_ok=True)
if STILL is not None:
    scene.frame_set(max(1, int(float(STILL) * 30) + 1))
    r.filepath = os.path.join(OUT, "still.png")
    bpy.ops.render.render(write_still=True)
else:
    r.filepath = os.path.join(OUT, "")
    bpy.ops.render.render(animation=True)
