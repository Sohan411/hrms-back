function assignTask(req, res){
  
  const {
  employeeName,
  employeeEmail,
  supervisorEmail,
  status,
  remark,
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
      remark,
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