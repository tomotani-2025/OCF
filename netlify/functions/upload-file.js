/**
 * Netlify Function: Upload File
 *
 * Uploads an image or PDF to the repository via GitHub API.
 * Files are organized into appropriate folders:
 * - Images: site/images/news/{post-id}/
 * - PDFs: site/documents/news/{post-id}/
 */

const https = require('https');

// Environment variables (set in Netlify dashboard)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'omotani/omotani-caring-foundation';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'master';

// Max file sizes (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 25 * 1024 * 1024;   // 25MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf'];

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

async function getFileSha(filePath) {
    try {
        const response = await githubRequest('GET', `/contents/${filePath}?ref=${GITHUB_BRANCH}`);
        return response.sha;
    } catch (error) {
        // File doesn't exist, return null
        if (error.statusCode === 404) {
            return null;
        }
        throw error;
    }
}

async function uploadToGitHub(filePath, content, message) {
    // Check if file exists and get its SHA (required for updates)
    const existingSha = await getFileSha(filePath);

    const body = {
        message: message,
        content: content, // Already base64 encoded
        branch: GITHUB_BRANCH
    };

    // Include SHA if updating an existing file
    if (existingSha) {
        body.sha = existingSha;
    }

    return githubRequest('PUT', `/contents/${filePath}`, body);
}

function sanitizeFilename(filename) {
    // Remove or replace unsafe characters
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
}

function getFileExtension(mimeType) {
    const extensions = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'application/pdf': '.pdf'
    };
    return extensions[mimeType] || '';
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
        const { file, filename, mimeType, postId, fileType } = JSON.parse(event.body);

        // Validate inputs
        if (!file || !filename || !mimeType || !postId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: file, filename, mimeType, postId' })
            };
        }

        // Validate file type
        const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
        const isPdf = ALLOWED_DOC_TYPES.includes(mimeType);

        if (!isImage && !isPdf) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF' })
            };
        }

        // Check file size (base64 is ~33% larger than binary)
        const fileSize = Math.ceil(file.length * 0.75);
        const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_PDF_SIZE;

        if (fileSize > maxSize) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: `File too large. Max size: ${isImage ? '10MB' : '25MB'}`
                })
            };
        }

        // Build file path
        const sanitizedFilename = sanitizeFilename(filename.replace(/\.[^.]+$/, '')) + getFileExtension(mimeType);
        const folder = isImage ? 'site/images/news' : 'site/documents/news';
        const filePath = `${folder}/${postId}/${sanitizedFilename}`;
        const webPath = filePath.replace('site/', '');

        // Upload to GitHub
        await uploadToGitHub(filePath, file, `Upload ${isImage ? 'image' : 'PDF'}: ${sanitizedFilename}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                path: webPath,
                filename: sanitizedFilename,
                message: 'File uploaded successfully'
            })
        };

    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to upload file',
                details: error
            })
        };
    }
};
