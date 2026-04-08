const Question = require('../models/Question');

exports.getAll = async (req, res) => {
    try {
        const questions = await Question.find().sort({ createdAt: -1 });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getByMicroSkill = async (req, res) => {
    try {
        const questions = await Question.find({ micro_skill_id: req.params.microSkillId }).sort({ createdAt: -1 });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ error: 'Not found' });
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newQuestion = await Question.create(req.body);
        res.status(201).json(newQuestion);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedQuestion = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedQuestion) return res.status(404).json({ error: 'Not found' });
        res.json(updatedQuestion);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
        if (!deletedQuestion) return res.status(404).json({ error: 'Not found' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
