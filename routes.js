const express = require('express');
const router = express.Router();
const authentication = require('./Authentication/authentication');
const limitter = require('express-rate-limit');


// Registration route
//router.post('/register',registerLimitter, authentication.register);

// Login route
router.post('/login',authentication.login);
router.post('/register-dashboard', authentication.register);
// router.get('/user', authentication.getUserDetails);
// router.post('/verify', authentication.verifyToken);
// router.post('/re-verify-mail', authentication.resendToken);
// router.post('/forgot', authentication.forgotPassword);
// router.post('/resend-forgot', authentication.resendResetToken);
// router.post('/reset-password', authentication.resetPassword);

module.exports = router;