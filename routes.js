const express = require('express');
const router = express.Router();
const authentication = require('./Authentication/authentication');


// Registration route
router.post('/register', authentication.register);
// Login route
router.post('/login',authentication.login);
router.post('/register-dashboard', authentication.register_dashboard);
router.get('/user', authentication.getUserDetails);
router.post('/verify', authentication.verifyToken);
router.post('/re-verify-mail', authentication.resendToken);
router.post('/forgot', authentication.forgotPassword);
router.post('/resend-forgot', authentication.resendResetToken);
router.post('/reset-password', authentication.resetPassword);
router.put('/setUserOnline/:UserId', authentication.setUserOnline);
router.put('/setUserOffline/:UserId', authentication.setUserOffline);
router.put('/users/:UserId/block', authentication.Block);

module.exports = router;