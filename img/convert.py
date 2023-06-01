#program to resize image to power of 2

from skimage import io
import sys
if len(sys.argv) < 3:
    print "give filenames"
    exit()

img = io.imread(sys.argv[1])

w = 1
h = 1

while 2*w < img.shape[0]:
    w *= 2
while 2*h < img.shape[1]:
    h *= 2

io.imsave(sys.argv[2], img[:w, :h])
