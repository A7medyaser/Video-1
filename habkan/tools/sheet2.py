import sys
from PIL import Image, ImageDraw
out, cols = sys.argv[1], int(sys.argv[2]); files = sys.argv[3:]
im0 = Image.open(files[0]); w0, h0 = im0.size
tw = 300 if h0 > w0 else 480; th = int(tw * h0 / w0)
rows = (len(files) + cols - 1) // cols
S = Image.new('RGB', (tw * cols, th * rows), '#444')
for i, f in enumerate(files):
    S.paste(Image.open(f).convert('RGB').resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
    ImageDraw.Draw(S).text(((i % cols) * tw + 4, (i // cols) * th + 3), f.split('_')[-1][:-4], fill='red')
S.save(out)
