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

function getUserDetailsByUserId(req, res) {
  const userQuery = 'SELECT UserId, Username, FirstName, LastName, ContactNo , Designation, CompanyEmail, DOB, TotalWorkingDays, Supervisor FROM hrms_users WHERE UserId = ?';

  const userId = req.params.userId;

  db.query(userQuery, [userId],(error, userResult) => {
    if (error) {
      console.error('Error fetching user details:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (userResult.length === 0) {
      console.log('users not found!');
      return res.status(404).json({ message: 'users not found!' });
    }

    const users = userResult;
    res.json({ getUserDetailsByUserId : users });
  });
}

function deleteTask(req, res) {
  
  const taskId = req.params.taskId;
  const checkTaskSheetID =`SELECT * FROM intern_tasksheet WHERE TaskSheetID =?`
  const deleteQuery = 'DELETE FROM intern_tasksheet WHERE TaskSheetID = ?';
  try {
    db.query(checkTaskSheetID, [taskId], (checkError, checkResult)=>{
      if(checkError) {
        return res.status(401).json({message: 'error during checking task sheet id'})
      }
      if(checkResult.length === 0 ){
        return res.status(404).json({ message: 'no task found'})
      }
      db.query(deleteQuery, [taskId] ,(error, result) => {
        if (error) {
          return res.status(401).json({ message: 'error during deleting' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json({ message: 'Task deleted' });
      });
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
  
}

function UpdateLeaveApproval(req, res) {
  const  leaveId = req.params.leaveId;
  const isApproved = req.body;

  const updateLeaveQuery = `UPDATE intern_leave SET IsApproved = ? WHERE LeaveId = ?`;

  db.query(updateLeaveQuery, [isApproved, leaveId], (leaveUpdateError, leaveUpdateResult) => {
    if(leaveUpdateError){     
      console.log (leaveUpdateError)
      return res.status(401).json({message : 'error while updating leave approval'});
    }
    return res.status(200).json({messsage : 'Leave Aproved'});
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
  
  const leaveInfoQuery = `SELECT * FROM intern_leave WHERE IsApproved = 'Approved' ORDER BY LeaveID DESC`;

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
  
  const leaveInfoQuery = `SELECT * FROM intern_leave WHERE IsApproved = 'Declined' ORDER BY LeaveID DESC`;

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

function getLeaveInfoByDate(req, res) {
  const currentDate = new Date();
  const formattedCurrentDate = currentDate.toISOString().split('T')[0];

  const employeeOnLeaveQuery = `SELECT * FROM intern_leave WHERE STR_TO_DATE(StartDate, '%Y-%m-%d') <= ? AND STR_TO_DATE(EndDate, '%Y-%m-%d') >= ?`;

  db.query(employeeOnLeaveQuery, [formattedCurrentDate, formattedCurrentDate], (errorfetching, result) => {
    if (errorfetching) {
      console.log(errorfetching);
      return res.status(401).json({ message: 'Error fetching data' });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'No Leaves Found' });
    }
    res.json({ getLeaveInfoByDate: result });
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
  const userId = req.body.UserId;
  
    if (!userId) {
      return res.status(400).json({ success: false, message: 'UserId is required in the params' });
    }
  
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; 
  
    const checkEntryQuery = 'SELECT * FROM intern_attendence WHERE UserId = ? AND DATE(InTime) = ?';
    const updateQuery = 'UPDATE intern_attendence SET Attendence = 1 WHERE UserId = ? AND DATE(InTime) = ?';
  
    db.query(checkEntryQuery, [userId, formattedDate], (checkError, checkResult) => {
      if (checkError) {
        console.error('Error checking entry:', checkError);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
  
      if (checkResult.length === 0) {
        return res.status(404).json({ success: false, message: 'Intern not present today' });
      }

      db.query(updateQuery, [userId, formattedDate], (updateError, result) => {
        if (updateError) {
          console.error('Error updating attendance:', updateError);
          return res.status(500).json({ success: false, message: 'Internal server error' });
        }
  
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'No matching record found for the given UserId and InTime' });
        }
  
        return res.json({ success: true, message: 'Attendance updated successfully!' });
      });
    });
  }
  

function getProjectName(req,res){
  const fetchQuery = `SELECT * FROM project_details WHERE Status = 'OnGoing'`;

  db.query(fetchQuery, (error, fetchResult) => {
    if(error){
      return res.status(401).json({message : 'Error While Fetching Project Names'});
    }
    if(fetchResult.length === 0){
      return res.status(404).json({message : 'NO Projects Found'});
    }
    res.json({getProjectName : fetchResult});
  });
}

function getCompletedProject(req,res){
  const fetchQuery = `SELECT * FROM project_details WHERE Status = 'Completed'`;

  db.query(fetchQuery, (error, fetchResult) => {
    if(error){
      return res.status(401).json({message : 'Error While Fetching Project Names'});
    }
    if(fetchResult.length === 0){
      return res.status(404).json({message : 'NO Projects Found'});
    }
    res.json({getProjectName : fetchResult});
  });
}

function assignTask(req, res){
  
  const {
  employeeName,
  employeeEmail,
  supervisorEmail,
  status,
  remarks,
  startDate,
  endDate,
  priority,
  projectTitle,
  supervisorName,
} = req.body;

  const insertQuery = `INSERT INTO intern_tasksheet(EmployeeName, EmployeeEmail, SupervisorEmail, Status, Remark, StartDate, EndDate, Priority, ProjectTitle, SupervisorName) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(insertQuery, [
      employeeName,
      employeeEmail,
      supervisorEmail,
      status,
      remarks,
      startDate,
      endDate,
      priority,
      projectTitle,
      supervisorName,
    ], (error, result)=>{
        if(error){
          console.log(error);
          return res.status(401).json({message : 'Error Inserting data'});
        }
        return res.status(200).json({messgae : 'Task Updated Successfully'})
    });
}

function editTask(req, res){
  
  const taskId = req.params.tasksheetId
  const {
    employeeName,
    employeeEmail,
    supervisorEmail,
    status,
    remarks,
    startDate,
    endDate,
    priority,
    projectTitle,
    supervisorName,
  } = req.body; 

  const editTaskQuery = `UPDATE intern_tasksheet SET EmployeeName = ?, EmployeeEmail = ?, SupervisorEmail = ?, Status = ?, SupervisorEmail = ?, Priority = ?, StartDate = ?, EndDate = ?, Remark = ?, ProjectId = ?, SupervisorName = ?, ProjectTitle = ? WHRER TaskSheetID = ?`;

  db.query(editTaskQuery, [
    employeeName,
    employeeEmail,
    supervisorEmail,
    status,
    remarks,
    startDate,
    endDate,
    priority,
    projectTitle,
    supervisorName,
    taskId], (updateError, updateResult) =>{
      if(updateError){
        return res.status(401).json({message : 'Error Updating Task'});
      }
      return res.status(200).json({message : 'Updated Successfully'});
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

function getInternDetails(req, res){
  const internDetailsQuery = `SELECT * FROM hrms_users WHERE Designation = 'Intern'`;

  try{
    db.query(internDetailsQuery, (fetcherror, internDetailsResult) => {
      if(fetcherror){
        return res.status(401).json({message : 'Error While Fetching Intern Details'});
      }
      if(internDetailsResult.length === 0){
        return res.status(404).json({message : 'No intern Details Found'});
      }
      res.json({getInternDetails : internDetailsResult});
    });
  }catch(error){
    res.status(500).json({message : 'Internal Server Error'});
  }
}

function getSupervisorDetails(req, res){
  const internDetailsQuery = `SELECT * FROM hrms_users WHERE Designation = 'Manager'`;

  try{
    db.query(internDetailsQuery, (fetcherror, internDetailsResult) => {
      if(fetcherror){
        return res.status(401).json({message : 'Error While Fetching Intern Details'});
      }
      if(internDetailsResult.length === 0){
        return res.status(404).json({message : 'No intern Details Found'});
      }
      res.json({getSupervisiorDetails : internDetailsResult});
    });
  }catch(error){
    res.status(500).json({message : 'Internal Server Error'});
  }
}

function getEmpolyeesByProject(req, res){
  const { projectTitle } = req.body;
  const fetchEmployeeQuery = `SELECT * FROM intern_tasksheet WHERE ProjectTitle = ?`;

  try{
    db.query(fetchEmployeeQuery, [projectTitle], (fetchError, fetchResult) => {
      if(fetchError){
        return res.status(401).json({message : 'error while fetching employee list'});
      }
      res.json({getEmpolyeesByProject : fetchResult});
    } );
  }catch(error){
    res.status(500).json({message : 'Internal Server Error'});
  }
}

function createDivision(req, res){
  const {divisionName, createdBy} = req.body;

  const insertDivisionQury = `INSERT INTO employee_division (DivisionName, CreatedBy) Values (?, ?)`;

  db.query(insertDivisionQury,[divisionName, createdBy], (insertError, insertResult) =>{
    if(insertError){
      console.log(insertError);
      return res.status(401).json({message : 'Error Inserting Divison'});
    }
    return res.status(200).json({message : 'Division Name Entered Successfully'});
  });
}

function updateDivision(req,res){
  const {divisionName, createdBy} = req.body;
  const divisionId = req.params.divisionId

  const updateDivisonQuery = `UPDATE employee_division DivisionName = ?, CreatedBy = ? WHERE DivisionId = ?`;

  db.query(updateDivisonQuery ,[divisionName, createdBy, divisionId], (updateError, updateResult) =>{
    if(updateError){
      return res.status(401).json({message : 'Error Updating Division'});
    }
    return res.status(200).json({message : 'Division Updated Successfully'});
  });
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

// function totalhourscount (req,res) {
//   const  TotalHours = req.params.userId;
//   // const { currentDate = new Date() } = req.body;

//   const fetchTotalHours = `SELECT * FROM intern_attendence WHERE date = ? `;


//   db.query (fetchTotalHours, [TotalHours], (userIdError, userResult) => {
//     if (userIdError) {
//       console.error(userIdError);
//       return res.status(401).json({ message: 'Internal server error while fetching attendence' });
//     }

//     if (userResult.length === 0) {
//       return res.status(404).json({ message: 'attendence not found' });
//     }
// });
// }



function getDesignation (req,res) {
  const fetchdesignation = `SELECT Division, count(*) FROM hrms_users GROUP BY Division;`;

  db.query (fetchdesignation, (queryError, queryResult) => {
    if (queryError) {
      console.error(queryError);
      return res.status(401).json({ message: 'Internal server error while fetching designation' });
    }

    if (queryResult.length === 0) {
      return res.status(404).json({ message: 'designation not found' });
    }
    const designationData = queryResult.map((result) => ({
      label: result.Division,
      data: result.count,
    }));
    res.status(200).json({ designations: designationData });
});
}



function deleteDivision(req, res) {
  const divisionId = req.params.divisionId;
  const deleteQuery = 'DELETE FROM employee_division WHERE DivisionId =?';
  try {
      db.query(deleteQuery, [divisionId] ,(error, result) => {
        if (error) {
          return res.status(401).json({ message: 'error during deleting' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json({ message: 'Task deleted' });
      });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function getDivision(req,res){
  const fetchDivisionQuery = 'SELECT * FROM employee_division';
  try{
    db.query(fetchDivisionQuery,(divisionError,divisionResult)=>{
      if(divisionError){
        console.log(divisionError);
        return res.status(401).json({message: 'error while fetching'});
      }
      if(divisionResult.length===0){
        return res.status(404).json({message: 'division not found'});
      }
      res.json({getDivision:divisionResult});
    })

  }catch (error){
    res.status(500).json({message: 'internal server error'});
  }
}


function deleteEmployee(req, res) {
  const userId = req.params.UserId;
  const checkUserIdQuery = `SELECT * FROM hrms_users WHERE UserId = ?`;
  const deleteQuery = 'DELETE FROM hrms_users WHERE userId = ?';
  db.query(checkUserIdQuery, [userId], (error, checkResult) => {
    if (error) {
      return res.status(401).json({ message: 'Error during checking user id' });
    }
    if (checkResult.length === 0) {
      return res.status(404).json({ message: 'No user found' });
    }
    try {
      db.query(deleteQuery, [userId], (deleteError, deleteResult) => {
        if (deleteError) {
          return res.status(401).json({ message: 'Error during deleting' });
        }
        res.status(200).json({ message: 'User deleted successfully!' });
      });
    } catch (error) {
      console.error('An error occurred:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}
function editUser(req, res){
  
  const userId = req.params.userId
  const {
    userName,
    firstName,
    lastName,
    password,
    companyEmail,
    contactNo,
    designation,
    userType, 
    dob,
    totalWorkingDays,
    supervisor,
    division,
  } = req.body; 

  const editUserQuery = `UPDATE hrms_users SET Username = ?, FirstName = ?, LastName = ?, Password = ?, ContactNo = ?, Designation = ?, DOB = ?, TotalWorkingDays = ?, Supervisor = ?, Verified = ?, block = ?, Division = ? WHERE UserId = ?`;

  bcrypt.hash(password, 10, (hashError, hashedPassword) => {
    db.query(editUserQuery, [
      userName,
      firstName,
      lastName,
      hashedPassword,
      companyEmail,
      contactNo,
      designation,
      userType,  
      dob,
      totalWorkingDays,
      supervisor,
      joiningDate,
      verified,
      block,
      verificationToken,
      division, 
      userId ], (updateError, updateResult) =>{
        if(updateError){
          return res.status(401).json({message : 'Error Updating Task'});
        }
        return res.status(200).json({message : 'Updated Successfully'});
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
  assignTask,
  getTaskSheet,
  getInternDetails,
  getSupervisorDetails,
  getEmpolyeesByProject,
  getProjectName,
  getCompletedProject,
  editTask,
  deleteTask,
  createDivision,
  updateDivision,
  deleteEmployee,
  // totalhourscount,
  getDesignation,
  deleteDivision,
  getDivision,
  editUser,
  getUserDetailsByUserId,


};