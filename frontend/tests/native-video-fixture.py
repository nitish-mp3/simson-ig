import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time

mode = sys.argv[1]
if mode == "setup":
    for port in (19088, 19038):
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", port))
    root = Path(tempfile.mkdtemp(prefix="simson-video-probe-", dir="/tmp"))
    for directory in ("run", "log", "lib", "spool", "keys"):
        (root / directory).mkdir()
    def write(name, body):
        (root / name).write_text(body)
    write("asterisk.conf", f"""[directories]
astetcdir = {root}
astmoddir = /usr/lib/asterisk/modules
astvarlibdir = {root}/lib
astdbdir = {root}/lib
astkeydir = {root}/keys
astdatadir = /usr/share/asterisk
astagidir = {root}/lib
astspooldir = {root}/spool
astrundir = {root}/run
astlogdir = {root}/log
[options]
verbose = 2
debug = 0
""")
    write("modules.conf", "[modules]\nautoload=yes\n" + "".join("noload=" + name + ".so\n" for name in (
        "chan_sip", "chan_iax2", "chan_mgcp", "chan_skinny", "chan_unistim", "pbx_dundi", "res_snmp")))
    write("http.conf", "[general]\nenabled=yes\nbindaddr=127.0.0.1\nbindport=19088\n")
    write("manager.conf", "[general]\nenabled=yes\nport=19038\nbindaddr=127.0.0.1\n[probe]\nsecret=fixture-only\nread=all\nwrite=originate,system\n")
    write("logger.conf", "[general]\n[logfiles]\nfull=notice,warning,error,verbose\n")
    write("rtp.conf", "[general]\nrtpstart=59900\nrtpend=59920\nicesupport=yes\n")
    write("confbridge.conf", "[probe-bridge]\ntype=bridge\nvideo_mode=first_marked\ninternal_sample_rate=8000\n[probe-user]\ntype=user\nquiet=yes\n[probe-source]\ntype=user\nquiet=yes\nmarked=yes\n")
    write("extensions.conf", "[probe]\nexten => probe-room,1,Answer()\nsame => n,ConfBridge(probe-room,probe-bridge,probe-user)\nsame => n,Hangup()\nexten => source-room,1,Answer()\nsame => n,ConfBridge(probe-room,probe-bridge,probe-source)\nsame => n,Hangup()\n")
    endpoints = "[transport-ws]\ntype=transport\nprotocol=ws\nbind=127.0.0.1\n"
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as route:
        route.connect(("8.8.8.8", 53))
        media_address = route.getsockname()[0]
    for name in ("probe-source", "probe-viewer"):
        endpoints += f"""[{name}]
type=endpoint
context=probe
disallow=all
allow=ulaw,alaw,h264
auth={name}
aors={name}
webrtc=yes
dtls_auto_generate_cert=yes
direct_media=no
media_address={media_address}
bind_rtp_to_media_address=yes
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
[{name}]
type=auth
auth_type=userpass
username={name}
password=fixture-only
[{name}]
type=aor
max_contacts=1
remove_existing=yes
"""
    write("pjsip.conf", endpoints)
    with open(root / "startup.log", "wb") as log:
        process = subprocess.Popen(["/usr/sbin/asterisk", "-f", "-n", "-q", "-C", str(root / "asterisk.conf")], stdout=log, stderr=log, start_new_session=True)
    write("pid", str(process.pid))
    ready = False
    for attempt in range(50):
        if process.poll() is not None:
            break
        try:
            with socket.create_connection(("127.0.0.1", 19088), timeout=0.2):
                ready = True
                break
        except OSError:
            time.sleep(0.2)
    if not ready:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        shutil.rmtree(root)
        print(json.dumps({"ready": False}))
        sys.exit(1)
    ice = json.loads(Path("/opt/simson/config.json").read_text())["ice"]
    username = str(int(time.time()) + 300) + ":isolated-video-fixture"
    secret = ice.get("turn_auth_secret", "")
    credential = base64.b64encode(hmac.new(secret.encode(), username.encode(), hashlib.sha1).digest()).decode()
    print(json.dumps({"root": str(root), "ready": True, "ice": [{"urls": ice.get("turn_urls", []), "username": username, "credential": credential}]}))
else:
    root = Path(sys.argv[2]).resolve()
    if root.parent != Path("/tmp") or not root.name.startswith("simson-video-probe-"):
        raise RuntimeError("Unexpected probe directory")
    if mode == "originate":
        with socket.create_connection(("127.0.0.1", 19038), timeout=3) as connection:
            connection.sendall(b"Action: Login\r\nUsername: probe\r\nSecret: fixture-only\r\nEvents: off\r\n\r\n")
            time.sleep(0.1)
            connection.recv(8192)
            connection.sendall(b"Action: Originate\r\nChannel: PJSIP/probe-source\r\nContext: probe\r\nExten: source-room\r\nPriority: 1\r\nCodecs: ulaw,alaw,h264\r\nAsync: true\r\nTimeout: 15000\r\n\r\n")
            print(connection.recv(8192).decode())
    elif mode == "diagnostics":
        result = subprocess.run(["asterisk", "-C", str(root / "asterisk.conf"), "-rx", "core show channels concise"], capture_output=True, text=True)
        print(result.stdout)
        lines = (root / "log/full").read_text(errors="replace").splitlines() if (root / "log/full").exists() else []
        print("\n".join(line for line in lines if any(word in line.lower() for word in ("translator", "negotiate", "sdp", "video")))[-2000:])
    elif mode == "cleanup":
        pid = int((root / "pid").read_text())
        command = Path(f"/proc/{pid}/cmdline")
        if command.exists() and str(root).encode() in command.read_bytes():
            os.kill(pid, signal.SIGTERM)
            time.sleep(0.5)
        shutil.rmtree(root)
        print("Isolated fixture removed")
