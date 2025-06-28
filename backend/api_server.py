from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import psycopg2
from datetime import datetime
import threading
import time
import sys
import os
import pandas as pd
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"], credentials=True)

socketio = SocketIO(app, cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173"], async_mode='threading', ping_timeout=60, ping_interval=25)

DB_CONFIG = {
    'dbname': 'traffic',
    'user': 'postgres',
    'password': '1234',
    'host': 'localhost',
    'port': '5432'
}

last_alert_count = 0
monitoring_active = True

system_stats = {
    'uptime_start': datetime.now(),
}

def get_alerts_from_db(limit=100):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        base_query = """
            SELECT id, timestamp, durata, total_fwd_packets, total_bwd_packets,
                total_length_fwd, total_length_bwd,
                bytes_per_sec, packets_per_sec,
                attack, probability, src_ip, dst_ip, src_port, dst_port, protocol
            FROM rezultate
        """

        where_conditions = "timestamp >= NOW() - INTERVAL '30 days'"
        
        query = base_query + " WHERE " + where_conditions

        query += " ORDER BY timestamp DESC LIMIT %s"
        
        cursor.execute(query, (limit,))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        alerts = []
        for row in rows:
            alerts.append({
                'id': row[0],
                'timestamp': row[1].strftime("%Y-%m-%d %H:%M:%S") if row[1] else None,
                'durata': float(row[2]) if row[2] else 0.0,
                'total_fwd_packets': int(row[3]) if row[3] else 0,
                'total_bwd_packets': int(row[4]) if row[4] else 0,
                'total_length_fwd': int(row[5]) if row[5] else 0,
                'total_length_bwd': int(row[6]) if row[6] else 0,
                'bytes_per_sec': float(row[7]) if row[7] else 0.0,
                'packets_per_sec': float(row[8]) if row[8] else 0.0,
                'attack': row[9] if row[9] else 'UNKNOWN',
                'probability': float(row[10]) if row[10] else 0.0,
                'src_ip': row[11] if row[11] else 'Unknown',
                'dst_ip': row[12] if row[12] else 'Unknown',
                'src_port': row[13] if row[13] else None,
                'dst_port': row[14] if row[14] else None,
                'protocol': row[15] if row[15] else 'Unknown',
                'severity': get_severity_level(float(row[10]) if row[10] else 0.0),
                'is_threat': (row[9] != 'BENIGN') if row[9] else False
            })

        return alerts
        
    except Exception as e:
        print(f"Error getting alerts: {e}")
        return []

def get_stats_from_db():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM rezultate WHERE attack != 'BENIGN'")
        total_attacks = cursor.fetchone()[0]
            
        cursor.execute("""
            SELECT COUNT(*) FROM rezultate
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
            AND attack != 'BENIGN'
        """)
        recent_attacks = cursor.fetchone()[0]
            
        cursor.execute("""
            SELECT COUNT(*) FROM rezultate
            WHERE timestamp >= NOW() - INTERVAL '1 hour'
            AND attack != 'BENIGN'
        """)
        recent_attacks_hour = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM rezultate")
        total_events = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return {
            'total_attacks': total_attacks,
            'recent_attacks': recent_attacks,
            'recent_attacks_hour': recent_attacks_hour,
            'total_events': total_events,
            'system_status': 'ACTIVE',
            'uptime': str(datetime.now() - system_stats['uptime_start'])
        }
        
    except Exception as e:
        print(f"Error getting stats: {e}")
        return {
            'total_attacks': 0,
            'recent_attacks': 0,
            'recent_attacks_hour': 0,
            'total_events': 0,
            'system_status': 'ERROR',
            'uptime': '0:00:00'
        }

def get_severity_level(probability):
    if probability >= 0.9:
        return 'CRITICAL'
    elif probability >= 0.7:
        return 'HIGH'
    elif probability >= 0.5:
        return 'MEDIUM'
    else:
        return 'LOW'

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    try:
        limit = request.args.get('limit', 200, type=int)
        attack_type = request.args.get('attack_type')
        severity = request.args.get('severity')
        
        alerts = get_alerts_from_db(limit)
        
        if attack_type and attack_type != 'all':
            alerts = [a for a in alerts if a['attack'] == attack_type]
            
        if severity and severity != 'all':
            alerts = [a for a in alerts if a['severity'] == severity]
        
        return jsonify(alerts)
        
    except Exception as e:
        print(f"Error in get_alerts: {e}")
        return jsonify({'error': 'Failed to retrieve alerts'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        stats = get_stats_from_db()
        return jsonify(stats)
        
    except Exception as e:
        print(f"Error in get_stats: {e}")
        return jsonify({'error': 'Failed to retrieve statistics'}), 500

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    try:
        attack_type = request.args.get('attack_type')
        severity = request.args.get('severity')
        limit = request.args.get('limit', 1000, type=int)
        
        alerts = get_alerts_from_db(limit)
        
        if attack_type and attack_type != 'all':
            alerts = [a for a in alerts if a['attack'] == attack_type]
        if severity and severity != 'all':
            alerts = [a for a in alerts if a['severity'] == severity]
        
        df = pd.DataFrame(alerts)

        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        csv_data = io.BytesIO()
        csv_data.write(output.getvalue().encode('utf-8'))
        csv_data.seek(0)
        
        filename = f'security_alerts_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        return send_file(
            csv_data,
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"CSV export error: {e}")
        return jsonify({'error': 'Export failed'}), 500

@app.route('/api/export/pdf', methods=['GET'])
def export_pdf():
    try:
        alerts = get_alerts_from_db(100)
        stats = get_stats_from_db()
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        #title
        p.setFont("Helvetica-Bold", 20)
        p.drawString(50, height - 50, "Network Anomaly Detection Report")
        
        p.setFont("Helvetica", 12)
        p.drawString(50, height - 80, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        #summary
        y_pos = height - 120
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, y_pos, "Executive Summary")
        
        y_pos -= 30
        p.setFont("Helvetica", 12)
        summary_lines = [
            f"Total Security Events: {stats.get('total_events', 0):,}",
            f"Total Attacks Detected: {stats.get('total_attacks', 0):,}",
            f"Recent Attacks (24h): {stats.get('recent_attacks', 0):,}",
            f"Recent Attacks (1h): {stats.get('recent_attacks_hour', 0):,}",
            f"System Status: {stats.get('system_status', 'UNKNOWN')}",
            f"System Uptime: {stats.get('uptime', 'Unknown')}"
        ]
        
        for line in summary_lines:
            p.drawString(50, y_pos, line)
            y_pos -= 20
        
        p.save()
        buffer.seek(0)
        
        filename = f'security_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"PDF export error: {e}")
        return jsonify({'error': 'PDF export failed'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        db_status = "OK"
    except:
        db_status = "ERROR"
    
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'uptime': str(datetime.now() - system_stats['uptime_start']),
        'database_status': db_status,
        'monitoring_active': monitoring_active,
    })

@socketio.on('connect')
def on_connect():
    try:
        alerts = get_alerts_from_db(100)
        stats = get_stats_from_db()
        
        emit('initial_data', {
            'alerts': alerts,
            'stats': stats,
            'monitoring_active': monitoring_active,
            'timestamp': datetime.now().isoformat(),
            'server_time': datetime.now().strftime('%H:%M:%S')
        })
        
        emit('system_message', {
            'type': 'info',
            'message': 'Connected to Network Anomaly Detection System',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error in WebSocket connect: {e}")

def monitor_database():
    global last_alert_count
    
    while True:
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            cursor = conn.cursor()
                
            cursor.execute("SELECT COUNT(*) FROM rezultate")
            current_count = cursor.fetchone()[0]
                
            if current_count != last_alert_count:
                print(f"Database updated: {last_alert_count} -> {current_count}")
                last_alert_count = current_count
                
                alerts = get_alerts_from_db(100)
                stats = get_stats_from_db()

                socketio.emit('data_update', {
                    'alerts': alerts,
                    'stats': stats,
                    'monitoring_active': monitoring_active,
                    'timestamp': datetime.now().isoformat(),
                    'total_count': current_count,
                    'new_count': current_count - last_alert_count
                })

                latest_alert = None
                if alerts and alerts[0]['is_threat'] and alerts[0]['severity'] in ['HIGH', 'CRITICAL']:
                    latest_alert = alerts[0]
                    socketio.emit('new_threat', {
                        'alert': latest_alert,
                        'message': f"THREAT: {latest_alert['attack']} detected "
                                f"(Confidence: {latest_alert['probability']:.1%})",
                        'severity': latest_alert['severity'],
                        'timestamp': datetime.now().isoformat()
                    })
                if latest_alert:
                    print(f"THREAT ALERT: {latest_alert['attack']} - {latest_alert['severity']}")
                
            cursor.close()
            conn.close()
            
            time.sleep(3)
            
        except Exception as e:
            print(f"Error in database monitoring: {e}")
            time.sleep(5)

if __name__ == '__main__':
    system_stats['uptime_start'] = datetime.now()
    monitor_thread = threading.Thread(target=monitor_database, daemon=True)
    monitor_thread.start()
    
    socketio.run(
        app,
        debug=True,
        host='0.0.0.0',
        port=5000,
        allow_unsafe_werkzeug=True
    )
