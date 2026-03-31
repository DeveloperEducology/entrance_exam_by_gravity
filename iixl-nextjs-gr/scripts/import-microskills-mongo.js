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
  const out = { file: '' };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--file' && argv[i + 1]) out.file = argv[++i];
  }
  return out;
}

async function main() {
  loadEnvLocal();
  const { file } = parseArgs(process.argv);
  if (!file) {
    throw new Error('Usage: node scripts/import-microskills-mongo.js --file <skills.json>');
  }
  const uri = String(process.env.MONGODB_URI || '').trim();
  if (!uri) throw new Error('MONGODB_URI missing in .env.local');

  const abs = path.resolve(process.cwd(), file);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const rows = Array.isArray(raw) ? raw : [raw];
  if (rows.length === 0) throw new Error(`No skill rows found in ${abs}`);

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const coll = db.collection('microskills');

  const nowIso = new Date().toISOString();
  const docs = rows.map((skill, i) => {
    const doc = {
      ...skill,
      created_at: skill.created_at || nowIso,
      updated_at: skill.updated_at || nowIso,
    };
    
    // Ensure id exists (use _id if present, or id)
    if (!doc.id && doc._id) doc.id = String(doc._id);
    if (!doc.id) throw new Error(`Skill at index ${i} is missing an 'id' or '_id'.`);
    
    return doc;
  });

  console.log(`Importing ${docs.length} skills into 'microskills' collection...`);
  
  // Use replaceOne with upsert to avoid duplicates and allow updates
  let inserted = 0;
  let updated = 0;
  
  for (const doc of docs) {
    const filter = doc._id ? { _id: doc._id } : { id: doc.id };
    const res = await coll.replaceOne(filter, doc, { upsert: true });
    if (res.upsertedCount > 0) inserted++;
    else updated++;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        total: docs.length,
        inserted,
        updated,
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
