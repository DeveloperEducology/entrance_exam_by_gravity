/**
 * migrate-from-supabase.js
 * 
 * Pulls all data from Supabase (grades, subjects, units, micro_skills, questions)
 * and upserts it into the local MongoDB backend via its REST API.
 *
 * Usage:
 *   node migrate-from-supabase.js
 *
 * Requirements:
 *   - Backend server running at http://localhost:5000
 *   - .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *   - npm install @supabase/supabase-js (already available in root node_modules)
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ─── Load env ──────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
const envVars = Object.fromEntries(
    readFileSync(envPath, 'utf-8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => {
            const idx = l.indexOf('=');
            return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        })
);

const SUPABASE_URL = envVars.VITE_SUPABASE_URL?.trim();
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY?.trim();
const BACKEND_URL = 'http://localhost:5000/api';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

// ─── Custom Fetch to bypass ISP DNS block ──────────────────────────────────────
const bypassFetch = (url, options = {}) => {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === 'sculcgyxppcsxpdrfrrz.supabase.co') {
        return new Promise((resolve, reject) => {
            const extractedHeaders = {};
            if (options.headers) {
                if (typeof options.headers.entries === 'function') {
                    for (const [k, v] of options.headers.entries()) extractedHeaders[k] = v;
                } else {
                    Object.assign(extractedHeaders, options.headers);
                }
            }

            const reqOptions = {
                hostname: '104.18.38.10',
                port: 443,
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'GET',
                headers: {
                    ...extractedHeaders,
                    'Host': parsedUrl.hostname,
                }
            };

            const req = https.request(reqOptions, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        headers: {
                            get: (n) => res.headers[n.toLowerCase()],
                            forEach: (cb) => {
                                for (let k in res.headers) cb(res.headers[k], k);
                            }
                        },
                        text: async () => body,
                        json: async () => JSON.parse(body)
                    });
                });
            });

            req.on('error', reject);
            if (options.body) req.write(options.body);
            req.end();
        });
    }

    return fetch(url, options); // native fallback
};

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { fetch: bypassFetch }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchAll(table, select = '*', options = {}) {
    const { order = 'id', pageSize = 1000 } = options;
    let all = [];
    let from = 0;

    while (true) {
        let q = supabase.from(table).select(select).order(order, { ascending: true }).range(from, from + pageSize - 1);
        const { data, error } = await q;
        if (error) throw new Error(`Supabase fetch ${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
    }

    return all;
}

async function upsertToMongo(table, records, batchSize = 200) {
    if (!records.length) {
        console.log(`  ⏭  No records for ${table}`);
        return;
    }

    let inserted = 0;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const res = await fetch(`${BACKEND_URL}/${table}/upsert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch),
        });
        const json = await res.json();
        if (json.error) throw new Error(`Mongo upsert ${table}: ${json.error.message}`);
        inserted += batch.length;
        process.stdout.write(`\r  ✅ ${table}: ${inserted}/${records.length}`);
    }
    console.log(); // newline
}

// ─── Migration ─────────────────────────────────────────────────────────────────
async function migrate() {
    console.log('\n🚀 Starting Supabase → MongoDB Migration');
    console.log(`   Supabase: ${SUPABASE_URL}`);
    console.log(`   MongoDB:  ${BACKEND_URL}`);
    console.log('─'.repeat(55));

    // Check backend health
    try {
        const h = await fetch(`${BACKEND_URL}/health`);
        const hj = await h.json();
        if (hj.db !== 'connected') throw new Error('DB not connected');
        console.log(`✅ Backend healthy — DB: ${hj.db}`);
    } catch (e) {
        console.error('❌ Backend not reachable. Is npm run dev running in backend/?');
        process.exit(1);
    }

    const tables = [
        { name: 'grades', order: 'sort_order' },
        { name: 'subjects', order: 'name' },
        { name: 'units', order: 'sort_order' },
        { name: 'micro_skills', order: 'sort_order' },
        { name: 'questions', order: 'created_at' },
    ];

    const results = {};

    for (const { name, order } of tables) {
        console.log(`\n📥 Fetching ${name} from Supabase...`);
        try {
            const data = await fetchAll(name, '*', { order, pageSize: 1000 });
            console.log(`   Found ${data.length} records`);
            results[name] = data.length;

            if (data.length > 0) {
                console.log(`📤 Upserting ${name} into MongoDB...`);
                await upsertToMongo(name, data);
            }
        } catch (err) {
            console.error(`\n❌ Error migrating ${name}:`, err.message);
            results[name] = `ERROR: ${err.message}`;
        }

        await sleep(300); // small delay between tables
    }

    console.log('\n' + '─'.repeat(55));
    console.log('📊 Migration Summary:');
    for (const [table, count] of Object.entries(results)) {
        const icon = typeof count === 'number' ? '✅' : '❌';
        console.log(`   ${icon} ${table}: ${count}`);
    }
    console.log('\n✨ Done!\n');
}

migrate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
