/**
 * Netlify Function: Save Progress
 *
 * Saves progress chart data to progress.json via GitHub API.
 */

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'omotani/omotani-caring-foundation';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

async function githubRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_REPO}${path}`,
            method: method,
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'Netlify-Function',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject({ statusCode: res.statusCode, message: json.message || 'GitHub API error' });
                    }
                } catch (e) {
                    reject({ statusCode: 500, message: 'Failed to parse GitHub response' });
                }
            });
        });

        req.on('error', (e) => reject({ statusCode: 500, message: e.message }));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function getFileContent(filePath) {
    try {
        const result = await githubRequest('GET', `/contents/${filePath}?ref=${GITHUB_BRANCH}`);
        const content = Buffer.from(result.content, 'base64').toString('utf8');
        return { content: JSON.parse(content), sha: result.sha };
    } catch (error) {
        if (error.statusCode === 404) {
            return { content: { goals: [] }, sha: null };
        }
        throw error;
    }
}

async function updateFile(filePath, content, sha, message) {
    const body = {
        message: message,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        branch: GITHUB_BRANCH
    };

    if (sha) {
        body.sha = sha;
    }

    return githubRequest('PUT', `/contents/${filePath}`, body);
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    if (!GITHUB_TOKEN) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'GitHub token not configured' })
        };
    }

    try {
        const { action, goal, goalId, goals } = JSON.parse(event.body);
        const filePath = 'site/data/progress.json';

        const { content: data, sha } = await getFileContent(filePath);
        let message;

        if (action === 'add') {
            // Add new goal
            const newId = String(Date.now());
            const newGoal = { ...goal, id: newId };
            data.goals.push(newGoal);
            message = `Add progress goal: ${goal.title}`;
        } else if (action === 'update') {
            // Update existing goal
            const index = data.goals.findIndex(g => g.id === goalId);
            if (index === -1) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Goal not found' })
                };
            }
            data.goals[index] = { ...data.goals[index], ...goal };
            message = `Update progress goal: ${goal.title}`;
        } else if (action === 'delete') {
            // Delete goal
            const index = data.goals.findIndex(g => g.id === goalId);
            if (index === -1) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Goal not found' })
                };
            }
            data.goals.splice(index, 1);
            message = 'Delete progress goal';
        } else if (action === 'reorder') {
            // Reorder goals
            if (goals && Array.isArray(goals)) {
                data.goals = goals;
                message = 'Reorder progress goals';
            } else {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Goals array required for reorder' })
                };
            }
        } else if (action === 'save-all') {
            // Save all goals at once (for bulk updates)
            if (goals && Array.isArray(goals)) {
                data.goals = goals;
                message = 'Update all progress goals';
            } else {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Goals array required' })
                };
            }
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action' })
            };
        }

        // Sort goals by order
        data.goals.sort((a, b) => (a.order || 0) - (b.order || 0));

        await updateFile(filePath, data, sha, message);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Progress ${action} completed successfully`
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to save progress'
            })
        };
    }
};
