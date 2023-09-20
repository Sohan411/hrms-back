const express = require('express');
const router = express.Router();
const authentication = require('./auth/authentication');
const limitter = require('express-rate-limit');


const registerLimitter = limitter({
    windowMS : 5*60*1000,
    max: 2,
})

// Registration route
router.post('/register',registerLimitter, authentication.register);

const loginLimit = limitter({
    windowMS : 1*60*1000,
    max: 5,
})
// Login route
router.post('/login', loginLimit,authentication.login);
router.post('/register-dashboard', authentication.register_dashboard);
router.get('/user', authentication.getUserDetails);
router.post('/verify', authentication.verifyToken);
router.post('/re-verify-mail', authentication.resendToken);
router.post('/forgot', authentication.forgotPassword);
router.post('/resend-forgot', authentication.resendResetToken);
router.post('/reset-password', authentication.resetPassword);

module.exports = router;