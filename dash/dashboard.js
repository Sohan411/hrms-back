const db = require('../db');

function internLeave(req, res) {
  const {
    userID,
    firstName,
    lastName,
    companyEmail,
    reasonForLeave,
    startDate,
    endDate,
    supervisorName,
    typeOfLeave,
    pendingTaskDetails,
    discussWithSupervisor,
    comments,
    isApproved,
    emergencyContact,
    totalLeaveDays,
  } = req.body;

  try {
    const checkUserId = `SELECT * FROM hrms_users WHERE UserId = ?`;
    const insertQuery = `INSERT INTO intern_leave (UserId, FirstName, LastName, CompanyEmail, ReasonForLeave, StartDate, EndDate, SupervisorName, TypeOfLeave, PendingTaskDetails, DiscussWithSupervisor, Comments, IsApproved, EmergencyContact, TotalLeaveDays) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(checkUserId, [userID], (error, result) => {
      if (error) {
        return res.status(500).json({ message: "Error while fetching userID" });
      }

      db.query(
        insertQuery,
        [
          userID,
          firstName,
          lastName,
          companyEmail,
          reasonForLeave,
          startDate,
          endDate,
          supervisorName,
          typeOfLeave,
          pendingTaskDetails,
          discussWithSupervisor,
          comments,
          'pending',
          emergencyContact,
          totalLeaveDays,
        ],
        (insertError, result) => {
          if (insertError) {
            console.log(insertError);
            return res.status(401).json({ message: "Error while inserting" });
          }

          return res.status(200).json({ message: "Leave posted" });
        }
      );
    });
  } catch (error) {
    //console.error('Error in device check:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function inTime(req, res) {
  const userId = req.body.userId;
  const currentDate = new Date();
  const formattedTime = currentDate.toLocaleTimeString('en-US', { hour12: false });
  const formattedInTime = formattedTime;

  const fetchUserId = 'SELECT * FROM hrms_users WHERE UserId = ?';
  const checkAttendanceQuery = 'SELECT * FROM intern_attendence WHERE UserId = ? AND Date = ?';
  const insertAttendanceQuery = 'INSERT INTO intern_attendence(UserId, InTime, Date, Attendence) VALUES (?, ?, ?, 1)';

  db.query(fetchUserId, [userId], (userIdError, userResult) => {
    if (userIdError) {
      console.error(userIdError);
      return res.status(401).json({ message: 'Internal server error while fetching user' });
    }

    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const formattedDate = currentDate.toISOString().split('T')[0];
    db.query(checkAttendanceQuery, [userId, formattedDate], (checkError, checkResult) => {
      if (checkError) {
        console.error(checkError);
        return res.status(500).json({ message: 'Internal server error while checking attendance' });
      }

      if (checkResult.length > 0) {
        return res.status(400).json({ message: 'Attendance already marked for today' });
      }

      db.query(insertAttendanceQuery, [userId, formattedInTime, formattedDate], (insertError, insertResult) => {
        if (insertError) {
          console.error(insertError);
          return res.status(500).json({ message: 'Internal server error while inserting attendance' });
        }
        return res.status(200).json({ message: 'Attendance marked' });
      });
    });
  });
}



function outTime(req, res) {
  const userId = req.body.userId;
  const currentDate = new Date();
  const formattedTime = currentDate.toLocaleTimeString('en-US', { hour12: false });
  const formattedOutTime = formattedTime;

  const fetchUserId = 'SELECT * FROM hrms_users WHERE UserId = ?';
  const checkAttendanceQuery = 'SELECT * FROM intern_attendence WHERE UserId = ? AND Date = ?';
  const updateAttendanceQuery = 'UPDATE intern_attendence SET OutTime = ?, TotalHours = ? WHERE UserId = ? AND Date = ?';

  // Check if the user exists in the hrms_users table
  db.query(fetchUserId, [userId], (userIdError, userResult) => {
    if (userIdError) {
      console.error(userIdError);
      return res.status(401).json({ message: 'Internal server error while fetching user' });
    }

    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if attendance has already been marked for the user on the current date
    const formattedDate = currentDate.toISOString().split('T')[0];
    db.query(checkAttendanceQuery, [userId, formattedDate], (checkError, checkResult) => {
      if (checkError) {
        console.error(checkError);
        return res.status(500).json({ message: 'Internal server error while checking attendance' });
      }

      if (checkResult.length === 0) {
        return res.status(400).json({ message: 'InTime not marked for today. Please mark InTime first.' });
      }

      if (checkResult[0].OutTime) {
        return res.status(400).json({ message: 'OutTime already marked for today' });
      }
      const formattedInTime = checkResult[0].InTime;
      const inDateTime = new Date(`1970-01-01T${formattedInTime}`);
      const outDateTime = new Date(`1970-01-01T${formattedOutTime}`);
      const timeDifference = (outDateTime - inDateTime) / (1000 * 60);
      const totalHours = `${Math.floor(timeDifference / 60)}:${timeDifference % 60}`;

      db.query(updateAttendanceQuery, [formattedOutTime, totalHours, userId, formattedDate], (updateError, updateResult) => {
        if (updateError) {
          console.error(updateError);
          return res.status(500).json({ message: 'Internal server error while updating attendance' });
        }
        return res.status(200).json({ message: 'OutTime marked and TotalHours updated' });
      });
    });
  });
}

function internInfo(req, res) {
  const userId = req.params.userId
  const {
    contact,
    firstName,
    lastName,
    collegeName,
    collegeId,
    employeeId,
    addressLane1,
    addressLane2,
    postcode,
    state,
    emailId,
    education,
    country,
  } = req.body;

  // Check if the userid is already registered
  const userIdCheckQuery = 'SELECT * FROM hrms_users WHERE UserId = ?';
  db.query(userIdCheckQuery, [userId], (error, userIdCheckResult) => {
    if (error) {
      console.error('Error during username check:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
    try {
      // Insert the user into the database
      const insertQuery =
        'INSERT INTO intern_info(UserId, FirstName, LastName, ContactNo, CollegeName, CollegeId, Education, EmployeeId, EmailIdAddressLane1, AddressLane2, PostalCode, State, Country) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      db.query(
        insertQuery,
        [
          userId,
          firstName,
          lastName,
          contact,
          collegeName,
          collegeId,
          education,
          employeeId,
          emailId,
          addressLane1,
          addressLane2,
          postcode,
          state,
          country,
        ],
        (error, insertResult) => {
          if(error){
            console.error('Error during user insertion:', error);
            return res.status(401).json({ message: 'Error inserting data' });
          }
          return res.status(200).json({message : 'Information Updated Successfully'})
        }
      );
    }catch(error) {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

function getTaskSheetByUserId(req, res) {
  const userId = req.params.userId;
  const checkUserIdQuery = `SELECT * FROM hrms_users`;
  const tashSheetQuery = 'SELECT * FROM intern_tasksheet';

  db.query( checkUserIdQuery, [userId], (checkError, checkResult) => {
    if(checkError){
      return res.status(401).json({ message : 'error checking userID' });
    }
    if(checkResult.length === 0){
      return res.status(404).json({message : 'No User Found'});
    }
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
  });
}

function getInternInfo(req, res) {
  const userId = req.params.userId;
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().split('T')[0];

  const fetchInternInfoQuery = 'SELECT * FROM intern_attendence WHERE UserId = ? AND Date = ?';

  db.query(fetchInternInfoQuery, [userId, formattedDate], (queryError, queryResult) => {
    if (queryError) {
      console.error(queryError);
      return res.status(500).json({ message: 'Internal server error while fetching intern information' });
    }

    if (queryResult.length === 0) {
      return res.status(200).json({ message: 'Intern absent for today' });
    }
    const internInfo = {
      userId: queryResult[0].UserId,
      inTime: queryResult[0].InTime,
      outTime: queryResult[0].OutTime,
      totalHours: queryResult[0].TotalHours,
      attendance: queryResult[0].Attendence,
      date: queryResult[0].Date,
    };

    return res.status(200).json({ message: 'Intern information for today', internInfo });
  });
}

module.exports = {
  internLeave,
  inTime,
  outTime,
  internInfo,
  getTaskSheetByUserId,
  getInternInfo
}