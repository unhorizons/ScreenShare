
import platform


if platform.system() == 'Windows':
    import win32pipe
    import win32file
    import pywintypes

import os

class Pipe:

    def __init__(self, name):
        self.name = name

        self.pipe = None
        self.pipe_name = ''
        self.opened = False
        self.platform =  platform.system()

        if self.platform == 'Windows':
            self.pipe_name = f'\\\\.\\pipe\\{name}'
            self.pipe = win32pipe.CreateNamedPipe(
                self.pipe_name,
                win32pipe.PIPE_ACCESS_INBOUND,
                win32pipe.PIPE_TYPE_BYTE | win32pipe.PIPE_WAIT,
                1, 1048576, 1048576, 0, None
            )
        elif self.platform == 'Linux':
            self.pipe_name = f"/tmp/{name}"  # Linux named pipe (FIFO)
            if not os.path.exists(self.pipe_name):
                os.mkfifo(self.pipe_name)
        else:
            raise Exception("Platform not yet supported")
    
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def open(self):
        if self.opened:
            return self

        if self.platform == 'Windows':
            print("Waiting for a client to connect...")
            win32pipe.ConnectNamedPipe(self.pipe, None)
        elif self.platform == 'Linux':
            self.pipe = open(self.pipe_name, "rb")
            # pipe_fd = os.open(self.pipe_name, os.O_RDONLY | os.O_NONBLOCK)
            # self.pipe = os.fdopen(pipe_fd, "rb", buffering=0)
        else:
            raise Exception("Platform not yet supported")
            
        self.opened = True
        return self

    def read(self, size):
        if not self.opened:
            raise Exception("Cannot read from an unopened pipe")

        if self.platform == 'Windows':
            return win32file.ReadFile(self.pipe, size)[1]
        elif self.platform == 'Linux':
            return self.pipe.read(size)
        else:
            raise Exception("How did you even get here? THIS PLATFORM IS NOT SUPPORTED!!!")

    def close(self):
        if not self.opened:
            return
        self.opened = False
        if self.platform == 'Windows':
            win32pipe.DisconnectNamedPipe(self.pipe)
            win32file.CloseHandle(self.pipe)
        elif self.platform == 'Linux':
            self.pipe.close()
        else:
            raise Exception("Again, how did you even get here? THIS PLATFORM IS NOT SUPPORTED!!!")
