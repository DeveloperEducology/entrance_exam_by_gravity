const Unit = require('../models/Unit');

exports.getAll = async (req, res) => {
    try {
        const units = await Unit.find().sort({ sequence: 1 });
        res.json(units);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getBySubject = async (req, res) => {
    try {
        const units = await Unit.find({ subject_id: req.params.subjectId }).sort({ sequence: 1 });
        res.json(units);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const unit = await Unit.findById(req.params.id);
        if (!unit) return res.status(404).json({ error: 'Not found' });
        res.json(unit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newUnit = await Unit.create(req.body);
        res.status(201).json(newUnit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedUnit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedUnit) return res.status(404).json({ error: 'Not found' });
        res.json(updatedUnit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deletedUnit = await Unit.findByIdAndDelete(req.params.id);
        if (!deletedUnit) return res.status(404).json({ error: 'Not found' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
