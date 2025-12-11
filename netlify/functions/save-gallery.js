/**
 * Netlify Function: Save Gallery
 *
 * Saves gallery data to gallery.json via GitHub API.
 */

const https = require('https');

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
            return { content: { categories: [], images: [] }, sha: null };
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
        const { action, image, imageId, images, categories } = JSON.parse(event.body);
        const filePath = 'site/data/gallery.json';

        const { content: data, sha } = await getFileContent(filePath);
        let message;

        if (action === 'add') {
            // Add new image
            const newId = String(Date.now());
            const newImage = { ...image, id: newId };
            data.images.push(newImage);
            message = `Add gallery image: ${image.caption || 'Untitled'}`;
        } else if (action === 'update') {
            // Update existing image
            const index = data.images.findIndex(img => img.id === imageId);
            if (index === -1) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Image not found' })
                };
            }
            data.images[index] = { ...data.images[index], ...image };
            message = `Update gallery image: ${image.caption || 'Untitled'}`;
        } else if (action === 'delete') {
            // Delete image
            const index = data.images.findIndex(img => img.id === imageId);
            if (index === -1) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Image not found' })
                };
            }
            data.images.splice(index, 1);
            message = 'Delete gallery image';
        } else if (action === 'reorder') {
            // Reorder images
            if (images && Array.isArray(images)) {
                data.images = images;
                message = 'Reorder gallery images';
            } else {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Images array required for reorder' })
                };
            }
        } else if (action === 'update-categories') {
            // Update categories
            if (categories && Array.isArray(categories)) {
                data.categories = categories;
                message = 'Update gallery categories';
            } else {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Categories array required' })
                };
            }
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action' })
            };
        }

        // Sort images by order
        data.images.sort((a, b) => (a.order || 0) - (b.order || 0));

        await updateFile(filePath, data, sha, message);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Gallery ${action} completed successfully`
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to save gallery'
            })
        };
    }
};
