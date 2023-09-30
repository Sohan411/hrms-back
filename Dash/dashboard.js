const bcrypt = require('bcrypt');
const db = require('../db');
const jwtUtils = require('../token/jwtUtils');
const CircularJSON = require('circular-json');
const secure = require('../token/secure');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

function getDataByCustomDate(req, res) {
  try {
    const userId = req.params.userId;
    const startDate = req.query.start;
    const endDate = req.query.end;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    const sql = `SELECT * FROM hrms_leave_data WHERE UserId = ? AND  >= ? AND TimeStamp <= ?`;
    db.query(sql, [deviceId, startDate + 'T00:00:00.000Z', endDate + 'T23:59:59.999Z'], (error, results) => {
      if (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      res.json({ data: results });
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function getDataByCustomDateStatus(req, res) {
  try {
    const deviceId = req.params.deviceId;
    const startDate = req.query.start;
    const endDate = req.query.end;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    const sql = `SELECT Status, COUNT(*) as count FROM tms_trigger_logs WHERE DeviceUID = ? AND TimeStamp >= ? AND TimeStamp <= ? GROUP BY Status`;
    db.query(sql, [deviceId, startDate + 'T00:00:00.000Z', endDate + 'T23:59:59.999Z'], (error, results) => {
      if (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Calculate total count
      const totalCount = results.reduce((total, entry) => total + entry.count, 0);

      // Calculate percentage for each status
      const dataWithPercentage = results.map((entry) => ({
        status: entry.Status,
        count: entry.count,
        percentage: (entry.count / totalCount) * 100
      }));

      res.json({ dataStatus: dataWithPercentage });
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


function getDeviceDetails(req, res) {
  try {
    const deviceId = req.params.deviceId;

    // Validate the deviceId parameter if necessary

    const deviceDetailsQuery = 'SELECT * FROM tms_devices WHERE DeviceUID = ?';
    db.query(deviceDetailsQuery, [deviceId], (error, deviceDetail) => {
      if (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (deviceDetail.length === 0) {
        // Handle the case when no device details are found
        return res.status(404).json({ message: 'Device details not found' });
      }

      res.status(200).json(deviceDetail);
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


function getLiveStatusDetails(req, res) {
  try {
    const deviceId = req.params.deviceId;

    // Validate the deviceId parameter if necessary

    const liveStatusQuery = 'SELECT * FROM tms_trigger_logs WHERE DeviceUID = ? ORDER BY TimeStamp DESC LIMIT 1';
    db.query(liveStatusQuery, [deviceId], (error, liveStatus) => {
      if (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (liveStatus.length === 0) {
        // Handle the case when no live status details are found
        return res.status(404).json({ message: 'Live status details not found' });
      }

      res.status(200).json(liveStatus);
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function getUserData(req, res) {
  try {
    const userId = req.params.userId;

    // Validate the deviceId parameter if necessary

    const userDetailsQuery = 'SELECT * FROM tms_users WHERE UserId = ?';
    db.query(userDetailsQuery, [userId], (error, userDetail) => {
      if (error) {
        console.error('Error fetching User:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (userDetail.length === 0) {
        // Handle the case when no device details are found
        return res.status(404).json({ message: 'User details not found' });
      }

      res.status(200).json(userDetail);
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


function insertNewMessage(req, res) {
  try {
    const { sender, receiver, message } = req.body;
    const timestamp = new Date().toISOString();
    const isRead = 0; // Assuming the initial value for isRead is 0 (false)

    const insertQuery = 'INSERT INTO tms_notifications (sender, receiver, message, timestamp, isRead) VALUES (?, ?, ?, ?, ?)';
    db.query(insertQuery, [sender, receiver, message, timestamp, isRead], (error, result) => {
      if (error) {
        console.error('Error inserting new message:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      const insertedMessage = {
        sender,
        receiver,
        message,
        timestamp,
        isRead
      };

      res.status(201).json({message : 'Message Send SuccessFully'});
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


function markMessageAsRead(req, res) {
  try {
    const messageId = req.params.messageId;

    const updateQuery = 'UPDATE tms_notifications SET isRead = 1 WHERE msgid = ?';
    db.query(updateQuery, [messageId], (error, result) => {
      if (error) {
        console.error('Error updating message status:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Message not found' });
      }

      res.status(200).json({ message: 'Message marked as read' });
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


function deleteMessage(req, res) {
  try {
    const messageId = req.params.messageId;

    const deleteQuery = 'DELETE FROM tms_notifications WHERE msgid = ?';
    db.query(deleteQuery, [messageId], (error, result) => {
      if (error) {
        console.error('Error deleting message:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Message not found' });
      }

      res.status(200).json({ message: 'Message deleted' });
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


function countUnreadMessages(req, res) {
  try {
    const receiver = req.params.receiver;

    const countQuery = 'SELECT COUNT(*) AS unreadCount FROM tms_notifications WHERE receiver = ? AND isRead = 0';
    db.query(countQuery, [receiver], (error, result) => {
      if (error) {
        console.error('Error counting unread messages:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      const unreadCount = result[0].unreadCount;

      res.status(200).json({ unreadCount });
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function getUserMessages(req, res) {
  try {
    const receiver = req.params.receiver;

    const messagesQuery = 'SELECT * FROM tms_notifications WHERE receiver = ? ORDER BY timestamp desc';
    db.query(messagesQuery, [receiver], (error, messages) => {
      if (error) {
        console.error('Error fetching user messages:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      res.status(200).json(messages);
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function fetchCompanyUser(req, res) {
  const CompanyEmail = req.params.CompanyEmail;
  try {
    const query = 'SELECT * FROM tms_users where CompanyEmail = ?';
    db.query(query, [CompanyEmail], (error, users) => {
      if (error) {
        throw new Error('Error fetching users');
      }

      res.status(200).json(users);
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


function addDeviceTrigger(req, res) {
  const { DeviceUID, TriggerValue, CompanyEmail } = req.body;
    try {
        const insertTriggerQuery = 'INSERT INTO tms_trigger (DeviceUID, TriggerValue, CompanyEmail) VALUES (?,?,?)';

        db.query(insertTriggerQuery, [DeviceUID, TriggerValue, CompanyEmail], (error, insertResult) => {
          if (error) {
            console.error('Error while inserting device:', error);
            return res.status(500).json({ message: 'Internal server error' });
          }

          return res.json({ message: 'Device Trigger added successfully!' });
        });

    } catch (error) {
      console.error('Error in device check:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
}

function addDevice(req, res) {
  const { DeviceUID, DeviceLocation, DeviceName, CompanyEmail, CompanyName } = req.body;
  try {
    const checkDeviceQuery = 'SELECT * FROM tms_devices WHERE DeviceUID = ?';
    const insertDeviceQuery = 'INSERT INTO tms_devices (DeviceUID, DeviceLocation, DeviceName, CompanyEmail, CompanyName) VALUES (?,?,?,?,?)';

    db.query(checkDeviceQuery, [DeviceUID], (error, checkResult) => {
      if (error) {
        console.error('Error while checking device:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (checkResult.length > 0) {
        return res.status(400).json({ message: 'Device already added' });
      }

      db.query(insertDeviceQuery, [DeviceUID, DeviceLocation, DeviceName, CompanyEmail, CompanyName], (insertError, insertResult) => {
        if (insertError) {
          console.error('Error while inserting device:', insertError);
          return res.status(500).json({ message: 'Internal server error' });
        }

        return res.json({ message: 'Device added successfully!' });
      });
    });
  } catch (error) {
    console.error('Error in device check:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function Manish_energy(req ,res){
  
  const jsonString = req.body; // Access the JSON data sent in the request
  // Process jsonData here as needed
  if(jsonString){
  // Send a response with the processed data
    res.status(200).json({ message: 'Data received and processed successfully', data: jsonString });
    console.log(jsonString);
  }else{
    res.status(404).json({
      message : "Data not found"
    });
  }
}


module.exports = {
  getDataByCustomDate,
  getDataByCustomDateStatus,
  getDeviceDetails,
  getLiveStatusDetails,
  getUserData,
  insertNewMessage,
  markMessageAsRead,
  deleteMessage,
  countUnreadMessages,
  getUserMessages,
  fetchCompanyUser,
  addDeviceTrigger,
  addDevice,
  Manish_energy
};

