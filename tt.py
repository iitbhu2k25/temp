import socket

try:
    sock = socket.create_connection(("localhost", 9090), timeout=5)
    sock.close()
    print("Connection successful")
except Exception as e:
    print(f"Connection failed: {e}")