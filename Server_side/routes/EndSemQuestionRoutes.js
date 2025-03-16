const express = require('express');
const router = express.Router();
const EndSemQuestionController = require('../controllers/EndSemQuestionController');
const Upload = require('../middlewares/MulterUpload');

// GET questions by subject and part - add error handling wrapper
router.get(
  '/', 
  async (req, res, next) => {
    console.log('DEBUG: Route handler called with query:', req.query);
    try {
      await EndSemQuestionController.getQuestionsBySubjectAndPart(req, res);
    } catch (err) {
      console.error('DEBUG: Error in route handler:', err);
      next(err);
    }
  }
);

// CREATE a new question (with optional file upload)
router.post(
  '/questions', 
  Upload.single('questionImage'),
  EndSemQuestionController.createQuestion
);

// UPDATE a specific question
router.put(
  '/questions/:id', 
  Upload.single('questionImage'),
  EndSemQuestionController.updateQuestion
);

// DELETE a specific question
router.delete(
  '/questions/:id', 
  EndSemQuestionController.deleteQuestion
);

// GENERATE question paper
router.post(
  '/generate-paper',
  EndSemQuestionController.generateQuestionPaper
);

// GET image for a specific question
router.get(
  '/questions/:id/image',
  EndSemQuestionController.getQuestionImage
);

module.exports = router;
