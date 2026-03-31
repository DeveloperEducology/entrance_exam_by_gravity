#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function loadEnvLocal(file = '.env.local') {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const out = { file: '', microskillId: '' };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--file' && argv[i + 1]) out.file = argv[++i];
    else if ((argv[i] === '--microskillId' || argv[i] === '--microSkillId') && argv[i + 1]) {
      out.microskillId = argv[++i];
    }
  }
  return out;
}

async function main() {
  loadEnvLocal();
  const { file, microskillId } = parseArgs(process.argv);
  if (!file) {
    throw new Error('Usage: node scripts/import-questions-mongo.js --file <seed.json> [--microskillId <id>]');
  }
  const uri = String(process.env.MONGODB_URI || '').trim();
  if (!uri) throw new Error('MONGODB_URI missing in .env.local');

  const abs = path.resolve(process.cwd(), file);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const rows = Array.isArray(raw) ? raw : [raw]; // Support single object too
  if (rows.length === 0) throw new Error(`No question rows found in ${abs}`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const coll = db.collection('questions');

  const nowIso = new Date().toISOString();
  const docs = rows.map((q, i) => {
    // If command line microskillId was provided, it overrides. Else, use the one in the object.
    const targetSkillId = microskillId || q.micro_skill_id || q.microSkillId || q.microskill_id;
    if (!targetSkillId) {
      throw new Error(`Row ${i} missing micro_skill_id and no global --microskillId provided. Use --microskillId to apply to all.`);
    }

    const doc = {
      ...q,
      microSkillId: targetSkillId,
      micro_skill_id: targetSkillId,
      microskill_id: targetSkillId,
      created_at: q.created_at || nowIso,
      updated_at: q.updated_at || nowIso,
    };
    
    // If the object already has a MongoDB _id (e.g. from an export), use it.
    // Otherwise use id or generate a stable fallback.
    if (q._id) {
       doc._id = q._id;
    } else if (q.id) {
       doc.id = String(q.id);
    } else {
       doc.id = `${targetSkillId}-${i + 1}`;
    }

    return doc;
  });

  const result = await coll.insertMany(docs, { ordered: false });
  console.log(
    JSON.stringify(
      {
        ok: true,
        inserted: result.insertedCount || Object.keys(result.insertedIds || {}).length,
        file: path.basename(file)
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err.message || String(err));
    process.exit(1);
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {}
  });
