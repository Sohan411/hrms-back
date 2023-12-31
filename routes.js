const express = require('express');
const router = express.Router();
const authentication = require('./Authentication/authentication');
const sa = require('./SuperAdmin/SuperAdmin');
const dashboard = require('./dash/dashboard');


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
router.put('/updateLeaveApproval/:leaveId',sa.UpdateLeaveApproval);
router.get('/pendingLeaveInfo',sa.getPendingLeaveInfo);
router.get('/approvedLeaveInfo',sa.getAprovedLeaveInfo);
router.get('/rejectedLeaveInfo',sa.getRejectedLeaveInfo);
router.get('/getLeaveInfo/:leaveID', sa.getLeaveInfo);
router.get('/getLeaveByDate', sa.getLeaveInfoByDate);
router.get('/getLeaveByUserID/:userId', sa.getLeaveByUserId);
router.post('/acceptAttendence', sa.acceptAttendence);
router.post('/assignTask',sa.assignTask);
router.get('/getTaskSheet',sa.getTaskSheet);
router.get('/getInternDetails', sa.getInternDetails);
router.get('/getSupervisorDetails', sa.getSupervisorDetails);
router.get('/getEmployeesByProject', sa.getEmpolyeesByProject);
router.get('/getProjects', sa.getProjectName);
router.get('/getCompletedProjects', sa.getCompletedProject);
router.put('/editTask/taskId', sa.editTask);
router.delete('/deleteTask/:taskId', sa.deleteTask);
router.delete('/deleteDivision/:divisionId', sa.deleteDivision);
router.get('/getDesignation',sa.getDesignation);
router.post('/createDivison', sa.createDivision);
router.put('/updateDivison',sa.updateDivision);
router.get('/getDivision',sa.getDivision);
router.put('/editUser/:userId', sa.editUser);
router.delete('/deleteEmployee/:UserId', sa.deleteEmployee);
router.get('/getAttendenceDetails', sa.getAttendenceDetails);
router.get('/getUserDetailsByUserId/:userId', sa.getUserDetailsByUserId);



//Dashboard
router.post('/leave', dashboard.internLeave);
router.post('/inTime', dashboard.inTime);
router.post('/outTime', dashboard.outTime);
router.post('/internInfo/:userId', dashboard.internInfo);
router.post('/getTasksheetByUserId', dashboard.getTaskSheetByUserId);
router.get('/getInternInfo/:userId',dashboard.getInternInfo);

module.exports = router;