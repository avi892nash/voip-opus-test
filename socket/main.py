import socket
import time

my_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

my_socket.bind(("",8080))

my_socket.setblocking(1)
while 1:
    try:
        # get the data sent to us
        try:
            data, ip = my_socket.recvfrom(4096)
            print("testing")
            # display
            print(len(data))
            # echo back
            # my_socket.sendto(data, ip)
        except Exception as e:
            print(e)
        
        # time.sleep(0.2)
        
    except KeyboardInterrupt:
        break
    

my_socket.close()

