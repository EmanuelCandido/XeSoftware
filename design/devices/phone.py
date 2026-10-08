"""Renderiza um celular 3D com a tela animada (sequência de imagens).

Uso (Blender em segundo plano):
  blender -b -P design/devices/phone.py -- --screen <pasta com 0001.jpg...>
          --frames 360 --out <pasta> [--still 0.3] [--samples 48] [--res 560x960]

A câmera/aparelho oscila em um ciclo fechado do primeiro ao último quadro,
então o vídeo final faz loop sem emenda. O fundo sai transparente (PNG RGBA).
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
opt = {}
for i in range(0, len(argv), 2):
    opt[argv[i].lstrip("-")] = argv[i + 1]
SCREEN = opt["screen"]
FRAMES = int(opt.get("frames", 300))
OUT = opt["out"]
STILL = opt.get("still")
SAMPLES = int(opt.get("samples", 64))
RES = [int(v) for v in opt.get("res", "560x960").split("x")]

# ---------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.frame_start, scene.frame_end = 1, FRAMES
scene.render.fps = 30


# ---------------------------------------------------------------- helpers
def rrect(w, h, r, seg=14):
    """Pontos de um retângulo arredondado (sentido anti-horário)."""
    pts = []
    corners = [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]
    for cx, cy, a0 in corners:
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def prism(name, w, h, r, z0, z1, mat, bevel=0.0, seg=14, bevel_seg=4, uv=False):
    """Sólido com contorno arredondado entre z0 e z1, com chanfro suave nas bordas."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = rrect(w, h, r, seg)
    bottom = [bm.verts.new((x, y, z0)) for x, y in pts]
    top = [bm.verts.new((x, y, z1)) for x, y in pts]
    bm.faces.new(list(reversed(bottom)))
    ftop = bm.faces.new(top)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bottom[i], bottom[j], top[j], top[i]))
    if uv:
        lay = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            for loop in f.loops:
                x, y, _ = loop.vert.co
                loop[lay].uv = (x / w + 0.5, y / h + 0.5)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.append(mat)
    if bevel > 0:
        m = ob.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = bevel_seg
        m.limit_method = "ANGLE"
        m.angle_limit = math.radians(40)
        m.harden_normals = True
    for p in me.polygons:
        p.use_smooth = True
    ob.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
    return ob


def plane(name, w, h, r, z, mat, seg=14, flip=False):
    """Face plana arredondada com UV 0..1 (para a tela). flip: normal para -Z."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = rrect(w, h, r, seg)
    vs = [bm.verts.new((x, y, z)) for x, y in pts]
    f = bm.faces.new(list(reversed(vs)) if flip else vs)
    lay = bm.loops.layers.uv.new("UVMap")
    for loop in f.loops:
        x, y, _ = loop.vert.co
        loop[lay].uv = (x / w + 0.5, (0.5 - y / h) if flip else (y / h + 0.5))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def box(name, sx, sy, sz, loc, mat, bevel=0.02, parent=None):
    ob = prism(name, sx, sy, min(sx, sy) * 0.18, -sz / 2, sz / 2, mat, bevel=bevel, seg=4, bevel_seg=3)
    ob.location = loc
    if parent:
        ob.parent = parent
    return ob


def principled(name, color, metallic=0.0, rough=0.4, coat=0.0, aniso=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.03
    b.inputs["Anisotropic"].default_value = aniso
    b.inputs["Specular IOR Level"].default_value = spec
    return m


def srgb(hexv):
    hexv = hexv.lstrip("#")
    c = [int(hexv[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def screen_material():
    """Tela: imagem emissiva (cores exatas) com um reflexo de vidro bem sutil por cima."""
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
    gloss.inputs["Roughness"].default_value = 0.04
    gloss.inputs["Color"].default_value = (1, 1, 1, 1)
    fres = nt.nodes.new("ShaderNodeFresnel")
    fres.inputs["IOR"].default_value = 1.5
    # keep the reflection faint (about a tenth of real glass) so it never hides the content
    faint = nt.nodes.new("ShaderNodeMath")
    faint.operation = "MULTIPLY"
    faint.inputs[1].default_value = 0.1
    nt.links.new(fres.outputs[0], faint.inputs[0])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(faint.outputs[0], mix.inputs[0])
    nt.links.new(emis.outputs[0], mix.inputs[1])
    add = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(emis.outputs[0], add.inputs[0])
    nt.links.new(gloss.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m


# ---------------------------------------------------------------- materials
M_GLASS = principled("glass", srgb("#050506"), rough=0.02, coat=1.0, spec=0.6)
M_BLACK = principled("black", srgb("#0b0b0c"), rough=0.35)
M_SCREEN = screen_material()

root = bpy.data.objects.new("device", None)
bpy.context.collection.objects.link(root)


def build_phone():
    ti = principled("titanium", srgb("#9a968f"), metallic=1.0, rough=0.24, aniso=0.3)
    ti_dark = principled("titanium-dark", srgb("#55534f"), metallic=0.6, rough=0.45)
    W, H, T, R = 7.16, 14.76, 0.83, 1.18
    parts = [
        prism("frame", W, H, R, -T / 2, T / 2 - 0.05, ti, bevel=0.14, bevel_seg=6),
        prism("back", W - 0.1, H - 0.1, R - 0.05, -T / 2 - 0.005, -T / 2 + 0.06, principled("back", srgb("#2c2c2e"), rough=0.55), bevel=0.04),
        prism("front", W - 0.12, H - 0.12, R - 0.06, T / 2 - 0.1, T / 2, M_GLASS, bevel=0.05, bevel_seg=5),
    ]
    sw, sh = 6.66, 6.66 * 852 / 393
    parts.append(plane("screen", sw, sh, 0.98, T / 2 + 0.0015, M_SCREEN, seg=18))
    parts.append(prism("island", 1.26, 0.37, 0.185, T / 2, T / 2 + 0.003, principled("island", srgb("#000000"), rough=0.15), seg=10))
    parts[-1].location.y = sh / 2 - 0.55
    # side buttons
    parts.append(box("action", 0.06, 0.55, 0.32, (-W / 2 - 0.02, 4.55, 0), ti, bevel=0.015))
    parts.append(box("vol-up", 0.06, 1.0, 0.32, (-W / 2 - 0.02, 3.25, 0), ti, bevel=0.015))
    parts.append(box("vol-down", 0.06, 1.0, 0.32, (-W / 2 - 0.02, 1.95, 0), ti, bevel=0.015))
    parts.append(box("power", 0.06, 1.6, 0.32, (W / 2 + 0.02, 2.9, 0), ti, bevel=0.015))
    # antenna bands on the frame
    for x, y in ((-W / 2 + 0.01, 6.2), (W / 2 - 0.01, 6.2), (-W / 2 + 0.01, -6.2), (W / 2 - 0.01, -6.2)):
        parts.append(box("band", 0.05, 0.08, 0.6, (x, y, -0.02), ti_dark, bevel=0.005))
    for p in parts:
        p.parent = root
    return H


build_phone()

# ---------------------------------------------------------------- light & world
world = bpy.data.worlds.new("world")
scene.world = world
world.use_nodes = True
wn = world.node_tree
env = wn.nodes.new("ShaderNodeTexEnvironment")
hdr = os.path.join(os.path.dirname(bpy.app.binary_path), f"{bpy.app.version[0]}.{bpy.app.version[1]}", "datafiles", "studiolights", "world", "studio.exr")
env.image = bpy.data.images.load(hdr)
mapping = wn.nodes.new("ShaderNodeMapping")
coord = wn.nodes.new("ShaderNodeTexCoord")
mapping.inputs["Rotation"].default_value = (0, 0, math.radians(140))
wn.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
wn.links.new(mapping.outputs[0], env.inputs[0])
bg = wn.nodes["Background"]
bg.inputs["Strength"].default_value = 1.0
wn.links.new(env.outputs["Color"], bg.inputs["Color"])


def area(name, loc, size, power, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, "AREA")
    l.shape = "RECTANGLE"
    l.size, l.size_y = size
    l.energy = power
    l.color = color
    o = bpy.data.objects.new(name, l)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


# key light (soft, top-left), rim lights to catch the metal edges
area("key", (-40, -30, 55), (60, 40), 52000)
area("rim-l", (-55, 30, 10), (8, 50), 9000, (0.9, 0.95, 1))
area("rim-r", (55, 25, 12), (8, 50), 12000, (1, 0.96, 0.92))

# ---------------------------------------------------------------- camera & motion
cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.collection.objects.link(cam)
scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = RES
scene.render.resolution_percentage = 100
target = bpy.data.objects.new("target", None)
bpy.context.collection.objects.link(target)
tc = cam.constraints.new("TRACK_TO")
tc.target = target
tc.track_axis = "TRACK_NEGATIVE_Z"
tc.up_axis = "UP_Y"

cam_data.lens = 85
cam.location = (0, 0, 46)
# stands up facing the camera with a 3/4 turn; loop: gentle sway
base_rot = (math.radians(-10), math.radians(-26), math.radians(3))
target.location = (0, 0, 0)

for f in range(1, FRAMES + 1):
    ph = (f - 1) / FRAMES * math.tau
    root.rotation_euler = (base_rot[0] + math.sin(ph) * math.radians(3.5),
                           base_rot[1] + math.sin(ph + 1.2) * math.radians(7),
                           base_rot[2] + math.sin(ph + 2.1) * math.radians(1.5))
    root.location = (0, math.sin(ph) * 0.25, 0)
    root.keyframe_insert("rotation_euler", frame=f)
    root.keyframe_insert("location", frame=f)

# ---------------------------------------------------------------- render
r = scene.render
r.engine = "CYCLES"
r.film_transparent = True
r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGBA"
r.image_settings.compression = 15
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
cy = scene.cycles
cy.samples = SAMPLES
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.02
cy.use_denoising = True
cy.denoiser = "OPENIMAGEDENOISE"
cy.max_bounces = 6
cy.glossy_bounces = 4
cy.transmission_bounces = 2
cy.caustics_reflective = cy.caustics_refractive = False
prefs = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try:
        prefs.compute_device_type = kind
        prefs.get_devices()
        devs = [d for d in prefs.devices if d.type == kind]
        if devs:
            for d in prefs.devices:
                d.use = d.type == kind
            cy.device = "GPU"
            print("GPU:", kind, [d.name for d in devs])
            break
    except Exception as e:  # noqa: BLE001
        print("no", kind, e)

os.makedirs(OUT, exist_ok=True)
if STILL is not None:
    scene.frame_set(max(1, int(float(STILL) * 30) + 1))
    r.filepath = os.path.join(OUT, "still.png")
    bpy.ops.render.render(write_still=True)
else:
    r.filepath = os.path.join(OUT, "")
    bpy.ops.render.render(animation=True)
