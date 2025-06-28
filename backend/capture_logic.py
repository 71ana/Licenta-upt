import pyshark
import pandas as pd
import joblib
import psycopg2
import time
import os
import sys
import numpy as np
import psutil
import winsound
from plyer import notification
from datetime import datetime

if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

model_path = os.path.join(base_dir, 'anomaly_detector_model.pkl')
try:
    model_data = joblib.load(model_path)
    model = model_data['model']
    le = model_data['encoder']
    selected_features = model_data['feature_names']
    print(f"Model loaded: {len(le.classes_)} classes")
    print(f"Model expects {len(selected_features)} features")
    print(f"Model classes: {le.classes_}")
    print(f"Number of classes: {len(le.classes_)}")
    for i, class_name in enumerate(le.classes_):
        print(f"  {i}: {class_name}")
except FileNotFoundError:
    print(f"Model not found at: {model_path}")
    sys.exit(1)
except Exception as e:
    print(f"Error loading model: {e}")
    sys.exit(1)

DB_CONFIG = {
    'dbname': 'traffic',
    'user': 'postgres',
    'password': '1234',
    'host': 'localhost',
    'port': '5432'
}

active_flows = {}
flow_timeout = 60
min_packets_for_analysis = 20
benign_counter = 0
attack_counter = 0
latency_measurements = []
analysis_count = 0
max_measurements = 200

class FlowAnalyzer:
    def __init__(self):
        self.packet_history = {}
        self.selected_features = None
    
    def safe_divide(self, a, b, default=0):
        try:
            if b == 0:
                return default
            result = a / b
            if np.isnan(result) or np.isinf(result):
                return default
            return max(0, result)
        except:
            return default
    
    def extract_features(self, flow_data):
        try:
            duration = max(flow_data['end_time'] - flow_data['start_time'], 0.001)
            total_bytes = flow_data['fwd_bytes'] + flow_data['bwd_bytes']
            total_packets = flow_data['fwd_packets'] + flow_data['bwd_packets']
            
            if total_packets < min_packets_for_analysis:
                return pd.DataFrame()
            
            duration_mili = duration * 1000

            features = {}

            # flow features
            features['Flow Duration'] = duration_mili
            features['Total Fwd Packets'] = int(flow_data['fwd_packets'])
            features['Total Backward Packets'] = int(flow_data['bwd_packets'])
            features['Total Length of Fwd Packets'] = int(flow_data['fwd_bytes'])
            features['Total Length of Bwd Packets'] = int(flow_data['bwd_bytes'])

            # rate features
            features['Flow Bytes/s'] = self.safe_divide(total_bytes, duration)
            features['Flow Packets/s'] = self.safe_divide(total_packets, duration)
            features['Fwd Packets/s'] = self.safe_divide(flow_data['fwd_packets'], duration)
            features['Bwd Packets/s'] = self.safe_divide(flow_data['bwd_packets'], duration)

            # packet size features
            features['Average Packet Size'] = self.safe_divide(total_bytes, total_packets)
            features['Packet Length Mean'] = features['Average Packet Size']
            features['Packet Length Std'] = features['Average Packet Size'] * 0.3

            # flow timing
            features['Flow IAT Mean'] = self.safe_divide(duration*1000, total_packets + 1)

            # tcp flags
            tcp_flags = flow_data.get('tcp_flags', {})
            features['SYN Flag Count'] = tcp_flags.get('SYN', 0)
            features['ACK Flag Count'] = tcp_flags.get('ACK', 0)
            features['FIN Flag Count'] = tcp_flags.get('FIN', 0)
            features['RST Flag Count'] = tcp_flags.get('RST', 0)
            features['PSH Flag Count'] = tcp_flags.get('PSH', 0)
            
            # directional value
            features['Down/Up Ratio'] = self.safe_divide(flow_data['bwd_bytes'], flow_data['fwd_bytes'] + 1, 1)
            
            for key, value in features.items():
                if pd.isna(value) or np.isinf(value):
                    features[key] = 0.0
                else:
                    features[key] = float(value)

            df = pd.DataFrame([features])
            
            if hasattr(self, 'selected_features') and self.selected_features:
                for feature in self.selected_features:
                    if feature not in df.columns:
                        df[feature] = 0.0
                df = df.reindex(columns=self.selected_features, fill_value=0.0)
            
            return df
            
        except Exception as e:
            print(f"Feature extraction error: {e}")
            return pd.DataFrame()

flow_analyzer = FlowAnalyzer()
flow_analyzer.selected_features = selected_features

def get_attack_probability_and_severity(prediction, probabilities, label_encoder):
    predicted_label = label_encoder.inverse_transform([prediction])[0]
    predicted_class_prob = max(probabilities)
    
    if predicted_label == 'BENIGN':
        second_highest = sorted(probabilities, reverse=True)[1] if len(probabilities) > 1 else 0
        attack_probability = 1.0 - predicted_class_prob + (second_highest * 0.5)
        confidence = predicted_class_prob
        
        if confidence < 0.4:
            severity = 'MEDIUM'
        elif attack_probability > 0.4:
            severity = 'LOW'
        else:
            severity = 'SAFE'
    else:
        attack_probability = predicted_class_prob
        confidence = predicted_class_prob
        
        critical_attacks = ['DDOS', 'DOS HULK', 'DOS']
        high_attacks = ['BRUTE FORCE', 'PORTSCAN']
        medium_attacks = ['BOT', 'INJECTION', 'PASSWORD', 'RECONNAISSANCE']
        
        attack_upper = predicted_label.upper().replace('_', ' ').replace('-', ' ')
        
        if any(attack in attack_upper for attack in critical_attacks):
            base_severity = 'CRITICAL'
        elif any(attack in attack_upper for attack in high_attacks):
            base_severity = 'HIGH'
        elif any(attack in attack_upper for attack in medium_attacks):
            base_severity = 'MEDIUM'
        else:
            base_severity = 'MEDIUM'
        
        if attack_probability >= 0.8:
            severity = base_severity
        elif attack_probability >= 0.6:
            if base_severity == 'CRITICAL':
                severity = 'HIGH'
            else:
                severity = base_severity
        elif attack_probability >= 0.4:
            if base_severity == 'CRITICAL':
                severity = 'MEDIUM'
            elif base_severity == 'HIGH':
                severity = 'MEDIUM'
            else:
                severity = 'LOW'
        else:
            severity = 'LOW'
    
    return predicted_label, attack_probability, confidence, severity

def should_save_result(predicted_label, attack_prob):
    global benign_counter, attack_counter
    
    if predicted_label == 'BENIGN':
        benign_counter += 1
        if benign_counter % 5000 == 0:
            return True
        return False
    elif attack_prob > 50:
        attack_counter += 1
        return True

def save_result(flow_data, predicted_label, attack_prob):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        duration = flow_data['end_time'] - flow_data['start_time']
        total_bytes = flow_data['fwd_bytes'] + flow_data['bwd_bytes']
        total_packets = flow_data['fwd_packets'] + flow_data['bwd_packets']
        bps = total_bytes / (duration + 0.001)
        pps = total_packets / (duration + 0.001)
        
        cursor.execute("""
            INSERT INTO rezultate (
                durata, total_fwd_packets, total_bwd_packets,
                total_length_fwd, total_length_bwd,
                bytes_per_sec, packets_per_sec,
                attack, probability, timestamp,
                src_ip, dst_ip, src_port, dst_port, protocol
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            round(duration, 4),
            int(flow_data['fwd_packets']),
            int(flow_data['bwd_packets']),
            int(flow_data['fwd_bytes']),
            int(flow_data['bwd_bytes']),
            round(float(bps), 2),
            round(float(pps), 2),
            str(predicted_label),
            round(float(attack_prob), 4),
            datetime.now(),
            flow_data['src_ip'],
            flow_data['dst_ip'],
            flow_data['src_port'],
            flow_data['dst_port'],
            flow_data['protocol']
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"DB Error: {e}")
        return False

def create_flow_id(src_ip, dst_ip, src_port, dst_port, protocol):
    if src_ip < dst_ip or (src_ip == dst_ip and src_port < dst_port):
        return f"{src_ip}:{src_port}-{dst_ip}:{dst_port}-{protocol}"
    else:
        return f"{dst_ip}:{dst_port}-{src_ip}:{src_port}-{protocol}"

def extract_packet_info(packet):
    try:
        if 'IP' not in packet:
            return None
            
        src_ip = packet.ip.src
        dst_ip = packet.ip.dst
        length = int(packet.length)
        protocol = 'IP'
        src_port = 0
        dst_port = 0
        tcp_flags = {'SYN': 0, 'ACK': 0, 'FIN': 0, 'RST': 0, 'PSH': 0, 'URG': 0}
        
        if hasattr(packet, 'tcp'):
            src_port = int(packet.tcp.srcport)
            dst_port = int(packet.tcp.dstport)
            protocol = 'TCP'
            
            try:
                if hasattr(packet.tcp, 'flags'):
                    flags_value = int(packet.tcp.flags, 16) if isinstance(packet.tcp.flags, str) else int(packet.tcp.flags)
                    tcp_flags = {
                        'SYN': 1 if flags_value & 0x02 else 0,
                        'ACK': 1 if flags_value & 0x10 else 0,
                        'FIN': 1 if flags_value & 0x01 else 0,
                        'RST': 1 if flags_value & 0x04 else 0,
                        'PSH': 1 if flags_value & 0x08 else 0,
                        'URG': 1 if flags_value & 0x20 else 0,
                    }
            except:
                pass
                
        elif hasattr(packet, 'udp'):
            src_port = int(packet.udp.srcport)
            dst_port = int(packet.udp.dstport)
            protocol = 'UDP'
        elif hasattr(packet, 'icmp'):
            protocol = 'ICMP'
            
        return {
            'src_ip': src_ip,
            'dst_ip': dst_ip,
            'src_port': src_port,
            'dst_port': dst_port,
            'protocol': protocol,
            'length': length,
            'tcp_flags': tcp_flags,
            'timestamp': time.time()
        }
    except Exception:
        return None

def send_notification(attack_type, severity, src_ip):
    try:
        title = f"{severity} THREAT"
        message = f"{attack_type} from {src_ip}"

        notification.notify(
            app_name = "Network Anomaly Detection System",
            title = title,
            message = message,
            timeout = 8
        )

        if severity in ["HIGH", "CRITICAL"]:
            winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
    except Exception as e:
        print(f"Notification error: {e}")

def analyze_flow(flow_data):
    global analysis_count
    analysis_start = time.time()

    try:
        total_packets = flow_data['fwd_packets'] + flow_data['bwd_packets']
        print(f"ANALYZING: {flow_data['fwd_packets']}+{flow_data['bwd_packets']}={total_packets} packets")
        
        flow_df = flow_analyzer.extract_features(flow_data)
        
        if flow_df.empty:
            print(f"Feature extraction failed")
            return False
            
        print(f"Features extracted: {len(flow_df.columns)} features")
        
        probabilities = model.predict_proba(flow_df)[0]
        prediction = model.predict(flow_df)[0]

        predicted_label = le.inverse_transform([prediction])
        analysis_end = time.time()
        predicted_prob = max(probabilities)
        
        print(f"PREDICTION: {predicted_label} (confidence: {predicted_prob:.3f})")
        if analysis_count < max_measurements:
            first_packet_time = flow_data.get('start_time')
            latency = (analysis_end - analysis_start) * 1000
            latency_measurements.append(latency)
            analysis_count+=1
        elif analysis_count == max_measurements:
            avg_latency = sum(latency_measurements) / len(latency_measurements)
            min_latency = min(latency_measurements)
            max_latency = max(latency_measurements)
            analysis_count += 1
            with open("latency_measured.text", "a") as f:
                f.write("Raport latenta\n")
                f.write(f"Latenta medie: {avg_latency:.2f} ms/n\n")
                f.write(f"Interval: {min_latency:.2f} - {max_latency:.2f}")

        predicted_label, attack_prob, confidence, severity = get_attack_probability_and_severity(prediction, probabilities, le)
        
        should_save = should_save_result(predicted_label, attack_prob)
        
        if should_save:
            if predicted_label != "BENIGN":
                    send_notification(predicted_label, severity, flow_data['src_ip'])
            
            result = save_result(flow_data, predicted_label, attack_prob)
            
            if result:
                print(f"ALERT: {predicted_label} | Prob: {attack_prob:.3f} | Packets: {total_packets} | Severity: {severity}")
                return True
            else:
                print(f"Database save failed")
                return False
        else:
            print(f"Not saving (classified as BENIGN, will save after {5000 - (benign_counter%5000)})")
            return False
            
    except Exception as e:
        print(f"Analysis error: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_old_flows():
    current_time = time.time()
    flows_to_remove = []
    
    for flow_id, flow_data in active_flows.items():
        if current_time - flow_data['last_seen'] > flow_timeout:
            flows_to_remove.append(flow_id)
    
    for flow_id in flows_to_remove:
        flow_data = active_flows[flow_id]
        total_packets = flow_data['fwd_packets'] + flow_data['bwd_packets']
        
        if total_packets >= min_packets_for_analysis:
            flow_data['end_time'] = flow_data['last_seen']
            analyze_flow(flow_data)
        
        del active_flows[flow_id]

def detect_active_interface():
    initial_stats = psutil.net_io_counters(pernic=True)
    time.sleep(2)
    current_stats = psutil.net_io_counters(pernic=True)
    
    max_activity = 0
    active_interface = None
    
    for interface_name in initial_stats:
        initial = initial_stats[interface_name]
        current = current_stats[interface_name]
        
        bytes_sent = current.bytes_sent - initial.bytes_sent
        bytes_recv = current.bytes_recv - initial.bytes_recv
        activity = bytes_sent + bytes_recv
        
        if activity > max_activity:
            max_activity = activity
            active_interface = interface_name
            
    return active_interface

def run_detection():
    while True:
        try:
            try:
                interface = detect_active_interface()
                capture = pyshark.LiveCapture(interface=interface)
                print(f"Using interface: {interface}")
            except Exception as e:
                print(f"Cannot initialize capture: {e}")
                return
            
            last_cleanup = time.time()
            
            for packet in capture.sniff_continuously():
                try:
                    packet_info = extract_packet_info(packet)
                    if not packet_info:
                        continue
                        
                    flow_id = create_flow_id(
                        packet_info['src_ip'], packet_info['dst_ip'],
                        packet_info['src_port'], packet_info['dst_port'],
                        packet_info['protocol']
                    )
                    
                    current_time = time.time()
                    
                    if flow_id not in active_flows:
                        active_flows[flow_id] = {
                            'src_ip': packet_info['src_ip'],
                            'dst_ip': packet_info['dst_ip'],
                            'src_port': packet_info['src_port'],
                            'dst_port': packet_info['dst_port'],
                            'protocol': packet_info['protocol'],
                            'start_time': current_time,
                            'last_seen': current_time,
                            'end_time': current_time,
                            'fwd_packets': 0,
                            'bwd_packets': 0,
                            'fwd_bytes': 0,
                            'bwd_bytes': 0,
                            'base_src_ip': packet_info['src_ip'],
                            'tcp_flags': {'SYN': 0, 'ACK': 0, 'FIN': 0, 'RST': 0, 'PSH': 0, 'URG': 0}
                        }
                    
                    flow_data = active_flows[flow_id]
                    flow_data['last_seen'] = current_time
                    flow_data['end_time'] = current_time
                    
                    for flag, count in packet_info['tcp_flags'].items():
                        flow_data['tcp_flags'][flag] += count
                    
                    if packet_info['src_ip'] == flow_data['base_src_ip']:
                        flow_data['fwd_packets'] += 1
                        flow_data['fwd_bytes'] += packet_info['length']
                    else:
                        flow_data['bwd_packets'] += 1
                        flow_data['bwd_bytes'] += packet_info['length']
                    
                    total_packets = flow_data['fwd_packets'] + flow_data['bwd_packets']
                    
                    if total_packets >= min_packets_for_analysis:
                        analyze_flow(flow_data)
                    
                    if current_time - last_cleanup > 30:
                        cleanup_old_flows()
                        last_cleanup = current_time
                        
                except Exception as e:
                    continue
        except Exception as e:
            print(f"Capture failed: {e}")
            time.sleep(5)


if __name__ == "__main__":
    try:
        run_detection()
    except KeyboardInterrupt:
        print("\nStopping capture...")
        
        for flow_id, flow_data in active_flows.items():
            total_packets = flow_data['fwd_packets'] + flow_data['bwd_packets']
            if total_packets >= min_packets_for_analysis:
                flow_data['end_time'] = flow_data['last_seen']
                analyze_flow(flow_data)
                
        print(f"Capture stopped. Final stats: {benign_counter} benign, {attack_counter} attacks")
    except Exception as e:
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()