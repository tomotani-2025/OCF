// Progress Page Data Loader
// Loads progress goals from Supabase and renders them as thermometer cards
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

        const models = goals.map(parseGoal);

        renderSummary(models);
        renderGrid(container, models, 'order');

        // Sort buttons re-render the grid in place
        const sortbar = document.getElementById('progress-sort');
        if (sortbar) {
            sortbar.addEventListener('click', e => {
                const button = e.target.closest('.sort-btn');
                if (!button) return;
                sortbar.querySelectorAll('.sort-btn').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
                renderGrid(container, models, button.dataset.sort);
            });
        }

        const toolbar = document.getElementById('progress-toolbar');
        if (toolbar) toolbar.hidden = false;

        // Show CTA section after charts are loaded
        const ctaSection = document.getElementById('progress-cta');
        if (ctaSection) ctaSection.style.display = '';

    } catch (error) {
        console.error('Error loading progress:', error);
        container.innerHTML = '<p class="error-message">Unable to load progress data. Please try again later.</p>';
    }
})();

// Turn a Supabase row into { label, sub, title, link, raised, goal, marks }
function parseGoal(goal) {
    let goalItems = [];
    let donations = { value: 0 };

    try {
        goalItems = typeof goal.goals === 'string' ? JSON.parse(goal.goals) : (goal.goals || []);
    } catch (e) {
        console.error('Error parsing goals:', e);
    }

    try {
        donations = typeof goal.donations === 'string' ? JSON.parse(goal.donations) : (goal.donations || { value: 0 });
    } catch (e) {
        console.error('Error parsing donations:', e);
    }

    // Backwards compatibility: if no new structure, fall back to old bars
    if (goalItems.length === 0 && goal.bars) {
        const bars = typeof goal.bars === 'string' ? JSON.parse(goal.bars) : goal.bars;

        bars.forEach(bar => {
            if (bar.label && bar.label.toLowerCase().includes('raised')) {
                donations = { value: bar.value };
            } else {
                goalItems.push({ name: bar.label, value: bar.value, barLabel: bar.label });
            }
        });
    }

    // Targets smallest first; the largest is the goal, the rest are phase marks
    const targets = goalItems
        .map(g => ({ name: g.name || '', barLabel: g.barLabel || '', value: parseFloat(g.value) || 0 }))
        .filter(g => g.value > 0)
        .sort((a, b) => a.value - b.value);

    const top = targets[targets.length - 1];

    // A date range like "Goal (2019–2025)" becomes the subtitle next to the label
    const range = top && top.name.match(/\(([^)]+)\)/);

    return {
        label: (goal.label || '').replace(/:\s*$/, ''),
        sub: range ? range[1] : '',
        title: goal.title || '',
        link: goal.link || '#',
        raised: parseFloat(donations.value) || 0,
        goal: top ? top.value : 0,
        marks: targets.slice(0, -1).map(t => ({ value: t.value, name: markName(t) }))
    };
}

// "Phase 1 Goal: Batwa Farm at Matanda" -> "Phase 1"
function markName(target) {
    const name = target.barLabel || target.name;
    return name.split(':')[0].replace(/\s+goal$/i, '').trim() || 'Phase';
}

const percentOf = m => m.goal > 0 ? Math.round(m.raised / m.goal * 100) : 0;
const stillNeeded = m => Math.max(0, m.goal - m.raised);
const isFunded = m => m.goal > 0 && m.raised >= m.goal;

const SORTS = {
    order: list => list,
    need: list => [...list].sort((a, b) => stillNeeded(b) - stillNeeded(a) || b.raised - a.raised),
    pct: list => [...list].sort((a, b) => percentOf(b) - percentOf(a))
};

function renderGrid(container, models, sortKey) {
    container.innerHTML = (SORTS[sortKey] || SORTS.order)(models).map(createProgressCard).join('');
}

function renderSummary(models) {
    const el = document.getElementById('progress-kpis');
    if (!el) return;

    const raised = models.reduce((sum, m) => sum + m.raised, 0);
    const needed = models.reduce((sum, m) => sum + stillNeeded(m), 0);
    const funded = models.filter(isFunded).length;

    el.innerHTML = `
        <div class="kpi"><span class="kpi-value">${formatCurrency(raised)}</span><span class="kpi-label">Raised to date</span></div>
        <div class="kpi"><span class="kpi-value">${formatCurrency(needed)}</span><span class="kpi-label">Still needed</span></div>
        <div class="kpi"><span class="kpi-value">${funded} of ${models.length}</span><span class="kpi-label">Goals funded</span></div>
    `;
}

// Labels hang to the left of their mark with the stem on their right edge,
// so close marks only need different rows. Near the left end they flip.
const anchorFor = position => position < 20 ? 'anchor-l' : 'anchor-r';

function createProgressCard(m) {
    const max = Math.max(m.raised, m.goal) || 1;
    const over = m.goal > 0 && m.raised > m.goal;
    const under = m.goal > 0 && m.raised > 0 && m.raised < m.goal;
    const pGoal = 100 * m.goal / max;
    const pRaised = 100 * m.raised / max;
    const pct = percentOf(m);

    // Targets listed above the bar: phases, then the goal
    const targetsHTML = [
        ...m.marks.map(mark => `<span>${escapeHtml(mark.name)}: ${formatCurrency(mark.value)}</span>`),
        m.goal > 0 ? `<span>Goal: ${formatCurrency(m.goal)}</span>` : ''
    ].join('');

    // Every mark that needs a label under the track, left to right
    const marks = m.marks.map(mark => ({ value: mark.value, label: `${mark.name} ${formatShortCurrency(mark.value)}`, kind: 'phase' }));
    if (over) marks.push({ value: m.goal, label: `Goal ${formatShortCurrency(m.goal)}`, kind: 'goal' });
    if (under) marks.push({ value: m.raised, label: formatCurrency(m.raised), kind: 'raised' });
    marks.sort((a, b) => a.value - b.value);

    const cutsHTML = marks
        .filter(mark => mark.kind !== 'goal')
        .map(mark => `<div class="thermo-cut" style="left: ${(100 * mark.value / max).toFixed(2)}%"></div>`)
        .join('');

    const labelsHTML = marks.map((mark, i) => {
        const p = 100 * mark.value / max;
        return `<div class="thermo-mark is-${mark.kind} row-${i % 2} ${anchorFor(p)}" style="left: ${p.toFixed(2)}%"><div class="stem"></div>${escapeHtml(mark.label)}</div>`;
    }).join('');

    // The raised total shares the label band when every mark sits far enough
    // right to clear it; otherwise it drops below the labels
    const rows = Math.min(marks.length, 2);
    const shareBand = marks.length > 0 && marks.every(mark => 100 * mark.value / max >= 60);
    const axisClass = shareBand ? 'is-shared' : `rows-${rows}`;

    const phaseNote = m.marks.length ? `, phase target ${formatCurrency(m.marks[0].value)}` : '';
    const status = isFunded(m)
        ? `<span class="status-chip is-funded"><span class="status-check" aria-hidden="true">&#10003;</span> Funded &middot; ${pct}%</span>`
        : (m.goal > 0 ? `<span class="status-chip">${formatCurrency(stillNeeded(m))} to go</span>` : '');

    return `
        <article class="progress-card">
            <p class="goal-label">${escapeHtml(m.label)}${m.label ? ':' : ''}${m.sub ? ` <span class="goal-sub">${escapeHtml(m.sub)}</span>` : ''}</p>
            <h2 class="goal-title">${escapeHtml(m.title)}</h2>
            <div class="divider"></div>

            ${targetsHTML ? `<div class="thermo-targets">${targetsHTML}</div>` : ''}

            <div class="thermo-track" role="img" aria-label="${formatCurrency(m.raised)} raised${m.goal > 0 ? ` against a ${formatCurrency(m.goal)} goal, ${pct} percent` : ''}${phaseNote}">
                <div class="thermo-fill" style="width: ${(over ? pGoal : pRaised).toFixed(2)}%"></div>
                ${over ? `<div class="thermo-past" style="left: ${pGoal.toFixed(2)}%; width: ${(pRaised - pGoal).toFixed(2)}%"></div>
                <div class="thermo-cut" style="left: ${pGoal.toFixed(2)}%"></div>` : ''}
                ${cutsHTML}
            </div>

            <div class="thermo-axis ${axisClass}">
                ${labelsHTML}
                <p class="thermo-raised">${formatCurrency(m.raised)} Raised thus far</p>
            </div>

            <div class="card-foot">
                ${status}
                <a href="${escapeHtml(m.link)}" class="learn-more">
                    <span>Learn More</span>
                    <svg width="30" height="26" viewBox="0 0 30 26" fill="none" aria-hidden="true">
                        <path d="M18 6L26 13L18 20" stroke="#EF3A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M4 13H26" stroke="#EF3A4F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </a>
            </div>
        </article>
    `;
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
