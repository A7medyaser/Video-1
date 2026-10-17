import sys
from PIL import Image, ImageDraw
files=sys.argv[2:]; out=sys.argv[1]
w,h=640,360; cols=3; rows=(len(files)+cols-1)//cols
S=Image.new('RGB',(w*cols,h*rows),'#333')
for i,f in enumerate(files):
    im=Image.open(f).convert('RGB').resize((w,h)); S.paste(im,((i%cols)*w,(i//cols)*h))
    ImageDraw.Draw(S).text(((i%cols)*w+8,(i//cols)*h+6),f.split('_')[-1],fill='yellow')
S.save(out)
