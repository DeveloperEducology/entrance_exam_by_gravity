const Subject = require('../models/Subject');

exports.getAll = async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ sequence: 1 });
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getByGrade = async (req, res) => {
    try {
        const subjects = await Subject.find({ grade_id: req.params.gradeId }).sort({ sequence: 1 });
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ error: 'Not found' });
        res.json(subject);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newSubject = await Subject.create(req.body);
        res.status(201).json(newSubject);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedSubject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedSubject) return res.status(404).json({ error: 'Not found' });
        res.json(updatedSubject);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deletedSubject = await Subject.findByIdAndDelete(req.params.id);
        if (!deletedSubject) return res.status(404).json({ error: 'Not found' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
