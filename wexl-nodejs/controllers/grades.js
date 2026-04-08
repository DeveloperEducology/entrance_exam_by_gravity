const Grade = require('../models/Grade');

exports.getAll = async (req, res) => {
    try {
        const grades = await Grade.find().sort({ sequence: 1 });
        res.json(grades);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const grade = await Grade.findById(req.params.id);
        if (!grade) return res.status(404).json({ error: 'Not found' });
        res.json(grade);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newGrade = await Grade.create(req.body);
        res.status(201).json(newGrade);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedGrade = await Grade.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedGrade) return res.status(404).json({ error: 'Not found' });
        res.json(updatedGrade);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deletedGrade = await Grade.findByIdAndDelete(req.params.id);
        if (!deletedGrade) return res.status(404).json({ error: 'Not found' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
