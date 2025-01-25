
import subprocess
import os
from multiprocessing import Process



class ffmpeg:
    def __init__(self, scale):
        self.process = None
        self.scale = scale
    
    def start(self):
        # os.system(f"ffmpeg -f x11grab -framerate 14 -i :0.0 -vf scale={self.scale[0]}:-1 -vsync cfr -r 14 -f rawvideo -pix_fmt rgb24 pipe:>/tmp/ffmpeg_pipe &")
        os.system(f"ffmpeg -f x11grab -framerate 14 -i :0.0 -vf scale={self.scale[0]}:-1 -vsync cfr -r 14 -f mjpeg -q:v 2 pipe:>/tmp/ffmpeg_pipe &")
        
    def end(self):
        self.process.terminate() 

