/**
 * Netlify Function: Save Post
 *
 * Saves a post to the news-posts.json file via GitHub API.
 * This allows direct publishing from the admin page.
 */

const https = require('https');

// Environment variables (set in Netlify dashboard)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'omotani/omotani-caring-foundation';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'master';

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
            return { content: { posts: [] }, sha: null };
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
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
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

    // Check for GitHub token
    if (!GITHUB_TOKEN) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'GitHub token not configured. Please add GITHUB_TOKEN to Netlify environment variables.' })
        };
    }

    try {
        const { action, post, postId } = JSON.parse(event.body);
        const filePath = 'site/data/news-posts.json';

        // Get current file
        const { content: data, sha } = await getFileContent(filePath);

        let message;

        if (action === 'create') {
            // Add new post to beginning
            data.posts.unshift(post);
            message = `Add post: ${post.title}`;
        } else if (action === 'update') {
            // Find and update existing post
            const index = data.posts.findIndex(p => p.id === postId);
            if (index === -1) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Post not found' })
                };
            }
            data.posts[index] = post;
            message = `Update post: ${post.title}`;
        } else if (action === 'delete') {
            // Remove post
            const index = data.posts.findIndex(p => p.id === postId);
            if (index === -1) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Post not found' })
                };
            }
            const deletedTitle = data.posts[index].title;
            data.posts.splice(index, 1);
            message = `Delete post: ${deletedTitle}`;
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action' })
            };
        }

        // Sort posts by date (newest first)
        data.posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Update file on GitHub
        await updateFile(filePath, data, sha, message);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Post ${action}d successfully. Site will redeploy automatically.`,
                postId: post?.id || postId
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to save post',
                details: error
            })
        };
    }
};
