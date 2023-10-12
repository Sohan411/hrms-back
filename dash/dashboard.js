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

function attendance(req, res) {
  const  userId = req.params.userId;
  const { currentDate = new Date() } = req.body;

  const fetchUserId = `SELECT * FROM hrms_users WHERE UserId = ?`;
  const insertAttendanceQuery = `INSERT INTO intern_attendence(UserId, Date, inTime) VALUES (?, ?, ?)`;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();

  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();

  const formattedDate = `${year}-${month}-${day}`;
  const formattedInTime = `${formattedDate} ${hours}:${minutes}:${seconds}`;

  // Check if the user exists in the hrms_users table
  db.query(fetchUserId, [userId], (userIdError, userResult) => {
    if (userIdError) {
      console.error(userIdError);
      return res.status(500).json({ message: 'Internal server error while fetching user' });
    }

    if (userResult.length === 0) {
      // console.log(userResult);
      return res.status(404).json({ message: 'User not found' });
    }

    // If the user exists, insert attendance record
    db.query(insertAttendanceQuery, [userId, formattedDate, formattedInTime], (insertError, insertResult) => {
      if (insertError) {
        console.error(insertError);
        return res.status(500).json({ message: 'Internal server error while inserting attendance' });
      }

      return res.status(200).json({ message: 'Attendance marked'});
    });
  });
}

function updateOutTime (req, res){
  const userId = req.params.userId;
  const inTime = req.params.inTime;
  const {currentDate = new Date()} = req.body;


  const timeDifferenceMs = currentDate - inTime;

  const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);

  const fetchUserId = `SELECT * FROM hrms_users WHERE UserId = ?`;
  const updateOutTime = `UPDATE intern_attendence SET OutTime = ? WHERE UserId = ?`;
  const fetchInTime = `Select InTime from intern_attendence WHERE UserId = ?`;
  const updateTotalHours = `UPDATE intern_attendence SET TotalHours = ? WHERE UserId = ?`;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();

  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();


  const formattedDate = `${year}-${month}-${day}`;
  const formattedOutTime = `${formattedDate} ${hours}:${minutes}:${seconds}`;

  console.log(timeDifferenceHours);

  db.query(fetchUserId, [userId], (error, fetchResult) => {
    if(error){
      return res.status(401).json({message : 'error while checking userid'});
    }

    if (fetchResult.length === 0) {
      console.log(fetchResult);
      return res.status(404).json({ message: 'User not found' });
    }

    db.query(updateOutTime , [formattedOutTime, userId] ,(err, updateResult) => {
      if(err){
        console.log(err);
        return res.status(401).json({message : 'error while updating'})
      }

      //return res.status(200).json({message : 'Out Time Marked Successfully'});
      db.query(fetchInTime, [inTime, userId],( fetchInTimeerror, InTimeresult) => {
        if(fetchInTimeerror){
          console.log(fetchInTimeerror)
          return res.status(401).json({message : 'error while fetching In Time'})
        }

        db.query(updateTotalHours, [timeDifferenceHours, userId], (updateTotalHourserror, result) => {
          if(updateTotalHourserror){
            console.log(updateTotalHourserror);
            return res.status(401).json({message : 'Error while updating total hours'});
          }
          return res.status(200).json({message : 'OutTime and Total Hours Updated Successfully'});
        });

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

  const address = addressLane1 + addressLane2 ;

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
            'INSERT INTO intern_info(UserId, FirstName, LastName, ContactNo, CollegeName, CollegeId, Education, EmployeeId, EmailId, AddressLane1, AddressLane2, PostalCode, State, Country) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
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



module.exports = {
  internLeave,
  attendance,
  updateOutTime,
  internInfo,
}