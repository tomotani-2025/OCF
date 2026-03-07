/**
 * Netlify Function: Upload File to Supabase Storage
 *
 * Uploads images and PDFs to Supabase Storage buckets.
 * Returns the public URL for the uploaded file.
 */

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wafdatyvcgimpsetelyb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 25 * 1024 * 1024;   // 25MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

function getFileExtension(mimeType) {
    const extensions = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'application/pdf': '.pdf',
        'video/mp4': '.mp4',
        'video/quicktime': '.mov'
    };
    return extensions[mimeType] || '';
}

function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
}

async function uploadToSupabase(bucket, filePath, fileBuffer, mimeType) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': mimeType,
                'Content-Length': fileBuffer.length,
                'x-upsert': 'true'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
                    resolve({ url: publicUrl, path: filePath });
                } else {
                    try {
                        const error = JSON.parse(data);
                        reject({ statusCode: res.statusCode, message: error.message || 'Upload failed' });
                    } catch {
                        reject({ statusCode: res.statusCode, message: data || 'Upload failed' });
                    }
                }
            });
        });

        req.on('error', (e) => reject({ statusCode: 500, message: e.message }));
        req.write(fileBuffer);
        req.end();
    });
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

    if (!SUPABASE_SERVICE_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'SUPABASE_SERVICE_KEY not configured in Netlify environment variables' })
        };
    }

    try {
        const { file, filename, mimeType, postId } = JSON.parse(event.body);

        if (!file || !filename || !mimeType || !postId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: file, filename, mimeType, postId' })
            };
        }

        if (!/^[A-Za-z0-9+/=]+$/.test(file)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'content is not valid Base64' })
            };
        }

        const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
        const isPdf = ALLOWED_DOC_TYPES.includes(mimeType);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

        if (!isImage && !isPdf && !isVideo) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF, MP4, MOV' })
            };
        }

        const fileBuffer = Buffer.from(file, 'base64');
        const fileSize = fileBuffer.length;
        const maxSize = isVideo ? MAX_VIDEO_SIZE : (isImage ? MAX_IMAGE_SIZE : MAX_PDF_SIZE);

        if (fileSize > maxSize) {
            const maxLabel = isVideo ? '50MB' : (isImage ? '10MB' : '25MB');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: `File too large. Max size: ${maxLabel}` })
            };
        }

        const sanitizedFilename = sanitizeFilename(filename.replace(/\.[^.]+$/, '')) + getFileExtension(mimeType);
        const bucket = isVideo ? 'videos' : (isImage ? 'images' : 'documents');
        const filePath = `${postId}/${sanitizedFilename}`;

        const result = await uploadToSupabase(bucket, filePath, fileBuffer, mimeType);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                path: result.url,
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
                error: error.message || 'Failed to upload file'
            })
        };
    }
};
