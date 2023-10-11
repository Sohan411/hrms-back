const express = require('express');
const router = express.Router();
const authentication = require('./Authentication/authentication');
const sa = require('./SuperAdmin/SuperAdmin');
const dashboard = require('./Dash/dashboard');


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
router.put('/users/:UserId/block', authentication.Block);

//SuperAdmin
router.post('/addUser', sa.addUser);
router.get('/getUserDetails', sa.userdetails);
router.put('/usersLeave/:UserId', sa.UpdateLeaveApproval);
router.get('/leaveInfo', sa.getLeaveInfo);
router.get('/pendingLeaveInfo',sa.getPendingLeaveInfo);
router.get('/approvedLeaveInfo',sa.getAprovedLeaveInfo);
router.get('/rejectedLeaveInfo',sa.getRejectedLeaveInfo);

//Dashboard
router.post('/leave', dashboard.internLeave);
router.post('/attendence/:userId', dashboard.attendance);
router.put('/updateOutTime/:userId', dashboard.updateOutTime);

module.exports = router;