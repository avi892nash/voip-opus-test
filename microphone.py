import pyaudio
import wave
import sys
import keyboard
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 2
RATE = 44100

p = pyaudio.PyAudio()

stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)

print("* Started")


while True:
    try:
        data = stream.read(CHUNK)
        print(data)
    except KeyboardInterrupt:
        break


print("* Stoped")

stream.stop_stream()
stream.close()
p.terminate()

