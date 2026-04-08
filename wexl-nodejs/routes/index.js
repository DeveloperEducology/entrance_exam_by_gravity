const express = require('express');
const router = express.Router();

const gradesController = require('../controllers/grades');
const subjectsController = require('../controllers/subjects');
const unitsController = require('../controllers/units');
const microSkillsController = require('../controllers/micro_skills');
const questionsController = require('../controllers/questions');

// Grades Routes
router.get('/grades', gradesController.getAll);
router.get('/grades/:id', gradesController.getById);
router.post('/grades', gradesController.create);
router.put('/grades/:id', gradesController.update);
router.delete('/grades/:id', gradesController.delete);

// Subjects Routes
router.get('/subjects', subjectsController.getAll);
router.get('/grades/:gradeId/subjects', subjectsController.getByGrade);
router.get('/subjects/:id', subjectsController.getById);
router.post('/subjects', subjectsController.create);
router.put('/subjects/:id', subjectsController.update);
router.delete('/subjects/:id', subjectsController.delete);

// Units Routes
router.get('/units', unitsController.getAll);
router.get('/subjects/:subjectId/units', unitsController.getBySubject);
router.get('/units/:id', unitsController.getById);
router.post('/units', unitsController.create);
router.put('/units/:id', unitsController.update);
router.delete('/units/:id', unitsController.delete);

// Micro Skills Routes
router.get('/micro_skills', microSkillsController.getAll);
router.get('/units/:unitId/micro_skills', microSkillsController.getByUnit);
router.get('/micro_skills/:id', microSkillsController.getById);
router.post('/micro_skills', microSkillsController.create);
router.put('/micro_skills/:id', microSkillsController.update);
router.delete('/micro_skills/:id', microSkillsController.delete);

// Questions Routes
router.get('/questions', questionsController.getAll);
router.get('/micro_skills/:microSkillId/questions', questionsController.getByMicroSkill);
router.get('/questions/:id', questionsController.getById);
router.post('/questions', questionsController.create);
router.put('/questions/:id', questionsController.update);
router.delete('/questions/:id', questionsController.delete);

module.exports = router;
