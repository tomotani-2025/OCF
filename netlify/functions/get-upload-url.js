/**
 * Netlify Function: Get Signed Upload URL from Supabase Storage
 *
 * Returns a signed URL that the client can use to upload files directly
 * to Supabase Storage, bypassing the Netlify request body size limit.
 * Used for large files like MP4 videos.
 */

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wafdatyvcgimpsetelyb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
}

async function createSignedUploadUrl(bucket, filePath) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${SUPABASE_URL}/storage/v1/object/upload/sign/${bucket}/${filePath}`);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'x-upsert': 'true'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch {
                        reject({ statusCode: 500, message: 'Failed to parse response' });
                    }
                } else {
                    try {
                        const error = JSON.parse(data);
                        reject({ statusCode: res.statusCode, message: error.message || 'Failed to create upload URL' });
                    } catch {
                        reject({ statusCode: res.statusCode, message: data || 'Failed to create upload URL' });
                    }
                }
            });
        });

        req.on('error', (e) => reject({ statusCode: 500, message: e.message }));
        req.write(JSON.stringify({}));
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
            body: JSON.stringify({ error: 'SUPABASE_SERVICE_KEY not configured' })
        };
    }

    try {
        const { filename, mimeType, postId, bucket } = JSON.parse(event.body);

        if (!filename || !mimeType || !postId || !bucket) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: filename, mimeType, postId, bucket' })
            };
        }

        const allowedBuckets = ['videos'];
        if (!allowedBuckets.includes(bucket)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid bucket. Only "videos" is allowed for direct upload.' })
            };
        }

        const sanitizedFilename = sanitizeFilename(filename.replace(/\.[^.]+$/, '')) + '.mp4';
        const filePath = `${postId}/${sanitizedFilename}`;

        const result = await createSignedUploadUrl(bucket, filePath);
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;

        // Supabase returns { url: "/object/upload/sign/bucket/path?token=..." }
        const signedUrl = result.url.startsWith('http')
            ? result.url
            : `${SUPABASE_URL}/storage/v1${result.url}`;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                signedUrl: signedUrl,
                publicUrl: publicUrl,
                filePath: filePath,
                filename: sanitizedFilename
            })
        };

    } catch (error) {
        console.error('Get upload URL error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to get upload URL'
            })
        };
    }
};
