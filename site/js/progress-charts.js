// Progress Charts Configuration
// Edit this file to update chart data and colors

const goalsData = {
    1: {
        labels: ['Raised $34k', 'Phase 1 $27k', 'Goal $54k'],
        data: [34000, 27000, 54000]
    },
    2: {
        labels: ['Raised $3.8k', 'Goal $5k'],
        data: [3800, 5000]
    },
    3: {
        labels: ['Raised $6.1k', 'Goal $10k'],
        data: [6100, 10000]
    },
    4: {
        labels: ['Raised $3.5k', 'Goal $5k'],
        data: [3500, 5000]
    },
    5: {
        labels: ['Raised $1.1k', 'Goal $5k'],
        data: [1140, 5000]
    },
    6: {
        labels: ['Raised $7k', 'Goal $5k'],
        data: [6950, 5000]
    },
    7: {
        labels: ['Raised $18.3k', 'Goal $30k'],
        data: [18306, 30000]
    },
    8: {
        labels: ['Raised $23k', 'Goal $20k'],
        data: [23000, 20000]
    },
    9: {
        labels: ['Raised $1.2k', 'Goal $5k'],
        data: [1200, 5000]
    },
    10: {
        labels: ['Raised $31k', 'Goal $25k'],
        data: [31000, 25000]
    },
    11: {
        labels: ['Raised $7k', 'Goal $10k'],
        data: [7000, 10000]
    },
    12: {
        labels: ['Raised $67k', 'Goal $60k'],
        data: [67218, 60000]
    }
};

// Bar colors: first = raised, second = goal, third = phase (if applicable)
const barColors = ['#e85a71', '#000000', '#666666'];

// Initialize charts when DOM is ready
function initProgressCharts() {
    Object.keys(goalsData).forEach(function(goalNum) {
        const canvas = document.getElementById('chart-goal-' + goalNum);
        if (!canvas) return;

        const goalData = goalsData[goalNum];
        const ctx = canvas.getContext('2d');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: goalData.labels,
                datasets: [{
                    data: goalData.data,
                    backgroundColor: goalData.data.map((_, i) => barColors[i % barColors.length]),
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '$' + context.raw.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10 },
                            maxRotation: 0,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000) + 'k';
                            }
                        }
                    }
                }
            }
        });
    });
}

// Run initialization
initProgressCharts();
