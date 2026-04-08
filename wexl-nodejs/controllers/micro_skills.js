const MicroSkill = require('../models/MicroSkill');

exports.getAll = async (req, res) => {
    try {
        const microSkills = await MicroSkill.find().sort({ sequence: 1 });
        res.json(microSkills);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getByUnit = async (req, res) => {
    try {
        const microSkills = await MicroSkill.find({ unit_id: req.params.unitId }).sort({ sequence: 1 });
        res.json(microSkills);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const microSkill = await MicroSkill.findById(req.params.id);
        if (!microSkill) return res.status(404).json({ error: 'Not found' });
        res.json(microSkill);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newMicroSkill = await MicroSkill.create(req.body);
        res.status(201).json(newMicroSkill);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedMicroSkill = await MicroSkill.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedMicroSkill) return res.status(404).json({ error: 'Not found' });
        res.json(updatedMicroSkill);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deletedMicroSkill = await MicroSkill.findByIdAndDelete(req.params.id);
        if (!deletedMicroSkill) return res.status(404).json({ error: 'Not found' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
