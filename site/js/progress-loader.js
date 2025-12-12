// Progress Page Data Loader
// Loads progress goals from Supabase and renders CSS-only charts
// Supports new simplified data structure with backwards compatibility

(async function() {
    const container = document.getElementById('progress-grid');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<div class="loading-message">Loading progress data...</div>';

    try {
        // Load goals from Supabase
        const goals = await progressAPI.getGoals();

        if (!goals || goals.length === 0) {
            container.innerHTML = '<p class="no-data">No progress goals available.</p>';
            return;
        }

        // Clear loading and render goals
        container.innerHTML = '';

        goals.forEach(goal => {
            const card = createProgressCard(goal);
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading progress:', error);
        container.innerHTML = '<p class="error-message">Unable to load progress data. Please try again later.</p>';
    }
})();

function createProgressCard(goal) {
    const article = document.createElement('article');
    article.className = 'progress-card';

    // Parse new structure: goals array and donations object
    let goalItems = [];
    let donations = { value: 0, color: '#e85a71' };

    try {
        goalItems = typeof goal.goals === 'string' ? JSON.parse(goal.goals) : (goal.goals || []);
    } catch (e) {
        console.error('Error parsing goals:', e);
    }

    try {
        donations = typeof goal.donations === 'string' ? JSON.parse(goal.donations) : (goal.donations || { value: 0, color: '#e85a71' });
    } catch (e) {
        console.error('Error parsing donations:', e);
    }

    // Backwards compatibility: if no new structure, fall back to old bars/markers
    if (goalItems.length === 0 && goal.bars) {
        const bars = typeof goal.bars === 'string' ? JSON.parse(goal.bars) : goal.bars;
        const markers = goal.markers ? (typeof goal.markers === 'string' ? JSON.parse(goal.markers) : goal.markers) : [];

        // Find donations bar (usually "Raised")
        const raisedBar = bars.find(b => b.label && b.label.toLowerCase().includes('raised'));
        if (raisedBar) {
            donations = {
                value: raisedBar.value,
                color: raisedBar.color || '#e85a71',
                markerEnabled: false
            };
        }

        // Convert other bars to goals
        bars.forEach(bar => {
            if (!bar.label.toLowerCase().includes('raised')) {
                const matchingMarker = markers.find(m => m.value === bar.value);
                goalItems.push({
                    name: bar.label,
                    value: bar.value,
                    barLabel: bar.label,
                    barColor: bar.color || '#F5E4AF',
                    markerEnabled: !!matchingMarker,
                    markerColor: matchingMarker?.color || '#312121',
                    markerTextColor: matchingMarker?.textColor || '#F5E4AF'
                });
            }
        });
    }

    // Get donations value
    const donationsValue = parseFloat(donations.value) || 0;
    const donationsColor = donations.color || '#e85a71';

    // Find the highest goal value for chart scaling
    const allValues = [donationsValue, ...goalItems.map(g => parseFloat(g.value) || 0)];
    const maxValue = Math.max(...allValues) * 1.2;

    // Calculate donations percentage
    const donationsPercent = maxValue > 0 ? (donationsValue / maxValue * 100) : 0;

    // Get label and title
    const goalLabel = goal.label ? goal.label : '';
    const goalTitle = goal.title || '';

    // Generate grid lines (7 lines from 0 to max)
    const gridLines = generateGridLines(maxValue);

    // Build phase info section (show first goal with highest value as "phase info")
    let phaseInfoHTML = '';
    if (goalItems.length > 0) {
        // Sort by value descending and get the main goal
        const sortedGoals = [...goalItems].sort((a, b) => (b.value || 0) - (a.value || 0));
        const mainGoal = sortedGoals[0];
        phaseInfoHTML = `
            <div class="phase-info">
                <span>${mainGoal.name}</span>
                <span class="amount">${formatCurrency(mainGoal.value)}</span>
            </div>
        `;
    }

    // Build goal bars HTML (stacked from bottom, largest first)
    let goalBarsHTML = '';
    const sortedGoals = [...goalItems].sort((a, b) => (b.value || 0) - (a.value || 0));
    sortedGoals.forEach(g => {
        const value = parseFloat(g.value) || 0;
        const percent = maxValue > 0 ? (value / maxValue * 100) : 0;
        const color = g.barColor || '#F5E4AF';
        goalBarsHTML += `<div class="bar-goal" style="--bar-height: ${percent}%; background: ${color};"></div>`;
    });

    // Build markers HTML
    let markersHTML = '';
    goalItems.forEach(g => {
        if (g.markerEnabled) {
            const value = parseFloat(g.value) || 0;
            const percent = maxValue > 0 ? (value / maxValue * 100) : 0;
            const color = g.markerColor || '#312121';
            const textColor = g.markerTextColor || '#F5E4AF';
            markersHTML += `<div class="goal-marker" style="--marker-position: ${percent}%; --marker-color: ${color}; --marker-text-color: ${textColor};" data-label="${g.name} ${formatShortCurrency(value)}"></div>`;
        }
    });

    // Add donations marker if enabled
    if (donations.markerEnabled) {
        const color = donations.markerColor || '#e85a71';
        const textColor = donations.markerTextColor || '#f7f7f7';
        markersHTML += `<div class="goal-marker" style="--marker-position: ${donationsPercent}%; --marker-color: ${color}; --marker-text-color: ${textColor};" data-label="Donations ${formatShortCurrency(donationsValue)}"></div>`;
    }

    article.innerHTML = `
        <div class="card-body">
            <h3 class="goal-label">${escapeHtml(goalLabel)}</h3>
            <h2 class="goal-title">${escapeHtml(goalTitle)}</h2>
            <div class="divider"></div>
            ${phaseInfoHTML}
        </div>
        <div class="chart-area">
            <div class="chart-grid">
                ${gridLines}
            </div>
            <div class="chart-bar-container">
                <div class="stacked-bar">
                    ${goalBarsHTML}
                    ${donationsValue > 0 ? `
                    <div class="bar-raised" style="--bar-height: ${donationsPercent}%; background: ${donationsColor};">
                        <span class="bar-text">Donations To Date<br>${formatCurrency(donationsValue)}</span>
                    </div>
                    ` : ''}
                    ${markersHTML}
                </div>
            </div>
        </div>
        <a href="${escapeHtml(goal.link || '#')}" class="learn-more">
            <span>Learn More</span>
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <path d="M1 7H17M17 7L11 1M17 7L11 13" stroke="#EF3A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </a>
    `;

    return article;
}

function generateGridLines(maxValue) {
    const lines = [];
    const steps = 6; // 7 lines total (0 + 6 steps)

    for (let i = 0; i <= steps; i++) {
        const position = (i / steps) * 100;
        const value = (maxValue / steps) * i;
        lines.push(`<div class="grid-line" style="--position: ${position}%"><span class="grid-label">${formatShortCurrency(value)}</span></div>`);
    }

    return lines.join('\n                                ');
}

function formatCurrency(value) {
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatShortCurrency(value) {
    if (value >= 1000) {
        const k = value / 1000;
        return '$' + (k % 1 === 0 ? k : k.toFixed(1)) + 'k';
    }
    return '$' + value;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
