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

function add_User(req, res) {
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
  add_User,
  userdetails,
};