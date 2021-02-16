const mongoose = require("mongoose");

const userQuizSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,   
  },
  quizId: {
    type: String,
    required: true,   
  },  
  score: {
    type: Number,
    required: false, 
  },
  isPassed: {
    type: Boolean,
    default: false    
  },
  details: {
    type: String,
    required: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("UserQuiz", userQuizSchema);