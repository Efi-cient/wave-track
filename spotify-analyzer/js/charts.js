
// Neon Palette
const NEON_PALETTE = [
    '#00f2ff', // Cyan
    '#bd00ff', // Purple
    '#1db954', // Green
    '#ff0055', // Pink
    '#ffbe0b', // Yellow
    '#ffffff'  // White
];

export function generateVibrantColors(count) {
    // Return palette looped
    return Array.from({ length: count }, (_, i) => NEON_PALETTE[i % NEON_PALETTE.length]);
}

// Chart Global Defaults
Chart.defaults.color = '#888';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

export function createMoodChart(ctx, tags) {
    const labels = tags.map(t => t.label);
    const data = tags.map(t => t.count);
    const colors = generateVibrantColors(tags.length);

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#fff', boxWidth: 10, font: { family: 'Outfit', size: 11 } }
                }
            }
        }
    });
}

export function createListeningClock(ctx, hourCounts) {
    return new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => i + 'h'),
            datasets: [{
                data: hourCounts,
                backgroundColor: hourCounts.map(count => {
                    const max = Math.max(...hourCounts) || 1;
                    const opacity = 0.2 + (count / max) * 0.8;
                    return `rgba(0, 242, 255, ${opacity})`; // Cyan
                }),
                borderWidth: 0,
                borderColor: 'transparent'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.08)', circular: true },
                    ticks: { display: false, backdropColor: 'transparent' },
                    angleLines: { color: 'rgba(255,255,255,0.08)' },
                    pointLabels: { display: false } // Cleaner look
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
