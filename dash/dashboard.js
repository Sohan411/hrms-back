const db = require('../db');

function internLeave(req , res){

  const {
    userID,
    firstName,
    lastName,
    companyEmail,
    reasonForLeave,
    startAndEndDate = new Date().toISOString,
    supervisorName,
    typeOfLeave,
    pendingTaskDetails,
    discussWithSupervisor,
    comments,
    isAproved,
  } = req.body

  try{
    const checkUserId = `SELECT * FROM hrms_users where UserId = ?`;
    const insertQuery = `Insert INTO intern_leave_info (UserId, FirstName, LastName, CompanyEmail, ReasonForLeave, StartAndEndDate, SupervisorName, TypeOfLeave, PendingTaskDetails, DiscussWithSupervisor, Comments, IsAproved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(checkUserId , [userID], (error , result ) => {
      if(error){
        return res.status(500).json({message : "error while fetching userID"});
      }

      db.query(insertQuery ,[
        userID, 
        firstName,
        lastName,
        companyEmail,
        reasonForLeave,
        startAndEndDate,
        supervisorName,
        typeOfLeave,
        pendingTaskDetails,
        discussWithSupervisor,
        comments,
        'pending'], (inserterror , result) =>{
          if(inserterror){
            console.log(inserterror)
            return res.status(401).json({message : "error while inserting"})
          }

          return res.status(200).json({message : "Leave posted"})
        })
    })
  }
  catch(error){
    console.error('Error in device check:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  internLeave,
}