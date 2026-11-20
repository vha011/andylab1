"""Tạo ảnh đen-trắng minh hoạ (thay bằng ảnh đen-trắng thật của công ty nếu có)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
W, H = 1000, 1200
rng = np.random.default_rng(7)

def halftone(seed_fn, name, step=22):
    g = seed_fn()
    im = Image.new("L", (W, H), 12); d = ImageDraw.Draw(im)
    for y in range(0, H, step):
        for x in range(0, W, step):
            v = g[min(y, H-1), min(x, W-1)]
            r = step * 0.55 * v
            if r > 0.8: d.ellipse([x-r, y-r, x+r, y+r], fill=235)
    im.save(f"assets/{name}.png")

Y, X = np.mgrid[0:H, 0:W]
def blob():  # cụm sáng như tế bào / vi sinh
    g = np.zeros((H, W))
    for _ in range(9):
        cx, cy, s = rng.uniform(100, 900), rng.uniform(100, 1100), rng.uniform(120, 300)
        g += np.exp(-((X-cx)**2 + (Y-cy)**2) / (2*s*s))
    return np.clip(g / g.max() * 1.3, 0, 1)
def wave():
    return np.clip(0.5 + 0.5*np.sin(X/110 + np.sin(Y/170)*3) * np.exp(-((Y-600)**2)/(2*380**2)), 0, 1)
def rings():
    r = np.hypot(X-500, Y-600); return np.clip(0.5+0.5*np.sin(r/38), 0, 1) * np.exp(-r/700)
def diag():
    return np.clip((X*0.6 + Y*0.8)/1400, 0, 1) ** 1.3

for fn, n in [(blob, "img1"), (wave, "img2"), (rings, "img3"), (diag, "img4")]:
    halftone(fn, n)

def network(name, seed):
    r = np.random.default_rng(seed)
    im = Image.new("L", (W, H), 12); d = ImageDraw.Draw(im)
    pts = [(r.uniform(60, W-60), r.uniform(60, H-60)) for _ in range(38)]
    for i, p in enumerate(pts):
        for q in sorted(pts, key=lambda q: (q[0]-p[0])**2 + (q[1]-p[1])**2)[1:4]:
            d.line([p, q], fill=170, width=3)
    for p in pts:
        s = r.uniform(8, 26); d.ellipse([p[0]-s, p[1]-s, p[0]+s, p[1]+s], fill=240)
    im.filter(ImageFilter.GaussianBlur(1.2)).save(f"assets/{name}.png")
network("img5", 3); network("img6", 11)

def hexgrid(name):
    import math
    im = Image.new("L", (W, H), 12); d = ImageDraw.Draw(im); s = 80
    for row in range(-1, 18):
        for col in range(-1, 12):
            cx = col * s * 1.74 + (row % 2) * s * 0.87; cy = row * s * 1.5
            v = 0.5 + 0.5 * math.sin(col*0.7 + row*0.5)
            pts = [(cx + s*0.92*math.cos(math.radians(60*k+30)), cy + s*0.92*math.sin(math.radians(60*k+30))) for k in range(6)]
            if v > 0.55: d.polygon(pts, fill=int(60 + 170*v))
            else: d.polygon(pts, outline=120, width=3)
    im.save(f"assets/{name}.png")
hexgrid("img7")
