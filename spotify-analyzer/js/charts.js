
// Vibrant Color Palette Generator
export function generateVibrantColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        // High saturation and brightness for "Neon" look
        const h = Math.floor(Math.random() * 360);
        const s = 100; // Max saturation
        const l = 60;  // High brightness for dark mode contrast
        colors.push(`hsl(${h}, ${s}%, ${l}%)`);
    }
    return colors;
}

// Chart Configuration Helpers
export function createMoodChart(ctx, tags) {
    // tags: { label: 'Pop', count: 15 }
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
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#fff', boxWidth: 12, font: { size: 11 } }
                },
                title: {
                    display: true,
                    text: 'Your Vibe (Top Genres)',
                    color: '#fff',
                    font: { size: 14 }
                }
            }
        }
    });
}

export function createListeningClock(ctx, hourCounts) {
    // Circular Bar Chart (Polar Area)
    return new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => {
                if (i === 0) return '12 AM';
                if (i === 6) return '6 AM';
                if (i === 12) return '12 PM';
                if (i === 18) return '6 PM';
                return '';
            }),
            datasets: [{
                data: hourCounts,
                backgroundColor: hourCounts.map(count => {
                    // Dynamic opacity based on value
                    const max = Math.max(...hourCounts) || 1;
                    const opacity = 0.3 + (count / max) * 0.7;
                    return `rgba(29, 185, 84, ${opacity})`;
                }),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { display: false, backdropColor: 'transparent' },
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: {
                        display: true,
                        centerPointLabels: true,
                        font: { size: 10 },
                        color: '#b3b3b3'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: { display: false } // Hide data labels if plugin is active
            }
        }
    });
}
