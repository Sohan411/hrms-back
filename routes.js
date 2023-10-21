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
router.get('/pendingLeaveInfo',sa.getPendingLeaveInfo);
router.get('/approvedLeaveInfo',sa.getAprovedLeaveInfo);
router.get('/rejectedLeaveInfo',sa.getRejectedLeaveInfo);
router.get('/getLeaveInfo/:leaveID', sa.getLeaveInfo);
router.get('/getLeaveByDate', sa.getLeaveInfoByDate);
router.get('/getLeaveByUserID/:userId', sa.getLeaveByUserId);
router.post('/acceptAttendence/:userId', sa.acceptAttendence);
router.post('/taskUpdate',sa.taskUpdate);
router.get('/getTaskSheet',sa.getTaskSheet);
router.get('/getInternDetails', sa.getInternDetails);
router.get('/getSupervisorDetails', sa.getSupervisorDetails);
router.get('/getEmployeesByProject', sa.getEmpolyeesByProject);
router.get('/getOnGoingProjects', sa.getOnGoingProjects);

//Dashboard
router.post('/leave', dashboard.internLeave);
router.post('/attendence/:userId', dashboard.attendance);
router.put('/updateOutTime/:userId', dashboard.updateOutTime);
router.post('/internInfo/:userId', dashboard.internInfo);

module.exports = router;