const db = require ('./db')

// Function to calculate the number of weekdays between two dates
function countWeekdays(startDate, endDate) {
  let dayCounter = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0) { // Exclude Sundays (Sunday = 0)
      dayCounter++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dayCounter;
}

// Function to update DaysRemaining column for interns
async function updateDaysRemaining() {

  try {
    const currentDate = new Date();
    const query = 'SELECT UserId, JoiningDate, DaysRemaining, LeaveDates FROM hrms_users';
    const [rows] = await db.query(query);

    for (const row of rows) {
      const leaveDates = row.LeaveDates ? row.LeaveDates.split(',').map(date => new Date(date.trim())) : [];
      const workingDays = countWeekdays(row.JoiningDate, currentDate);

      // Exclude leave days
      for (const leaveDate of leaveDates) {
        if (leaveDate >= row.JoiningDate && leaveDate <= currentDate) {
          workingDays--;
        }
      }

      // Update the DaysRemaining column
      const daysRemaining = Math.max(workingDays - row.DaysRemaining, 0);
      await db.execute('UPDATE hrms_users SET DaysRemaining = ? WHERE UserId = ?', [daysRemaining, row.id]);
    }

    console.log('DaysRemaining updated successfully.');
  } catch (error) {
    console.error('Error updating DaysRemaining:', error);
  }
}

updateDaysRemaining();

// Call the function to update DaysRemaining
module.exports = { 
    updateDaysRemaining 
}
