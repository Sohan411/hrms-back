const bcrypt = require('bcrypt');
const db = require('../db');
const jwtUtils = require('../token/jwtUtils');
const CircularJSON = require('circular-json');
const secure = require('../token/secure');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { v4: uuidv4 } = require('uuid');
const { Console } = require('console');

function logExecution(functionName, tenantId, status, message) {
  const createdTime = new Date().toISOString(); 
  const entity_type = 'SenseLive';
  const entity_id = tenantId; 
  const transport = 'ENABLED'; 
  const db_storage = 'ENABLED'; 
  const re_exec = 'ENABLED'; 
  const js_exec = 'ENABLED';
  const email_exec = 'ENABLED';
  const sms_exec = 'ENABLED'; 
  const alarm_exec = 'ENABLED';

  const query = `
    INSERT INTO hrms_api_usage (created_time, tenant_id, entity_type, entity_id, transport, db_storage, re_exec, js_exec, email_exec, sms_exec, alarm_exec, status, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

  db.query(query, [
    createdTime,
    tenantId,
    entity_type,
    entity_id,
    transport,
    db_storage,
    re_exec,
    js_exec,
    email_exec,
    sms_exec,
    alarm_exec,
    status,
    message,
  ], (error, results) => {
    if (error) {
      console.error(`Error logging execution of function '${functionName}':`, error);
    } else {
      console.log(`Function '${functionName}' executed and logged successfully.`);
    }
  });
}

function addUser(req, res) {
  const {
    contact,
    firstName,
    lastName,
    companyEmail,
    designation,
    password,
    dateOfBirth,
    totalWorkingDays,
    supervisor
  } = req.body;

  // Check if the username (company email) is already registered
  const companyEmailCheckQuery = 'SELECT * FROM hrms_users WHERE CompanyEmail = ?';
  db.query(companyEmailCheckQuery, [companyEmail], (error, companyEmailCheckResult) => {
    if (error) {
      console.error('Error during username check:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    try {
      if (companyEmailCheckResult.length > 0) {
        console.log('Username already exists');
        return res.status(400).json({ message: 'User already exists' });
      }

      // Generate a unique 10-digit user ID
      const userId = generateUserId();

      // Hash the password
      bcrypt.hash(password, 10, (error, hashedPassword) => {
        if (error) {
          console.error('Error during password hashing:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }

        try {
          // Generate a verification token
          const verificationToken = jwtUtils.generateToken({ companyEmail: companyEmail });

          // Insert the user into the database
          const insertQuery =
            'INSERT INTO hrms_users (UserId, Username, FirstName, LastName, ContactNo, CompanyEmail, Password, Designation, VerificationToken, Verified, DOB, TotalWorkingDays, Supervisor) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
          db.query(
            insertQuery,
            [
              userId,
              companyEmail,
              firstName,
              lastName,
              contact,
              companyEmail,
              hashedPassword,
              designation,
              verificationToken,
              '1',
              dateOfBirth,
              totalWorkingDays,
              supervisor
            ],
            (error, insertResult) => {
              if (error) {
                console.error('Error during user insertion:', error);
                return res.status(500).json({ message: 'Internal server error' });
              }

              try {
                // Send the verification token to the user's email
                sendTokenDashboardEmail(companyEmail, verificationToken);

                console.log('User registered successfully');
                res.json({ message: 'Registration successful. Check your email for the verification token.' });
              } catch (error) {
                console.error('Error sending verification token:', error);
                res.status(500).json({ message: 'Internal server error' });
              }
            }
          );
        } catch (error) {
          console.error('Error during registration:', error);
          res.status(500).json({ message: 'Internal server error' });
        }
      });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

function userdetails(req, res) {
  const userQuery = 'SELECT UserId, Username, FirstName, LastName, ContactNo , Designation, CompanyEmail, DOB, TotalWorkingDays, Supervisor FROM hrms_users';

  db.query(userQuery, (error, userResult) => {
    if (error) {
      console.error('Error fetching user details:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (userResult.length === 0) {
      console.log('users not found!');
      return res.status(404).json({ message: 'users not found!' });
    }

    const users = userResult;
    res.json({ userDetails: users });
  });
}


function UpdateLeaveApproval(req, res) {
  const { UserId } = req.params;
  const { action } = req.body;

  const approvalId = uuidv4();

  logExecution('UpdateLeaveApproval', approvalId, 'INFO', `Leave ${action} process started for UserId: ${UserId}`);

  if (action !== 'approve' && action !== 'reject') {
    logExecution('UpdateLeaveApproval', approvalId, 'ERROR', 'Invalid action. Use "approve" or "reject".');
    return res.status(400).json({ message: 'Invalid action. Use "approve" or "reject".' });
  }
  const updateQuery = 'UPDATE intern_leave_info SET IsAproved = ? WHERE UserId = ?';
  const approvalValue = action === 'approve' ? 'approve' : 'reject';

  db.query(updateQuery, [approvalValue, UserId], (updateError, updateResult) => {
    if (updateError) {
      console.error(`Error during leave ${action}ing:`, updateError);
      logExecution('UpdateLeaveApproval', approvalId, 'ERROR', `Error ${action}ing leave`);
      return res.status(500).json({ message: `Error ${action}ing leave` });
    }
    if (updateResult.affectedRows === 0) {
      logExecution('UpdateLeaveApproval', approvalId, 'ERROR', 'User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    const successMessage = `Leave ${action}ed successfully`;
    logExecution('UpdateLeaveApproval', approvalId, 'SUCCESS', successMessage);
    res.status(200).json({ message: successMessage });
  });
}

function getAttendenceDetails(req, res) {
  const userQuery = 'SELECT * FROM hrms_users intern_attendence';

  try{
    db.query(userQuery, (error, userResult) => {
      if (error) {
        console.error('Error fetching user details:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (userResult.length === 0) {
        console.log('users not found!');
        return res.status(404).json({ message: 'users not found!' });
      }

      const attendence = userResult;
      res.json({ getAttendenceDetails: attendence});
    });
  }catch(error){
    res.status(500).json({message : 'Internal Server Error'});
  }
}

function getPendingLeaveInfo(req, res){

  const leaveInfoQuery = `SELECT * FROM intern_leave WHERE IsApproved = 'pending' ORDER BY LeaveID DESC`;

  try{
    db.query(leaveInfoQuery, (error ,result) => {
        if(error){
          console.log(error);
          return res.status(401).json({message : 'error in retriving data'});
        }
        if(result.length === 0 ){
          return res.status(404).json({message : 'No leave found'});
        }
        
        const leaveInfo = result;
        res.json({ getLeaveInfo : leaveInfo })
      });
  }catch(error){
    return res.status(500).json({message : 'Internal Server Error'});
  }
}

function getAprovedLeaveInfo(req, res){
  
  const leaveInfoQuery = `SELECT * FROM intern_leave WHERE IsApproved = 'approved' ORDER BY LeaveID DESC`;

  try{
    db.query(leaveInfoQuery, (error ,result) => {
        if(error){
          console.log(error);
          return res.status(401).json({message : 'error in retriving data'});
        }
        if(result.length === 0 ){
          return res.status(404).json({message : 'No leave found'});
        }
        
        const leaveInfo = result;
        res.json({ getLeaveInfo : leaveInfo })
      });
  }catch(error){
    return res.status(500).json({message : 'Internal Server Error'});
  }
}

function getRejectedLeaveInfo(req, res){
  
  const leaveInfoQuery = `SELECT * FROM intern_leave WHERE IsApproved = 'rejected' ORDER BY LeaveID DESC`;

  try{
    db.query(leaveInfoQuery, (error ,result) => {
        if(error){
          console.log(error);
          return res.status(401).json({message : 'error in retriving data'});
        }
        if(result.length === 0 ){
          return res.status(404).json({message : 'No leave found'});
        }
        
        const leaveInfo = result;
        res.json({ getLeaveInfo : leaveInfo });
      });
  }catch(error){
    return res.status(500).json({message : 'Internal Server Error'});
  }
}

function getLeaveInfo(req, res){
  const leaveID = req.params.leaveID;

  const fetchLeaveInfoQuery = `Select * FROM intern_leave WHERE LeaveID = ?`;

  try{
    db.query(fetchLeaveInfoQuery, [leaveID], (getError, getResult)=>{
      if(getError){
        return res.status(401).json({message : 'Error in fetching data'});
      }
      if(getResult.length === 0){
        return res.status(404).json({message : 'No Leaves Found'});
      }

      const fetchedResult = getResult;
      res.json({ getLeaveInfo : fetchedResult });
    });
  }catch(error){
    res.status(500).json({message : 'Internal Server error'});
  }
}

function getLeaveInfoByDate(req, res){
  const { currentDate = new Date() } = req.body;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();

  const formattedDate = `${year}-${month}-${day}`;

  const employeeOnLeaveQuery = `SELECT * FROM intern_leave WHERE StartDate = ?`;

  db.query(employeeOnLeaveQuery, [formattedDate], (errorfetching, result) => {
    if(errorfetching){
      console.log(errorfetching);
      return res.status(401).json({ message : 'error fetching data' });
    }
    if(result.length === 0){
      return res.status(404).json({message : 'No Leaves Found'});
    }
    res.json({getLeaveInfoByDate : result});
  });
}

function getLeaveByUserId(req , res){
  const {userId} = req.params.userId;

  const fetchLeaveQuery = `SELECT * FROM intern_leave WHERE UserId = ?`;

  db.query(fetchLeaveQuery, [userId], (fetchingError, fetchingResult)=>{
    if(fetchingError){
      return res.status(401).json({message : 'error fetching data'});
    }
    if(fetchingResult.length === 0){
      return res.status(404).json({message : 'No Leaves Found'});
    }
    res.json({ getLeaveByUserId : fetchingResult });
  });
}

function acceptAttendence(req, res){
  const { userId } = req.params.userId;
  const userIdCheckQuery = `Select * FROM hrms_users WHERE UserId = ?`
  const accpetQuery = `INSERT INTO intern_attendence(Attendence) VALUES(?)`;

  db.query(userIdCheckQuery, [userId],(error, checkResult) =>{
    if(error){
      return res.status(401).json({ message : 'Error Checking UserId' });
    }
    if(checkResult.length === 0){
      return res.status(404).json({ message : 'User Not Found' });
    }
    db.query(accpetQuery, ['1', userId], (error, result) => {
      if(error){
        return res.status(401).json({ message : 'Error Marking Attendence'});
      }
      return res.status(200).json({ message : 'Attendence Marked Successfully' });
    });
  }); 
}

function taskUpdate(req, res){
  const userId = req.params
  const {employeeName,
  employeeId,
  projectTitle,
  deadLine,
  remarks,
  status,
  startDate,
  endDate,
  priority
} = req.body;

  const fetchUserIdQuery = `SELECT * FROM hrms_users WHERE UserId = ?`;
  const insertQuery = `INSERT INTO intern_tasksheet(UserId, EmployeeName, EmployeeId, ProjectTitle, Deadline, Remarks, Status,DateRange,Priority) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`;


  db.query(fetchUserIdQuery,[userId], (fetchError, fetchResult) => {
    if(fetchError){
      return res.status(401).json({message : 'Error Fetching UserID'});
    }
    if(fetchResult.lentgth === 0){
      return res.status(404).json({message : 'User Not Found'});
    } 
    db.query(insertQuery, [userId,
      employeeName,
      employeeId,
      projectTitle,
      deadLine,
      remarks,
      status,
      startDate,
      endDate,
      priority], (error, result)=>{
        if(error){
          return res.status(401).json({message : 'Error Inserting data'});
        }
        return res.status(200).json({messgae : 'Task Updated Successfully'})
      });
    });
}

function getTaskSheet(req, res) {
  const tashSheetQuery = 'SELECT * FROM intern_tasksheet';

  try{
    db.query(tashSheetQuery, (error, takSheets) => {
      if (error) {
        console.error('Error fetching TaskSheet details:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      res.json({ getTaskSheet: takSheets});
    });
  }catch(error){
    res.status(500).json({message : 'Internal Server Error'});
  }
}

// Helper function to generate a unique 10-digit user ID
function generateUserId() {
  const userIdLength = 10;
  let userId = '';

  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  for (let i = 0; i < userIdLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    userId += characters.charAt(randomIndex);
  }
  return userId;
}

function sendTokenDashboardEmail(email, token) {
  const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'kpohekar19@gmail.com',
    pass: 'woptjevenzhqmrpp',
  },
});

  // Read the email template file
  const templatePath = path.join(__dirname, '../mail-body/email-template.ejs');
  fs.readFile(templatePath, 'utf8', (err, templateData) => {
    if (err) {
      console.error('Error reading email template:', err);
      return;
    }

    // Compile the email template with EJS
    const compiledTemplate = ejs.compile(templateData);

    // Render the template with the token
    const html = compiledTemplate({ token });

    const mailOptions = {
      from: 'your-email@example.com',
      to: email,
      subject: 'Registration Token',
      html: html,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  });
}

module.exports = {
  logExecution,
  addUser,
  userdetails,
  UpdateLeaveApproval,
  getAttendenceDetails,
  getLeaveInfo,
  getPendingLeaveInfo,
  getAprovedLeaveInfo,
  getRejectedLeaveInfo,
  getLeaveInfoByDate,
  getLeaveByUserId,
  acceptAttendence,
  taskUpdate,
  getTaskSheet,

};