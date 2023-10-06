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
    console.error('Error in device check:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}



module.exports = {
  internLeave,
}