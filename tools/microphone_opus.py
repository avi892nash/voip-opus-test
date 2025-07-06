import pyaudio
import wave
import sys
import subprocess

CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100

p = pyaudio.PyAudio()

stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)
print(FORMAT)
print("* Started")


while True:
    try:
        data = stream.read(CHUNK)
        q = (map(ord,data))
        print(type(data))
        subprocess.Popen(["opusenc","--raw","--raw-rate",str(RATE),"--raw-chan",str(CHANNELS),"sample.wav","test.opus"])
    except KeyboardInterrupt:
        break


print("* Stoped")

stream.stop_stream()
stream.close()
p.terminate()

