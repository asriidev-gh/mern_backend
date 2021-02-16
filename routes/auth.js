const router = require("express").Router();
const User = require("../models/users.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const verify = require("./verify.token");

const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client("833865276502-psc9rbvs5gva6qogpnm8fqf3sdq2smdf.apps.googleusercontent.com");

const cryptoRandomString = require("crypto-random-string");
const { Code } = require("../models/secretcode.model");
const emailService = require("../utils/nodemailer");
const EMAIL_USERNAME = process.env.EMAIL_USERNAME;
const VERIFIED_ACCOUNT_REDIRECT_URL = process.env.VERIFIED_ACCOUNT_REDIRECT_URL;
const APP_NAME = process.env.APP_NAME;

const { registerValidation, loginValidation } = require("../utils/auth.validation");
const JWT_SECRET = process.env.TOKEN_SECRET;

const STATUS_CODE_SUCCESS = 1;
const STATUS_CODE_FAILED = 0;

router.post("/register", async (req, res) => {
  // Lets validate data before we create a user
  const { error } = registerValidation(req.body);
  if (error) return res.status(400).json({code:STATUS_CODE_FAILED,msg:error.details[0].message});

  //   Checking if the user is already in the database
  const emailExist = await User.findOne({ email: req.body.email });
  if (emailExist) return res.status(400).json({code:STATUS_CODE_FAILED,msg:"Email already exists"});

  //   Hash passwords
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: hashedPassword,
    allowExtraEmails: req.body.allowExtraEmails,
    accepted: req.body.acceptTermsAndCondition,
    authType: "local"
  });

  try {
    const savedUser = await user.save();
    if (!savedUser) throw Error('Something went wrong saving the user');

    const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, {
      expiresIn: 3600
    });
    
    const secretCode = cryptoRandomString({
        length: 6,
    });
    const newCode = new Code({
        code: secretCode,
        email: user.email,
    });
    await newCode.save();

    let baseUrl = req.protocol + "://" + req.get("host");
    
    if(process.env.NODE_ENV=="production"){
      baseUrl = baseUrl + "/production";
    }
    
    const data = {
        from: `${APP_NAME} <${EMAIL_USERNAME}>`,
        to: user.email,
        subject: "Your Activation Link for Account",
        text: `Welcome! Thank you for signing up, please use the following link within the next 10 minutes to activate your account: ${baseUrl}/api/user/verification/verify-account/${user._id}/${secretCode}`,
        html: `<p>Please use the following link within the next 10 minutes to activate your account: <strong><a href="${baseUrl}/api/user/verification/verify-account/${user._id}/${secretCode}" target="_blank">Activate NOW!</a></strong></p>`,
    };
    await emailService.sendMail(data);

    res.status(200).json({
      code: STATUS_CODE_SUCCESS,
      token: token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        allowExtraEmails: savedUser.allowExtraEmails,
        authType: "local"
      }
    });
  } catch (e) {
    res.status(400).json({ code:STATUS_CODE_FAILED, error: e.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try{
    // Lets validate data before we create a user
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).json({code:STATUS_CODE_FAILED,msg:error.details[0].message});

    // Checking if the user is already in the database
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send({code:STATUS_CODE_FAILED,msg:"Your Email or Password is Incorrect!"});

    // Checking if deactivated
    if(user.isDeactivated) return res.status(400).send({code:STATUS_CODE_FAILED,msg:"Your Account has been deactivated already!"});
    
    // Password is Correct
    const validPass = await bcrypt.compare(req.body.password, user.password);

    if (!validPass) return res.status(400).json({code:STATUS_CODE_FAILED,msg:"Invalid Credentials"});

    //   Create and assign a token
    const token = jwt.sign({ _id: user._id }, JWT_SECRET, {expiresIn: 36000000});
    // res.header("auth-token", token).send(token);
    res.status(200).json({
      code: STATUS_CODE_SUCCESS,
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        authType: "local"        
      }
    });

    // res.send("Logged In!");
  }catch(err){
    res.status(400).json({ code:STATUS_CODE_FAILED, msg: err.message });
    // console.log("Err: "+err);
  }
});

// #route:  GET /verification/verify-account
// #desc:   Verify user's email address
// #access: Public
router.get("/verification/verify-account/:userId/:secretCode", async (req, res) => {
      try {        
          const user = await User.findById(req.params.userId);          
          const response = await Code.findOne({
              email: user.email,
              code: req.params.secretCode,
          });         

          if (!user) {
              res.sendStatus(401);
          } else {
              await User.updateOne(
                  { email: user.email },
                  { isActivated: true }
              );
              await Code.deleteMany({ email: user.email });

              let redirectPath;

              if (process.env.NODE_ENV == "production") {
                  redirectPath = VERIFIED_ACCOUNT_REDIRECT_URL;//`${req.protocol}://${req.get("host")}/account/verified`;
              } else {
                  redirectPath = `http://127.0.0.1:3005/api/account/verified`;
              }
              console.log("redirectPath: "+redirectPath);
              res.redirect(redirectPath);
          }
      } catch (err) {
          console.log(
              "Error on /api/user/verification/verify-account: ",
              err
          );
          res.sendStatus(500);
      }
  }
);

// #route:  GET /verification/get-activation-email
// #desc:   Send activation email to registered users email address
// #access: Private
router.get("/verification/get-activation-email",verify,
  async (req, res) => {
      const baseUrl = req.protocol + "://" + req.get("host");

      try {
          const user = await User.findById(req.userId);

          if (!user) {
              res.json({ success: false });
          } else {
              await Code.deleteMany({ email: user.email });

              const secretCode = cryptoRandomString({
                  length: 6,
              });

              const newCode = new Code({
                  code: secretCode,
                  email: user.email,
              });
              await newCode.save();

              const baseUrl = req.protocol + "://" + req.get("host");
              const data = {
                  from: `${APP_NAME} <${EMAIL_USERNAME}>`,
                  to: user.email,
                  subject: "Your Activation Link for Account",
                  text: `Welcome! Thank you for signing up, please use the following link within the next 10 minutes to activate your account: ${baseUrl}/api/user/verification/verify-account/${user._id}/${secretCode}`,
                  html: `<p>Please use the following link within the next 10 minutes to activate your account: <strong><a href="${baseUrl}/api/user/verification/verify-account/${user._id}/${secretCode}" target="_blank">Activate NOW!</a></strong></p>`,
              };
              
              await emailService.sendMail(data);

              res.json({ success: true });
          }
      } catch (err) {
          console.log("Error on /api/user/get-activation-email: ", err);
          res.json({ success: false });
      }
  }
);

// #route:  POST /password-reset/get-code
// #desc:   Reset password of user
// #access: Public
router.post("/password-reset/get-code", async (req, res) => {
  const { email } = req.body;
  let errors = [];

  if (!email) {      
      return res.status(400).send({code:STATUS_CODE_FAILED,msg:"Please provide your registered email address!"});      
  } else {
      try {
          const user = await User.findOne({ email: email });

          if (!user) {              
              return res.status(400).send({code:STATUS_CODE_FAILED,msg:"The provided email address is not registered!"});      
          } else {
              const secretCode = cryptoRandomString({
                  length: 6,
              });
              const newCode = new Code({
                  code: secretCode,
                  email: email,
              });
              await newCode.save();

              const baseUrl = req.protocol + "://" + req.get("host");
              const data = {
                  from: `${APP_NAME} <${EMAIL_USERNAME}>`,
                  to: user.email,
                  subject: "Your Password Reset Code",
                  text: `Please use the following code within the next 10 minutes to reset your password: ${secretCode}`,
                  html: `<p>Please use the following code within the next 10 minutes to reset your password: <strong>${secretCode}</strong></p>`,
              };

              await emailService.sendMail(data);

              return res.status(200).send({code:STATUS_CODE_SUCCESS,
                                           email:user.email,
                                           msg:"Code has been sent to your email!"
                                          });
          }
      } catch (err) {          
          return res.status(400).send({code:STATUS_CODE_FAILED,msg:"Oh, something went wrong. Please try again!"});
      }
  }
});

// #route:  POST /password-reset/verify
// #desc:   Verify and save new password of user
// #access: Public
router.post("/password-reset/verify", async (req, res) => {
  const { email, newPassword, confirmPassword, secretCode } = req.body;
  let errors = [];

  if (!email || !newPassword || !confirmPassword || !secretCode) {      
    return res.status(400).send({code:STATUS_CODE_FAILED,msg:"Please fill in all fields!"});
  }
  if (newPassword != confirmPassword) {      
    return res.status(400).send({code:STATUS_CODE_FAILED,msg:"The entered passwords do not match!"});
  }
  if (
      !newPassword.match(
          /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{6,}$/
      )
  ) {
    return res.status(400).send({code:STATUS_CODE_FAILED,msg:"Your password must be at least 6 characters long and contain a lowercase letter, an uppercase letter, a numeric digit and a special character."});      
  }
  
  try {
      const response = await Code.findOne({ email, code:secretCode });
      console.log("Response: "+response);
      if (!response) {              
          return res.status(400).send({code:STATUS_CODE_FAILED,msg:"The entered code is not correct. Please make sure to enter the code in the requested time interval."});      
      } else {          
          // Hash passwords
          const salt = await bcrypt.genSalt(10);          
          const newHashedPw = await bcrypt.hash(newPassword, salt);
          await User.updateOne({ email }, { password: newHashedPw });
          await Code.deleteOne({ email, code:secretCode });

          const data = {
              from: `${APP_NAME} <${EMAIL_USERNAME}>`,
              to: email,
              subject: "Password Reset",
              text: `Your Password Has been Successfully Reset`,
              html: `<p>Your Password Has been Successfully Reset</p>`,
          };

          await emailService.sendMail(data);

          return res.status(200).send({code:STATUS_CODE_SUCCESS,mg:"Reset Password Success!"});
      }
  } catch (err) {
    return res.status(400).send({code:STATUS_CODE_FAILED,msg:"Oh, something went wrong. Please try again!"+err});
  }  
});

// #route:  POST /googlelogin
// #desc:   Authenticate User by Google Login
// #access: Public
router.post("/googlelogin", async (req, res) => {
  const {tokenId} = req.body;
  if(!tokenId){
    return res.status(400).send({code:STATUS_CODE_FAILED,msg:"ID Token is missing!"});
  }

  client.verifyIdToken({idToken: tokenId, audience: "833865276502-psc9rbvs5gva6qogpnm8fqf3sdq2smdf.apps.googleusercontent.com"})
  .then(response => {
    const {email_verified, name, email} = response.payload;
    console.log(response.payload);

    if(email_verified){
      User.findOne({email}).exec(async (err, user) => {
        if(err){          
          return res.status(400).send({code:STATUS_CODE_FAILED,msg:"Oh, something went wrong. Please try again!"});
        }else{
          if(user){
            //   Create and assign a token
            const token = jwt.sign({ _id: user._id }, JWT_SECRET, {expiresIn: 3600});
            // res.header("auth-token", token).send(token);
            res.status(200).json({
              code: STATUS_CODE_SUCCESS,
              token: token,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                authType: 'google'        
              }
            });
          }else{
            const user = new User({
              name: name,
              email: email,
              password: email+process.env.JWT_SECRET,
              allowExtraEmails: true,
              accepted: true,
              activated: true,
              authType: 'google'
            });
          
            try {
              const savedUser = await user.save();
              if (!savedUser) throw Error('Something went wrong saving the user');

              const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, {
                expiresIn: 3600
              });              

              return res.status(200).json({
                code: STATUS_CODE_SUCCESS,
                token: token,
                user: {
                  id: savedUser.id,
                  name: savedUser.name,
                  email: savedUser.email,
                  allowExtraEmails: savedUser.allowExtraEmails,
                  isActivated: savedUser.allowExtraEmails,
                  authType: 'google'
                }
              });
            }catch(e){
              console.log("Google Login e:"+e);
              return res.status(400).send({code:STATUS_CODE_FAILED,msg:e});
            }
          }
        }
      });
    }
  }).catch((e)=>{
    console.log("Google Error:"+e);
    return res.status(400).send({code:STATUS_CODE_FAILED,msg:e});
  });
});

// #route:  POST /deactivate-account
// #desc:   Logout a user and deactivate account
// #access: Public
router.post("/deactivate-account", verify, async (req,res) => {
  const { userId,password } = req.body;

  if (!password) {
      res.json({ success: false, error: "Please provide your password." });
  } else {
      try {
          const user = await User.findById(userId);
          // const user = await User.findById(req.params.userId);          
          // console.log("id"+user);
          if (!user) {              
              return res.status(400).json({
                code:STATUS_CODE_FAILED,
                msg:"User does not exists!"
              });
          } else {              
              // Password is Correct
              const pwCheckSuccess = await bcrypt.compare(password, user.password);
              
              if (!pwCheckSuccess) return res.status(400).json({code:STATUS_CODE_FAILED,msg:"Invalid Credentials"});

              if (!pwCheckSuccess) {
                  return res.status(400).json({
                    code:STATUS_CODE_FAILED,
                    msg:"The provided password is not correct."
                  });                  
              } else {
                  // const now = new Date().toLocaleDateString();
                  const deactivated = await User.updateOne({ email:user.email }, { isDeactivated: true});
                  
                  if (!deactivated) {                      
                      return res.status(400).json({
                        code:STATUS_CODE_FAILED,
                        msg:"Oh, something went wrong. Please try again!"
                      });
                  } else {
                      // Send Mail
                      const baseUrl = req.protocol + "://" + req.get("host");
                      const data = {
                          from: `${APP_NAME} <${EMAIL_USERNAME}>`,
                          to: user.email,
                          subject: "Account Deactivation",
                          text: `Your Account has been successfully deactivated`,
                          html: `<p>Your Account has been successfully deactivated!`, //<strong><a href="${baseUrl}/api/user/reactivate-account/${user._id}/${secretCode}" target="_blank">Reactivate NOW!</a></strong></p>`,
                      };
                      
                      await emailService.sendMail(data);

                      return res.status(200).json({
                        code:STATUS_CODE_SUCCESS,
                        msg:"Your Account is Successfully Deactivated!"
                      });
                  }
              }
          }
      } catch (err) {
          return res.status(400).json({
            code:STATUS_CODE_FAILED,
            msg:"Oh, something went wrong. Please try again!"
          });
      }
  }
});

module.exports = router;
