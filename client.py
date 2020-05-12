import socket
import pyaudio
import time 

p = pyaudio.PyAudio()

inAddress = "127.0.0.1"
outAddress = "127.0.0.1"
inPort = 8081
outPort = 8080


## sending your voice to your friends using socket 
outSocket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
## recieving voice 
inSocket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
inSocket.bind(("",inPort))
inSocket.setblocking(1)

## gives a strem output that is recieved by it
outStream = p.open(format=8, channels=1, rate=44100, output=True)

## send your voice to your friend here
def sendtoDost(in_data, frame_count, time_info, status):
    outSocket.sendto(in_data,(outAddress, outPort))
    return (in_data, pyaudio.paContinue)

## input stream that take input from mic from laptop
inStream = p.open(format=8, channels=1, rate=44100, input=True, stream_callback=sendtoDost)


inStream.start_stream()
# outStream.start_stream()

while inStream.is_active(): 
    time.sleep(0.1)
    try:
        data, ip = inSocket.recvfrom(2048)
        print(data)
        outStream.write(data)
    except KeyboardInterrupt:
        break


print("\n Exiting .......")
inSocket.close()
outSocket.close()
inStream.close()
inStream.stop_stream()
inStream.close()
outStream.close()
outStream.stop_stream()
outStream.close()
p.terminate()
