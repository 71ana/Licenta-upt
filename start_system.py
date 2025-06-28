import subprocess
import sys
import os
import time
import threading
import signal
from pathlib import Path

class UnifiedSystemLauncher:
    def __init__(self):
        self.base = Path(__file__).parent
        self.backend = self.base / "backend"
        self.frontend = self.base / "dashboard" / "detector-dashboard"
        self.procs = []
        self.running = True
        self.npm = None

    def find_npm(self):
        try:
            if subprocess.run(["npm", "--version"], capture_output=True).returncode == 0:
                return "npm"
        except:
            pass
        
        if sys.platform.startswith('win'):
            import os
            user_npm = Path(os.environ.get('APPDATA', '')) / "npm" / "npm.cmd"
            if user_npm.exists():
                return str(user_npm)
    
        return None

    def check_deps(self):
        try:
            import psycopg2
            psycopg2.connect(dbname='traffic', user='postgres', password='1234', host='localhost', port='5432').close()
        except: return False

        if not any((self.backend / f).exists() for f in ["anomaly_detector_model.pkl"]):
            return False

        for pkg in ['flask', 'flask_cors', 'psycopg2', 'pyshark', 'pandas', 'sklearn', 'joblib', 'flask_socketio']:
            try: __import__(pkg)
            except: return False

        self.npm = self.find_npm()
        return True

    def setup_db(self):
        import psycopg2
        conn = psycopg2.connect(dbname='traffic', user='postgres', password='1234', host='localhost', port='5432')
        c = conn.cursor()
        c.execute("""CREATE TABLE IF NOT EXISTS rezultate (
            id SERIAL PRIMARY KEY, durata FLOAT, total_fwd_packets INT, total_bwd_packets INT,
            total_length_fwd INT, total_length_bwd INT, bytes_per_sec FLOAT, packets_per_sec FLOAT,
            attack VARCHAR(50), probability FLOAT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            src_ip VARCHAR(45), dst_ip VARCHAR(45), src_port INT, dst_port INT, protocol VARCHAR(10))""")
        conn.commit(); c.close(); conn.close()

    def start_proc(self, name, cmd, cwd, env=None):
        p = subprocess.Popen(
            cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env={**os.environ, **(env or {})},
            shell=isinstance(cmd, str),
            startupinfo=self.hide_console() if sys.platform.startswith('win') else None
        )
        self.procs.append((name, p))
        return p

    def hide_console(self):
        s = subprocess.STARTUPINFO()
        s.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        s.wShowWindow = subprocess.SW_HIDE
        return s

    def monitor(self, name, p):
        while self.running and p.poll() is None:
            line = p.stdout.readline()
            if line:
                print(f"[{name}] {line.decode().strip()}")

    def wait_api(self):
        try: import requests
        except: time.sleep(5); return True
        for _ in range(15):
            try:
                if requests.get("http://localhost:5000/api/health", timeout=2).status_code == 200: return True
            except: pass
            time.sleep(1)
        return True

    def install_npm(self):
        if not self.npm: return False
        if (self.frontend / "node_modules").exists(): return True
        return subprocess.run([self.npm, "install"], cwd=self.frontend).returncode == 0

    def stop_all(self):
        self.running = False
        time.sleep(1)
        for name, p in self.procs:
            if p.poll() is None:
                p.terminate()
                try: p.wait(timeout=5)
                except: p.kill()

    def signal_handler(self, *_):
        self.stop_all()
        sys.exit(0)

    def run(self):
        signal.signal(signal.SIGINT, self.signal_handler)
        print("System starting...")

        if not self.check_deps():
            print("Missing deps."); return
        self.setup_db()

        api = self.start_proc("API", "python api_server.py", self.backend)
        threading.Thread(target=self.monitor, args=("API", api), daemon=True).start()
        self.wait_api()

        cap = self.start_proc("Capture", "python capture_logic.py", self.backend)
        threading.Thread(target=self.monitor, args=("Capture", cap), daemon=True).start()

        if self.npm and self.frontend.exists() and self.install_npm():
            fe = self.start_proc("Frontend", [self.npm, "run", "dev"], self.frontend)
            threading.Thread(target=self.monitor, args=("Frontend", fe), daemon=True).start()

        print("Running. Ctrl+C to stop.")
        while self.running: time.sleep(1)

if __name__ == "__main__":
    UnifiedSystemLauncher().run()
