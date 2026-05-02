require('dotenv').config();
const { google } = require('googleapis');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// ─── R2 Uploader ──────────────────────────────────────────────────────────────
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function uploadToR2(imageUrl) {
    if (!process.env.R2_ACCOUNT_ID) return imageUrl;
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = response.data;
        const contentType = response.headers['content-type'] || 'image/png';
        let ext = 'png';
        if (contentType === 'image/jpeg') ext = 'jpg';
        else if (contentType === 'image/gif') ext = 'gif';
        
        const fileName = `import-docs/${uuidv4()}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: contentType,
        });

        await s3Client.send(command);
        return `${process.env.R2_PUBLIC_URL}/${fileName}`;
    } catch (err) {
        console.error('Error uploading to R2:', err.message);
        return imageUrl; // Fallback to original URL if it fails
    }
}

// ─── MongoDB Connection ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ixl_dashboard';
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 30000 })
    .then(() => console.log('✅ MongoDB connected:', MONGO_URI))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));

// ─── Schemas & Models ─────────────────────────────────────────────────────────
const { Schema } = mongoose;

const gradeSchema = new Schema({
    _id: { type: Schema.Types.Mixed, required: true },
    id: String,
    name: String,
    sort_order: Number,
    color_hex: String,
}, { _id: false });

const subjectSchema = new Schema({
    _id: { type: Schema.Types.Mixed, required: true },
    id: String,
    name: String,
    slug: String,
    grade_id: String,
}, { _id: false });

const unitSchema = new Schema({
    _id: { type: Schema.Types.Mixed, required: true },
    id: String,
    name: String,
    code: String,
    sort_order: Number,
    subject_id: String,
    grade_id: String,      // legacy support
}, { _id: false });

const microSkillSchema = new Schema({
    _id: { type: String, required: true },
    id: String,
    name: String,
    code: String,
    sort_order: Number,
    unit_id: String,
}, { _id: false });

const questionSchema = new Schema({
    _id: { type: String, required: true, default: () => require('uuid').v4() },
    id: String,
    type: String,
    title: String,
    template_id: String,
    logic_type: String,
    data_source: Schema.Types.Mixed,
    scaffold: Schema.Types.Mixed,
    difficulty: String,
    micro_skill_id: String,
    question_text: String,
    parts: { type: Schema.Types.Mixed, default: [] },
    options: { type: Schema.Types.Mixed, default: [] },
    correct_answer_index: { type: Number, default: -1 },
    correct_answer_indices: Schema.Types.Mixed,
    correct_answer_text: Schema.Types.Mixed,
    drag_groups: { type: Schema.Types.Mixed, default: [] },
    drag_items: { type: Schema.Types.Mixed, default: [] },
    solution: Schema.Types.Mixed,
    marks: { type: Number, default: 1 },
    is_multi_select: { type: Boolean, default: false },
    is_vertical: { type: Boolean, default: true },
    complexity: Number,
    show_submit_button: { type: Boolean, default: false },
    show_example: { type: Boolean, default: false },
    adaptive_config: Schema.Types.Mixed,
    concepts: { type: [Schema.Types.Mixed], default: [] },
    steps: { type: Schema.Types.Mixed, default: [] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
}, { _id: false, strict: false });

questionSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

const mediaSchema = new Schema({
    _id: { type: String, required: true, default: () => crypto.randomUUID() },
    name: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    type: String,
    created_at: { type: Date, default: Date.now },
});
 
const templateSchema = new Schema({
    _id: { type: String, required: true, default: () => crypto.randomUUID() },
    id: String,
    name: String,
    config: Schema.Types.Mixed,
    concepts: { type: [Schema.Types.Mixed], default: [] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
}, { _id: false, strict: false });

const lessonSchema = new Schema({
    _id: { type: String, required: true, default: () => crypto.randomUUID() },
    id: String,
    slug: String,
    title: String,
    microskillId: String,
    contentBlocks: { type: [Schema.Types.Mixed], default: [] },
    relatedItems: Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
}, { _id: false, strict: false });

const Grade = mongoose.model('Grade', gradeSchema, 'grades');
const Subject = mongoose.model('Subject', subjectSchema, 'subjects');
const Unit = mongoose.model('Unit', unitSchema, 'units');
const MicroSkill = mongoose.model('MicroSkill', microSkillSchema, 'micro_skills');
const Question = mongoose.model('Question', questionSchema, 'questions');
const Media = mongoose.model('Media', mediaSchema, 'media');
const Template = mongoose.model('Template', templateSchema, 'templates');
const Lesson = mongoose.model('Lesson', lessonSchema, 'lessons');

// ─── Helpers ───────────────────────────────────────────────────────────────────
// uuid is replaced by crypto.randomUUID (no external dep needed)

// Normalize _id <-> id for frontend compatibility
const toClient = (doc) => {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    obj._id = String(obj._id);
    if (!obj.id) obj.id = obj._id;
    else obj.id = String(obj.id);
    return obj;
};

const toClientMany = (docs) => docs.map(toClient);

// ─── Generic CRUD Factory ─────────────────────────────────────────────────────
function makeCrudRouter(Model, generateId = () => crypto.randomUUID()) {
    const router = require('express').Router();

    // LIST  GET /
    router.get('/', async (req, res) => {
        try {
            const query = {};
            for (const [key, val] of Object.entries(req.query)) {
                if (['order', 'ascending', 'limit'].includes(key)) continue;
                if (key.startsWith('filter_')) continue;

                if (key.endsWith('__in')) {
                    const field = key.replace('__in', '');
                    const vals = val.split(',');
                    if (field === 'id' || field === '_id') {
                        query.$or = [{ id: { $in: vals } }, { _id: { $in: vals } }];
                    } else {
                        query[field] = { $in: vals };
                    }
                } else {
                    if (key === 'id' || key === '_id') {
                        query.$or = [{ id: val }, { _id: val }];
                    } else {
                        query[key] = val;
                    }
                }
            }

            const sortField = req.query.order || 'name';
            const sortDir = req.query.ascending === 'false' ? -1 : 1;
            let dbQuery = Model.find(query).sort({ [sortField]: sortDir });
            if (req.query.limit) dbQuery = dbQuery.limit(parseInt(req.query.limit));

            const docs = await dbQuery.exec();
            res.json({ data: toClientMany(docs), error: null });
        } catch (err) {
            res.status(500).json({ data: null, error: { message: err.message } });
        }
    });

    // GET BY ID  GET /:id
    router.get('/:id', async (req, res) => {
        try {
            const doc = await Model.findOne({ $or: [{ _id: req.params.id }, { id: req.params.id }] });
            if (!doc) return res.status(404).json({ data: null, error: { message: 'Not found' } });
            res.json({ data: toClient(doc), error: null });
        } catch (err) {
            res.status(500).json({ data: null, error: { message: err.message } });
        }
    });

    // CREATE  POST /
    router.post('/', async (req, res) => {
        try {
            const body = Array.isArray(req.body) ? req.body : [req.body];
            const docs = body.map(item => {
                const id = item.id || item._id || generateId();
                return new Model({ ...item, _id: id });
            });
            const saved = await Model.insertMany(docs, { ordered: false }).catch(async (bulkErr) => {
                // If duplicate key, try upsert one by one
                if (bulkErr.code === 11000) {
                    const results = [];
                    for (const d of docs) {
                        const { _id, ...updateData } = d.toObject();
                        const r = await Model.findOneAndUpdate(
                            { $or: [{ _id }, { id: _id }] },
                            { $set: updateData, $setOnInsert: { _id } },
                            { upsert: true, new: true }
                        );
                        results.push(r);
                    }
                    return results;
                }
                throw bulkErr;
            });
            res.status(201).json({ data: toClientMany(Array.isArray(saved) ? saved : [saved]), error: null });
        } catch (err) {
            res.status(400).json({ data: null, error: { message: err.message } });
        }
    });

    // UPSERT (bulk)  POST /upsert
    router.post('/upsert', async (req, res) => {
        try {
            const body = Array.isArray(req.body) ? req.body : [req.body];
            const results = [];
            for (const item of body) {
                const id = item.id || item._id || generateId();
                const { _id, id: itemId, ...updateData } = item;
                const doc = await Model.findOneAndUpdate(
                    { $or: [{ _id: id }, { id: id }] },
                    { $set: { ...updateData, id }, $setOnInsert: { _id: id } },
                    { upsert: true, new: true }
                );
                results.push(doc);
            }
            res.json({ data: toClientMany(results), error: null });
        } catch (err) {
            res.status(400).json({ data: null, error: { message: err.message } });
        }
    });

    // UPDATE  PUT /:id
    router.put('/:id', async (req, res) => {
        try {
            const { id, _id, ...body } = req.body;
            const doc = await Model.findOneAndUpdate({ $or: [{ _id: req.params.id }, { id: req.params.id }] }, { ...body, updated_at: new Date() }, { new: true });
            if (!doc) return res.status(404).json({ data: null, error: { message: 'Not found' } });
            res.json({ data: toClient(doc), error: null });
        } catch (err) {
            res.status(400).json({ data: null, error: { message: err.message } });
        }
    });

    // DELETE  DELETE /:id
    router.delete('/:id', async (req, res) => {
        try {
            await Model.findOneAndDelete({ $or: [{ _id: req.params.id }, { id: req.params.id }] });
            res.json({ data: null, error: null });
        } catch (err) {
            res.status(500).json({ data: null, error: { message: err.message } });
        }
    });

    // BULK DELETE  DELETE /  (body: { ids: [...] })
    router.delete('/', async (req, res) => {
        try {
            const ids = req.body?.ids || [];
            if (!ids.length) return res.status(400).json({ data: null, error: { message: 'No ids provided' } });
            await Model.deleteMany({ _id: { $in: ids } });
            res.json({ data: null, error: null });
        } catch (err) {
            res.status(500).json({ data: null, error: { message: err.message } });
        }
    });

    return router;
}

// ─── API Routes ────────────────────────────────────────────────────────────────
const api = express.Router();

api.use('/grades', makeCrudRouter(Grade));
api.use('/subjects', makeCrudRouter(Subject));
api.use('/units', makeCrudRouter(Unit));
api.use('/micro_skills', makeCrudRouter(MicroSkill));
api.use('/questions', makeCrudRouter(Question));
api.use('/media', makeCrudRouter(Media));
api.use('/templates', makeCrudRouter(Template));
api.use('/lessons', makeCrudRouter(Lesson));

// ─── Special: Questions with micro_skills join ─────────────────────────────────
api.get('/questions_with_skills', async (req, res) => {
    try {
        const questions = await Question.find({}).sort({ created_at: -1 }).exec();
        const skillIds = [...new Set(questions.map(q => q.micro_skill_id).filter(Boolean))];
        const skills = await MicroSkill.find({ $or: [{ _id: { $in: skillIds } }, { id: { $in: skillIds } }] }).exec();
        const skillMap = {};
        skills.forEach(s => {
            const clientSkill = toClient(s);
            skillMap[s._id] = clientSkill;
            if (s.id) skillMap[s.id] = clientSkill;
        });

        const data = questions.map(q => {
            const obj = toClient(q);
            if (obj.micro_skill_id && skillMap[obj.micro_skill_id]) {
                obj.micro_skills = skillMap[obj.micro_skill_id];
            }
            return obj;
        });

        res.json({ data, error: null });
    } catch (err) {
        res.status(500).json({ data: null, error: { message: err.message } });
    }
});


// ─── Special: Import Google Doc ────────────────────────────────────────────────
api.all('/import-doc', async (req, res) => {
    try {
        // Accept from query string (GET) or request body (POST)
        let rawDocumentId = req.query.documentId || req.body.documentId;
        
        if (!rawDocumentId) {
            return res.status(400).json({ error: { message: 'documentId is required' } });
        }

        // Auto-extract ID if the user pastes the full URL
        let documentId = rawDocumentId;
        const urlMatch = rawDocumentId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (urlMatch && urlMatch[1]) {
            documentId = urlMatch[1];
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
            },
            scopes: [
                'https://www.googleapis.com/auth/documents.readonly',
                'https://www.googleapis.com/auth/drive.readonly',
            ],
        });

        const docs = google.docs({ version: 'v1', auth });

        const response = await docs.documents.get({
            documentId: documentId,
        });

        const docData = response.data;
        
        // 1. Extract all text and images from the document
        let fullText = '';
        if (docData.body && docData.body.content) {
            for (const item of docData.body.content) {
                if (item.paragraph) {
                    for (const el of item.paragraph.elements) {
                        if (el.textRun) {
                            let content = el.textRun.content;
                            const style = el.textRun.textStyle;
                            let classes = [];
                            
                            if (style) {
                                // 1. Check text color
                                if (style.foregroundColor && style.foregroundColor.color && style.foregroundColor.color.rgbColor) {
                                    const rgb = style.foregroundColor.color.rgbColor;
                                    const r = rgb.red || 0;
                                    const g = rgb.green || 0;
                                    const b = rgb.blue || 0;
                                    
                                    if (b > 0.5 && r < 0.6 && g < 0.6) classes.push('text-blue-600 font-bold');
                                    else if (r > 0.5 && b < 0.5 && g < 0.5) classes.push('text-red-600 font-bold');
                                    else if (g > 0.5 && r < 0.5 && b < 0.5) classes.push('text-green-600 font-bold');
                                }
                                
                                // 2. Check background highlight color
                                if (style.backgroundColor && style.backgroundColor.color && style.backgroundColor.color.rgbColor) {
                                    const rgb = style.backgroundColor.color.rgbColor;
                                    const r = rgb.red || 0;
                                    const g = rgb.green || 0;
                                    const b = rgb.blue || 0;
                                    
                                    if (r > 0.7 && g > 0.7 && b < 0.5) classes.push('bg-yellow-200 font-bold');
                                }
                                
                                // 3. Check font size (magnitude is in PT)
                                if (style.fontSize && style.fontSize.magnitude) {
                                    const size = style.fontSize.magnitude;
                                    if (size >= 24) classes.push('text-3xl');
                                    else if (size >= 18) classes.push('text-2xl');
                                    else if (size >= 14) classes.push('text-xl');
                                    else if (size >= 12 && size < 13) classes.push('text-lg');
                                }
                            }
                            
                            const trimmed = content.trim();
                            // Don't wrap our parser keywords!
                            const isKeyword = /^(question:|Options:|Type:|Solution:|Correct:|Micro_skill_id:|Text:)/i.test(trimmed);
                            
                            if (classes.length > 0 && trimmed.length > 0 && !isKeyword) {
                                content = content.replace(trimmed, `<span class='${classes.join(' ')}'>${trimmed}</span>`);
                            }
                            
                            fullText += content;
                        } else if (el.inlineObjectElement) {
                            const objId = el.inlineObjectElement.inlineObjectId;
                            if (docData.inlineObjects && docData.inlineObjects[objId]) {
                                const embeddedObj = docData.inlineObjects[objId].inlineObjectProperties.embeddedObject;
                                if (embeddedObj && embeddedObj.imageProperties) {
                                    let imgUrl = embeddedObj.imageProperties.contentUri;
                                    
                                    // Fetch the Google Doc image and upload it to your permanent R2 Bucket!
                                    imgUrl = await uploadToR2(imgUrl);

                                    // Extract the physical width of the image from the Google Doc
                                    let width = 300; // fallback width
                                    if (embeddedObj.size && embeddedObj.size.width && embeddedObj.size.width.magnitude) {
                                        // magnitude is usually in Points (PT). 1 pt ~ 1.33 px
                                        width = Math.round(embeddedObj.size.width.magnitude * 1.33);
                                    }
                                    
                                    // Extract label from the image's Alt Text (Title or Description)
                                    let label = embeddedObj.title || embeddedObj.description || '';
                                    label = label.replace(/\|/g, ''); // Remove pipes to prevent splitting issues
                                    
                                    fullText += ` [IMG]${imgUrl}|${width}|${label}[/IMG] `;
                                }
                            }
                        }
                    }
                } else if (item.table) {
                    // Convert Google Docs Table to Markdown Table
                    let tableMarkdown = '\n\n';
                    const rows = item.table.tableRows;
                    for (let r = 0; r < rows.length; r++) {
                        const row = rows[r];
                        let rowText = '|';
                        let divider = '|';
                        
                        for (const cell of row.tableCells) {
                            let cellText = '';
                            if (cell.content) {
                                for (const cellItem of cell.content) {
                                    if (cellItem.paragraph) {
                                        for (const el of cellItem.paragraph.elements) {
                                            if (el.textRun) {
                                                // Replace newlines so table structure isn't broken
                                                cellText += el.textRun.content.replace(/\n/g, ' ').trim() + ' ';
                                            } else if (el.inlineObjectElement) {
                                                const objId = el.inlineObjectElement.inlineObjectId;
                                                if (docData.inlineObjects && docData.inlineObjects[objId]) {
                                                    const embeddedObj = docData.inlineObjects[objId].inlineObjectProperties.embeddedObject;
                                                    if (embeddedObj && embeddedObj.imageProperties) {
                                                        let imgUrl = await uploadToR2(embeddedObj.imageProperties.contentUri);
                                                        let width = 300;
                                                        if (embeddedObj.size && embeddedObj.size.width && embeddedObj.size.width.magnitude) {
                                                            width = Math.round(embeddedObj.size.width.magnitude * 1.33);
                                                        }
                                                        let label = (embeddedObj.title || embeddedObj.description || '').replace(/\|/g, '');
                                                        cellText += ` [IMG]${imgUrl}|${width}|${label}[/IMG] `;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            rowText += ` ${cellText.trim()} |`;
                            divider += ' --- |';
                        }
                        
                        tableMarkdown += `${rowText}\n`;
                        if (r === 0) {
                            tableMarkdown += `${divider}\n`; // Add markdown header divider after first row
                        }
                    }
                    fullText += `${tableMarkdown}\n\n`;
                }
            }
        }

        // 2. Parse the text into structured questions
        const questions = [];
        // Split text by QUESTION, title:, or question:
        const rawBlocks = fullText.split(/(?=QUESTION\s+\d+|(?:^|\n)\s*title:|(?:^|\n)\s*question:)/i).filter(b => b.trim() !== '');
        
        const qBlocks = [];
        for (let i = 0; i < rawBlocks.length; i++) {
            if (/^\s*title:/i.test(rawBlocks[i]) && i + 1 < rawBlocks.length && /^\s*question:/i.test(rawBlocks[i+1])) {
                qBlocks.push(rawBlocks[i] + '\n' + rawBlocks[i+1]);
                i++; // skip next block since it's merged
            } else {
                qBlocks.push(rawBlocks[i]);
            }
        }
        
        qBlocks.forEach(block => {
            let q = { options: [] };
            
            // Extract explicit Title
            const titleMatch = block.match(/title:\s*(.*?)(?=\s*question:|\s*Type:|\s*Options:|$)/is);
            if (titleMatch) q.explicitTitle = titleMatch[1].trim();
            
            // Extract Type
            const typeMatch = block.match(/Type:\s*(.*?)(?=\s*Text:|\s*Options:|\s*question:|$)/is);
            if (typeMatch) q.type = typeMatch[1].trim();
            
            // Extract Text (Support both "Text: ..." and "question: ...")
            const easyTextMatch = block.match(/question:\s*(.*?)(?=\s*Options:|\s*Solution:|\s*Micro_skill_id:|$)/is);
            if (easyTextMatch) {
                q.text = easyTextMatch[1].trim();
            } else {
                const textMatch = block.match(/Text:\s*(.*?)(?=\s*Option [A-Z]:|\s*Options:|\s*Correct:|\s*Solution:|$)/is);
                if (textMatch) q.text = textMatch[1].trim();
            }
            
            // Extract Options (Support both "Option A: ..." and "Options: a, b, c")
            const optionsCommaMatch = block.match(/Options:\s*(.*?)(?=\s*Correct:|\s*Solution:|\s*Micro_skill_id:|$)/is);
            if (optionsCommaMatch) {
                const optText = optionsCommaMatch[1].trim();
                
                if (/Option\s+[A-Z]:/i.test(optText)) {
                    // Split by "Option A:", "Option B:", etc.
                    q.options = optText.split(/Option\s+[A-Z]:/i).map(o => o.trim()).filter(o => o);
                } else if (!optText.includes(',') && optText.includes('\n')) {
                    // Split by newline if no commas are found
                    q.options = optText.split('\n').map(o => o.trim().replace(/^[-*•\d.)\]]+\s*/, '')).filter(o => o);
                } else {
                    // Split by comma
                    q.options = optText.split(',').map(o => o.trim()).filter(o => o);
                }
            } else {
                const optionRegex = /Option\s+[A-Z]:\s*(.*?)(?=\s*Option [A-Z]:|\s*Correct:|\s*Solution:|$)/igs;
                let optMatch;
                while ((optMatch = optionRegex.exec(block)) !== null) {
                    q.options.push(optMatch[1].trim());
                }
            }
            
            // Extract Correct Answer
            const correctMatch = block.match(/Correct:\s*(.*?)(?=\s*Solution:|\s*Micro_skill_id:|$)/is);
            if (correctMatch) q.correct = correctMatch[1].trim();
            
            // Extract Solution
            const solutionMatch = block.match(/Solution:\s*(.*?)(?=\s*Micro_skill_id:|$)/is);
            if (solutionMatch) q.solution = solutionMatch[1].trim();

            // Extract Micro_skill_id
            const skillMatch = block.match(/Micro_skill_id:\s*(.*)/is);
            if (skillMatch) q.micro_skill_id = skillMatch[1].trim().replace(/,$/, '');
            
            questions.push(q);
        });

        // 3. Map to your MongoDB Question Schema
        const formattedQuestions = questions.map(q => {
            // Determine correct answers (Supports both "A, B" and "rubber, wood")
            let correctIndex = -1;
            let correctIndices = [];
            
            if (q.correct) {
                const correctAnswers = q.correct.split(',').map(c => c.trim().toLowerCase());
                
                correctAnswers.forEach(ans => {
                    // If they use letters like A, B, C
                    if (ans.length === 1 && ans >= 'a' && ans <= 'z') {
                        correctIndices.push(ans.charCodeAt(0) - 97);
                    } 
                    // If they just typed the answer out (e.g. "rubber")
                    else {
                        const idx = q.options.findIndex(opt => opt.toLowerCase().includes(ans));
                        if (idx !== -1) {
                            correctIndices.push(idx);
                        }
                    }
                });
            }

            if (correctIndices.length > 0) {
                correctIndex = correctIndices[0];
            }
            
            // Auto-detect multi-select based on number of correct answers
            const isMultiSelect = correctIndices.length > 1;

            // Parse text to separate out inline images and fill-in-the-blanks
            const parts = [];
            let finalType = q.type ? q.type.toLowerCase() : 'mcq';
            
            if (q.explicitTitle) {
                parts.push({ type: 'text', content: q.explicitTitle, isVertical: false, hasAudio: true });
            }
            
            if (q.text) {
                const textSegments = q.text.split(/\[IMG\](.*?)\[\/IMG\]/g);
                for (let i = 0; i < textSegments.length; i++) {
                    if (i % 2 === 0) {
                        const innerText = textSegments[i];
                        const fillSegments = innerText.split(/\[(.*?)\]/g);
                        for (let j = 0; j < fillSegments.length; j++) {
                            if (j % 2 === 0) {
                                let cText = fillSegments[j].trim();
                                // Remove dangling commas
                                cText = cText.replace(/^,\s*|\s*,\s*$/g, '').trim();
                                if (cText) {
                                    parts.push({ type: 'text', content: cText, isVertical: false, hasAudio: true });
                                }
                            } else {
                                const ans = fillSegments[j].trim();
                                const inputId = `blank_${q.blankCounter || 0}`;
                                parts.push({ type: 'input', id: inputId, answer: ans, isVertical: false, hasAudio: false });
                                q.blankAnswers = q.blankAnswers || {};
                                q.blankAnswers[inputId] = ans;
                                q.blankCounter = (q.blankCounter || 0) + 1;
                                finalType = 'fill-in-the-blank';
                            }
                        }
                    } else {
                        const imgData = textSegments[i].split('|');
                        const imgObj = { 
                            type: 'image', 
                            url: imgData[0],
                            imageUrl: imgData[0],
                            content: imgData[0],
                            width: parseInt(imgData[1], 10) || 300,
                            isVertical: false,
                            count: 1,
                            gridColumns: ""
                        };
                        if (imgData[2] && imgData[2].trim() !== '') {
                            imgObj.label = imgData[2].trim();
                        }
                        parts.push(imgObj);
                    }
                }
            }
            if (parts.length === 0) parts.push({ type: 'text', content: '', isVertical: false, hasAudio: true });

            // Handle options
            const parsedOptions = q.options.map(opt => {
                const optMatch = opt.match(/\[IMG\](.*?)\[\/IMG\]/);
                if (optMatch) {
                    const imgData = optMatch[1].split('|');
                    return { type: 'image', url: imgData[0], imageUrl: imgData[0], content: imgData[0], width: parseInt(imgData[1], 10) || 300, label: imgData[2] || '' };
                }
                // Return plain string if text
                return opt.trim();
            });

            // Map solution into the expected stringified array format
            let finalSolution = "";
            if (q.solution) {
                finalSolution = JSON.stringify([{ type: 'text', content: q.solution.trim(), isVertical: true, hasAudio: true }]);
            }

            // Build correct_answer_text for fill in the blanks
            let finalCorrectText = null;
            if (finalType === 'fill-in-the-blank' && q.blankAnswers) {
                if (q.blankCounter === 1) {
                    finalCorrectText = q.blankAnswers['blank_0'];
                } else {
                    finalCorrectText = JSON.stringify(q.blankAnswers);
                }
            }

            // Handle interactive_paragraph specifically
            let dataSource = undefined;
            let logicType = undefined;
            if (q.type && q.type.toLowerCase() === 'interactive_paragraph') {
                finalType = 'fillInTheBlank';
                logicType = 'interactive_paragraph_v1';
                
                let templateText = "";
                let answersObj = {};
                let counter = 0;
                
                if (q.text) {
                    const textSegments = q.text.split(/\[IMG\](.*?)\[\/IMG\]/g);
                    for (let i = 0; i < textSegments.length; i++) {
                        if (i % 2 === 0) {
                            const innerText = textSegments[i];
                            const fillSegments = innerText.split(/\[(.*?)\]/g);
                            for (let j = 0; j < fillSegments.length; j++) {
                                if (j % 2 === 0) {
                                    templateText += fillSegments[j];
                                } else {
                                    const key = `step${counter + 1}`;
                                    templateText += `[[${key}]]`;
                                    answersObj[key] = fillSegments[j].trim();
                                    counter++;
                                }
                            }
                        } else {
                            const imgData = textSegments[i].split('|');
                            templateText += `\n![${imgData[2] || 'image'}](${imgData[0]})\n`;
                        }
                    }
                }
                
                dataSource = {
                    template: templateText.trim(),
                    answers: answersObj
                };
            }

            const cleanedTitle = q.text ? q.text.replace(/\[IMG\].*?\[\/IMG\]/g, '').replace(/\[|\]/g, '').replace(/[\n,]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
            const finalTitle = q.explicitTitle || (cleanedTitle ? (cleanedTitle.length > 50 ? cleanedTitle.substring(0, 50) + '...' : cleanedTitle) : 'Imported Question');
            return {
                type: finalType,
                logic_type: logicType,
                data_source: dataSource,
                title: finalTitle,
                parts: parts,
                options: parsedOptions,
                correct_answer_index: correctIndex,
                correct_answer_indices: correctIndices,
                correct_answer_text: finalCorrectText,
                micro_skill_id: q.micro_skill_id || '',
                solution: finalSolution,
                steps: [],
                adaptive_config: {
                    conceptTags: [],
                    misconceptionCode: "",
                    targetComplexityBand: "low",
                    inputMode: "default",
                    gridMode: "auto",
                    orientation: "vertical",
                    showKeypad: true,
                    autoAdvance: true,
                    keypadKeys: [],
                    gridColumns: null,
                    logic_type: logicType // Add logic_type to adaptive_config as well just in case
                },
                marks: isMultiSelect ? correctIndices.length : 1,
                is_multi_select: isMultiSelect,
                is_vertical: true
            };
        });

        res.json({ 
            data: { 
                title: docData.title, 
                formattedQuestions: formattedQuestions,
                // rawParsed: questions, // uncomment if you need to see the intermediate step
                // rawText: fullText     // uncomment if you need to see the raw text
            }, 
            error: null 
        });

    } catch (err) {
        console.error("Error fetching Google Doc:", err);
        res.status(500).json({ data: null, error: { message: err.message } });
    }
});


// ─── Special: Nested Structure (Grades -> Subjects -> Units -> MicroSkills) ───
// ─── Bulk Media URL Upload ───────────────────────────────────────────────────
api.post('/media/bulk-upload-urls', async (req, res) => {
    try {
        const { urls } = req.body;
        if (!Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: { message: "An array of 'urls' is required." } });
        }

        const results = [];
        for (let i = 0; i < urls.length; i++) {
            const originalUrl = urls[i];
            try {
                const r2Url = await uploadToR2(originalUrl);
                
                // Save to MongoDB Media Registry
                const cleanName = originalUrl.split('/').pop().split('?')[0].replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, " ") || `Bulk Upload ${Date.now()}`;
                
                const newMedia = new Media({
                    id: require('uuid').v4(),
                    name: cleanName,
                    url: r2Url,
                    type: 'image/external'
                });
                await newMedia.save();

                results.push({ original: originalUrl, r2_url: r2Url, success: true });
            } catch (err) {
                results.push({ original: originalUrl, r2_url: null, success: false, error: err.message });
            }
        }

        res.json({ data: results, error: null });
    } catch (error) {
        console.error("Bulk Upload Error:", error);
        res.status(500).json({ error: { message: error.message } });
    }
});

api.get('/structure', async (req, res) => {
    try {
        console.log('Structure fetch requested');
        const grades = await Grade.find({}).sort({ sort_order: 1 }).lean();
        const subjects = await Subject.find({}).sort({ name: 1 }).lean();
        const units = await Unit.find({}).sort({ sort_order: 1 }).lean();
        const microSkills = await MicroSkill.find({}).sort({ sort_order: 1 }).lean();

        console.log(`Counts - Grades: ${grades.length}, Subjects: ${subjects.length}, Units: ${units.length}, Skills: ${microSkills.length}`);

        const structure = grades.map(g => {
            const gid = String(g.id || g._id);
            const gradeSubjects = subjects
                .filter(s => String(s.grade_id) === gid)
                .map(s => {
                    const sid = String(s.id || s._id);
                    const subjectUnits = units
                        .filter(u => String(u.subject_id) === sid)
                        .map(u => {
                            const uid = String(u.id || u._id);
                            const unitSkills = microSkills
                                .filter(ms => String(ms.unit_id) === uid);
                            return toClient({ ...u, micro_skills: unitSkills.map(toClient) });
                        });
                    return toClient({ ...s, units: subjectUnits });
                });
            return toClient({ ...g, subjects: gradeSubjects });
        });

        res.json({ data: structure, error: null });
    } catch (err) {
        console.error('SERVER ERROR in /api/structure:', err);
        res.status(500).json({ data: null, error: { message: err.message, stack: err.stack } });
    }
});

const DB_STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
api.get('/health', (req, res) => res.json({
    status: 'ok',
    db: DB_STATES[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString()
}));

app.use('/api', api);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
