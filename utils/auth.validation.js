// Validation
const Joi = require("joi");

// Register validation
const registerValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(6).max(30).required(),
    email: Joi.string().min(6).max(60).required().email(),
    password: Joi.string().min(6).max(60).required(),
    allowExtraEmails: Joi.boolean(),
    acceptTermsAndCondition: Joi.boolean()
  });
  return schema.validate(data);
};

// Login validation
const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().min(6).max(60).required().email(),
    password: Joi.string().min(6).max(60).required(),
  });
  return schema.validate(data);
};

module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
