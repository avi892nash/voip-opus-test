import pyaudio
import wave 
import time
import sys 

wf = wave.open('/home/avinash/Desktop/The Avengers Theme Song.wav', 'rb')
p = pyaudio.PyAudio()

def callback(in_data, frame_count, time_info, status):
    data = wf.readframes(frame_count)
    # print (len(in_data))
    # print(in_data)
    if in_data:
        return (in_data, pyaudio.paContinue)
    else:
        return ("01".encode(),pyaudio.paContinue)

stream = p.open(format=p.get_format_from_width(wf.getsampwidth()),
        channels=2,
        rate=wf.getframerate(),
        input=True,
        output=True,
        stream_callback=callback
        )

stream.start_stream()

while stream.is_active():
    try: 
        time.sleep(0.1)
    except KeyboardInterrupt:
        break
print ("\nExiting wait.....")
stream.stop_stream()
stream.close()
wf.close()
p.terminate()