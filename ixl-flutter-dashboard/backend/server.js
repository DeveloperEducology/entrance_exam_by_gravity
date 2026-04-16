require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));

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
    adaptive_config: Schema.Types.Mixed,
    concepts: { type: [Schema.Types.Mixed], default: [] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
}, { _id: false });

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


// ─── Special: Nested Structure (Grades -> Subjects -> Units -> MicroSkills) ───
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
