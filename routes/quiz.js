const router = require("express").Router();
const verify = require("./verify.token");

let Quiz = require('../models/quiz.model');
let UserQuiz = require('../models/userquiz.model');

const STATUS_CODE_SUCCESS = 1;
const STATUS_CODE_FAILED = 0;

router.post('/add', verify, async (req, res) => {
    const quizName = req.body.name;
    const category = req.body.category;    
    const description = req.body.description;    
    const complexity = req.body.complexity;
    const timeLimit = req.body.timeLimit;
    const retakeCountLimit = req.body.retakeCountLimit;        
    const coverImage = req.body.coverImage;
    const questions = req.body.questions;
    const status = req.body.status;    
  
    const newQuiz = await new Quiz({
      quizName,
      category,      
      description,
      complexity,
      timeLimit,    
      retakeCountLimit,      
      coverImage,
      questions,
      status
    });
  
    newQuiz.save()
    .then(() => res.status(200).json({
        code:STATUS_CODE_SUCCESS,
        msg:"Quiz has been added!",
        quizId: newQuiz.id
      }))
    .catch(err => res.status(400).json('Error: ' + err));
});

// QUIZ
router.post("/getQuiz", verify, async (req, res) => {    
    console.log("getQuiz:"+req.body.id);
    // Checking if the quiz is already in the database
    const quiz = await Quiz.findById(req.body.id);
    
    return res.status(200).json({
        code: STATUS_CODE_SUCCESS,     
        quiz: quiz
    });
});

router.get("/getQuizzes/:page?/:search?", async (req, res) => {    
    let query = {
      status: 'published'
    };
    let search = req.params.search;
    if(search){
      const searchRgx = new RegExp(search, 'i')
      query.quizName = searchRgx    
    }

    let page = req.params.page ? req.params.page : 1;

    Quiz.find(query).then((data)=>{
      let per_page = 5;
      let num_page = Number(page);
      let max_pages = Math.ceil(data.length/per_page);
      if(num_page == 0 || num_page > max_pages){
          res.status(200).json({code:STATUS_CODE_SUCCESS,msg:"No Data Found!"});
      }else{
          let starting = per_page*(num_page-1)
          let ending = per_page+starting
          res.status(200).json({
            code:STATUS_CODE_SUCCESS,
            quizzes:data.slice(starting,ending),
            count: data.length, 
            pages: max_pages, 
            current_page: num_page
          });
      }
    });
});

router.post('/save', verify, async (req, res) => {
    const userId = req.body.userId;
    const quizId = req.body.quizId;
    const isPassed = req.body.isPassed;
    const score = req.body.score;    
    const details = req.body.details;    
  
    const userQuiz = await new UserQuiz({
      userId,
      quizId,      
      isPassed,
      score,
      details
    });
  
    userQuiz.save()
    .then(() => res.status(200).json({
        code:STATUS_CODE_SUCCESS,
        msg:"Quiz has been saved!",
        quizId: userQuiz.id
      }))
    .catch(err => res.status(400).json('Error: ' + err));
});

module.exports = router;