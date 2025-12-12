// Progress Page Data Loader
// Loads progress goals from Supabase and renders CSS-only charts

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

    // Parse bars data
    let bars = [];
    try {
        bars = typeof goal.bars === 'string' ? JSON.parse(goal.bars) : (goal.bars || []);
    } catch (e) {
        console.error('Error parsing bars:', e);
    }

    // Find raised amount and goal amount from bars
    const raisedBar = bars.find(b => b.label && b.label.toLowerCase().includes('raised'));
    const goalBar = bars.find(b => b.label && b.label.toLowerCase().includes('goal'));
    const phaseBar = bars.find(b => b.label && b.label.toLowerCase().includes('phase'));

    const raisedAmount = raisedBar ? parseFloat(raisedBar.value) || 0 : 0;
    const goalAmount = goalBar ? parseFloat(goalBar.value) || 0 : 0;
    const phaseAmount = phaseBar ? parseFloat(phaseBar.value) || 0 : 0;

    // Calculate chart max (120% of largest value)
    const maxValue = Math.max(raisedAmount, goalAmount, phaseAmount) * 1.2;

    // Calculate percentages
    const raisedPercent = maxValue > 0 ? (raisedAmount / maxValue * 100) : 0;
    const goalPercent = maxValue > 0 ? (goalAmount / maxValue * 100) : 0;
    const phasePercent = maxValue > 0 ? (phaseAmount / maxValue * 100) : 0;

    // Parse goal title to extract label and subtitle
    const titleParts = goal.title.split(':');
    const goalLabel = titleParts[0] ? titleParts[0].trim() + ':' : 'Goal:';
    const goalTitle = titleParts[1] ? titleParts[1].trim() : goal.title;

    // Generate grid lines (7 lines from 0 to max)
    const gridLines = generateGridLines(maxValue);

    // Build phase info section
    let phaseInfoHTML = '';
    if (goalBar) {
        phaseInfoHTML = `
            <div class="phase-info">
                <span>${phaseBar ? phaseBar.label : 'Goal'}</span>
                <span class="amount">${formatCurrency(goalAmount)}</span>
            </div>
        `;
    }

    // Build goal marker (for phase or goal line indicator)
    let goalMarkerHTML = '';
    if (phaseBar && phaseAmount > 0) {
        goalMarkerHTML = `<div class="goal-marker" style="--marker-position: ${phasePercent}%;" data-label="${phaseBar.label} ${formatShortCurrency(phaseAmount)}"></div>`;
    } else if (goalBar && goalAmount > 0) {
        goalMarkerHTML = `<div class="goal-marker" style="--marker-position: ${goalPercent}%;" data-label="Goal ${formatShortCurrency(goalAmount)}"></div>`;
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
                    ${goalAmount > 0 ? `
                    <div class="bar-goal" style="--bar-height: ${goalPercent}%;">
                        <span class="bar-text">Goal<br>${formatCurrency(goalAmount)}</span>
                    </div>
                    ` : ''}
                    ${raisedAmount > 0 ? `
                    <div class="bar-raised" style="--bar-height: ${raisedPercent}%;">
                        <span class="bar-text">Donations To Date<br>${formatCurrency(raisedAmount)}</span>
                    </div>
                    ` : ''}
                    ${goalMarkerHTML}
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
