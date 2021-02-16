const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  quizName: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  category: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  description: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  complexity: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  timeLimit: {
    type: Number,
    required: false, 
  },
  retakeCountLimit: {
    type: Number,
    required: false, 
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },  
  imageUrl: {
    type: String,
    required: false,    
  },
  language: {
    type: String,
    required: false,    
  },
  questions: [
    {
      question: {
        type: String,
        required: true,
        min: 6,
        max: 255,
      },
      optionA: {
        type: String,
        required: true,
        min: 6,
        max: 255,
      },
      optionB: {
        type: String,
        required: true,
        min: 6,
        max: 255,
      },
      optionC: {
        type: String,
        required: true,
        min: 6,
        max: 255,
      },
      optionD: {
        type: String,
        required: true,
        min: 6,
        max: 255,
      },
      answer: {
        type: String,
        required: true,
        min: 1,
        max: 255,
      },
      points: {
        type: Number,
        required: false,
      },
      hints: {
        type: String,
        required: true,
        min: 1,
        max: 255,
      },
      timeLimit: {
        type: Number,
        required: false, 
      },
      difficulty: {
        type: String,
        required: true,
        min: 1,
        max: 255,
        default: "basic"
      },
    }
  ],
  status: {
    type: String,
    required: true,
    default: "draft"
  },
  isDeactivated: {
    type: Boolean,
    default: false    
  }
});

module.exports = mongoose.model("Quiz", quizSchema);