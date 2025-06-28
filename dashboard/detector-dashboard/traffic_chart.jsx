import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import './TrafficCharts.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
);

export default function TrafficCharts({ alerts = [] }) {
  const processAlertsData = () => {
    if (!alerts.length) {
      return {
        countByDay: {},
        countByType: {},
        probByTime: []
      };
    }

    const countByDay = {};
    const countByType = {};
    const probByTime = [];

    alerts.forEach((alert, idx) => {
      let day;
      if (alert.timestamp) {
        day = alert.timestamp.split(' ')[0];
      } else {
        day = new Date().toISOString().split('T')[0];
      }

      countByDay[day] = (countByDay[day] || 0) + 1;

      countByType[alert.attack] = (countByType[alert.attack] || 0) + 1;

      if (alert.timestamp) {
        probByTime.push({
          x: new Date(alert.timestamp),
          y: alert.probability,
          attack: alert.attack
        });
      } else {
        probByTime.push({
          x: new Date(Date.now() - (alerts.length - idx) * 60000),
          y: alert.probability,
          attack: alert.attack
        });
      }
    });

    return { countByDay, countByType, probByTime };
  };

  const { countByDay, countByType, probByTime } = processAlertsData();

  const barChartConfig = {
    data: {
      labels: Object.keys(countByDay),
      datasets: [
        {
          label: "Number of detections",
          data: Object.values(countByDay),
          backgroundColor: "rgba(0, 162, 255, 0.8)",
          borderColor: "rgba(0, 86, 179, 1)",
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Detections per day (Total: ${alerts.length})`,
          font: { size: 16, weight: 'bold' },
          color: '#2c3e50'
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: '#6c757d'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#6c757d'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      }
    }
  };

  const doughnutChartConfig = {
    data: {
      labels: Object.keys(countByType),
      datasets: [
        {
          label: "Number of detections",
          data: Object.values(countByType),
          backgroundColor: [
            "rgba(40, 167, 69, 0.8)",
            "rgba(220, 53, 69, 0.8)",
            "rgba(255, 193, 7, 0.8)",
            "rgba(111, 66, 193, 0.8)",
            "rgba(253, 126, 20, 0.8)",
            "rgba(32, 201, 151, 0.8)",
            "rgba(102, 16, 242, 0.8)"
          ],
          borderColor: [
            "rgba(40, 167, 69, 1)",
            "rgba(220, 53, 69, 1)",
            "rgba(255, 193, 7, 1)",
            "rgba(111, 66, 193, 1)",
            "rgba(253, 126, 20, 1)",
            "rgba(32, 201, 151, 1)",
            "rgba(102, 16, 242, 1)"
          ],
          borderWidth: 3,
          hoverOffset: 10
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Distribution of detection types",
          font: { size: 16, weight: 'bold' },
          color: '#2c3e50'
        },
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: { size: 12 },
            color: '#495057',
            usePointStyle: true,
            pointStyle: 'circle'
          }
        }
      },
    }
  };

  const lineChartConfig = {
    data: {
      datasets: [
        {
          label: "Detection probability",
          data: probByTime,
          fill: false,
          borderColor: "rgba(255, 87, 51, 1)",
          backgroundColor: probByTime.map(point =>
            point.attack === "BENIGN" ? "rgba(40, 167, 69, 0.8)" : "rgba(220, 53, 69, 0.8)"
          ),
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 10,
          pointBorderWidth: 3,
          pointBorderColor: "#fff",
          borderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "minute",
            displayFormats: {
              minute: 'HH:mm',
              hour: 'MMM dd, HH:mm'
            }
          },
          title: {
            display: true,
            text: "Time",
            font: { size: 14, weight: 'bold' },
            color: '#495057'
          },
          ticks: {
            color: '#6c757d'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        y: {
          min: 0,
          max: 1,
          title: {
            display: true,
            text: "Probability",
            font: { size: 14, weight: 'bold' },
            color: '#495057'
          },
          ticks: {
            callback: function(value) {
              return (value * 100).toFixed(0) + '%';
            },
            color: '#6c757d'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: "Detection probabilities over time",
          font: { size: 16, weight: 'bold' },
          color: '#2c3e50'
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 6,
          callbacks: {
            label: function(context) {
              const point = context.raw;
              return [
                `Probability: ${(point.y * 100).toFixed(1)}%`,
                `Type: ${point.attack}`,
                `Time: ${new Date(point.x).toLocaleString()}`
              ];
            }
          }
        }
      }
    }
  };

  // Calculate statistics
  const attackCount = alerts.filter(a => a.attack !== "BENIGN").length;
  const attackRate = alerts.length > 0 ? ((attackCount / alerts.length) * 100).toFixed(1) : 0;

  // If no data, show placeholder
  if (!alerts.length) {
    return (
      <div className="charts-empty-state">
        <h2 className="empty-state-title">Analysis Charts</h2>
        <p className="empty-state-message">
          There is no data available.
        </p>
      </div>
    );
  }

  return (
    <div className="charts-container">
      <h2 className="charts-title">Network Traffic Analysis</h2>
      
      {/* Attacks per day */}
      <div className="chart-section bar-chart-section">
        <h3 className="chart-section-title">
          Detections per day
        </h3>
        <div className="chart-container bar">
          <Bar {...barChartConfig} />
        </div>
      </div>

      {/* Attack type distribution */}
      <div className="chart-section doughnut-chart-section">
        <h3 className="chart-section-title">
          Distribution of attack types
        </h3>
        <div className="chart-container doughnut">
          <Doughnut {...doughnutChartConfig} />
        </div>
      </div>

      {/* Probability evolution over time */}
      <div className="chart-section line-chart-section">
        <h3 className="chart-section-title">
          Evolution of probabilities over time
        </h3>
        <div className="chart-container line">
          <Line {...lineChartConfig} />
        </div>
      </div>

      {/* Summary stats */}
      <div className="summary-stats">
        <h4 className="summary-title">Summary</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total detections:</span>
            <span className="summary-value">{alerts.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Different types:</span>
            <span className="summary-value">{Object.keys(countByType).length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Monitored days:</span>
            <span className="summary-value">{Object.keys(countByDay).length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Attack rate:</span>
            <span className="summary-value">{attackRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}