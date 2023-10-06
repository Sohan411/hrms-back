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
const { logExecution } = require('../SuperAdmin/SuperAdmin');

encryptKey = "SenseLive-Hrms-Dashboard";

// Function to send an email with the token
function sendTokenEmail(email, token, firstName, lastName) {
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

    // Render the template with the token and recipient's name
    const html = compiledTemplate({token, firstName, lastName});

    const mailOptions = {
      from: 'your-email@example.com', // Replace with the sender's email address
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

function sendResetTokenEmail(companyEmail, resetToken) {
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
  const templatePath = path.join(__dirname, '../mail-body/email-template-forgot-password.ejs');
  fs.readFile(templatePath, 'utf8', (err, templateData) => {
    if (err) {
      console.error('Error reading email template:', err);
      return;
    }

    // Compile the email template with EJS
    const compiledTemplate = ejs.compile(templateData);

    // Render the template with the token
    const html = compiledTemplate({ resetToken });

    const mailOptions = {
      from: 'kpohekar19@gmail.com',
      to: companyEmail,
      subject: 'Reset Password Link',
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

function register(req, res) {
  const {
    contact,
    firstName,
    lastName,
    companyEmail,
    designation,
    password,
    dateOfBirth
  } = req.body;

  // Combine firstName and lastName to create the user's name
  const name = `${firstName} ${lastName}`;

  // Check if the company email is already registered
  const emailCheckQuery = 'SELECT * FROM hrms_users WHERE CompanyEmail = ?';
  db.query(emailCheckQuery, [companyEmail], (error, emailCheckResult) => {
    if (error) {
      console.error('Error during email check:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    try {
      if (emailCheckResult.length > 0) {
        console.log('Company email already exists');
        return res.status(400).json({ message: 'Company email already exists' });
      }

      // Check if the username (company email) is already registered
      const companyEmailCheckQuery = 'SELECT * FROM hrms_users WHERE Username = ?'; // Assuming 'Username' is the column storing companyEmail
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
                'INSERT INTO hrms_users (UserId, Username, FirstName, LastName, ContactNo, Password, Designation, VerificationToken, Verified,CompanyEmail,DOB) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
              db.query(
                insertQuery,
                [
                  userId,
                  companyEmail,
                  firstName,
                  lastName,
                  contact,
                  hashedPassword,
                  designation,
                  verificationToken,
                  '0',
                  companyEmail,
                  dateOfBirth
                ],
                (error, insertResult) => {
                  if (error) {
                    console.error('Error during user insertion:', error);
                    return res.status(500).json({ message: 'Internal server error' });
                  }

                  try {
                    // Send the verification token to the user's email
                    sendTokenEmail(companyEmail, verificationToken, firstName, lastName);

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
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}



function register_dashboard(req, res) {
  const {
    contact,
    firstName,
    lastName,
    companyEmail,
    designation,
    password,
    dateOfBirth
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
            'INSERT INTO hrms_users (UserId, Username, FirstName, LastName, ContactNo, CompanyEmail, Password, Designation, VerificationToken, Verified, DOB) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
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
              '0',
              dateOfBirth
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


// Function to handle token verification
function verifyToken(req, res) {
  const { token } = req.body;

  // Check if the token matches the one stored in the database
  const tokenCheckQuery = 'SELECT * FROM hrms_users WHERE VerificationToken = ?';
  db.query(tokenCheckQuery, [token], (error, tokenCheckResult) => {
    if (error) {
      console.error('Error during token verification:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    try {
      if (tokenCheckResult.length === 0) {
        console.log('Token verification failed');
        return res.status(400).json({ message: 'Token verification failed' });
      }

      // Token matches, update the user's status as verified
      const updateQuery = 'UPDATE hrms_users SET Verified = ? WHERE VerificationToken = ?';
      db.query(updateQuery, [true, token], (error, updateResult) => {
        if (error) {
          console.error('Error updating user verification status:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }

        console.log('Token verification successful');
        res.json({ message: 'Token verification successful. You can now log in.' });
      });
    } catch (error) {
      console.error('Error during token verification:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

// Function to resend the verification token

function resendToken(req, res) {
  const { companyEmail } = req.body;

  // Check if the user is available
  const checkUserQuery = 'SELECT * FROM hrms_users WHERE CompanyEmail = ?';
  db.query(checkUserQuery, [Email], (error, userResult) => {
    if (error) {
      console.error('Error checking user availability:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If no user found, send an error response
    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is already verified, send a bad request error response
    if (userResult[0].Verified === '1') {
      return res.status(400).json({ message: 'User already verified' });
    } else {
      // Generate a new verification token
      const verificationToken = jwtUtils.generateToken({ companyEmail: companyEmail });

      // Update the user's verification token in the database
      const updateQuery = 'UPDATE hrms_users SET VerificationToken = ? WHERE CompanyEmail = ?';
      db.query(updateQuery, [verificationToken, companyEmail], (error, updateResult) => {
        if (error) {
          console.error('Error updating verification token:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }

        try {
          // Send the new verification token to the user's email
          sendTokenEmail(companyEmail, verificationToken);

          console.log('Verification token resent');
          res.json({ message: 'Verification token resent. Check your email for the new token.' });
        } catch (error) {
          console.error('Error sending verification token:', error);
          res.status(500).json({ message: 'Internal server error' });
        }
      });
    }
  });
}

function login(req, res) {
  const { Username, Password } = req.body;

  // Generate a UUID for tenant_id
  const tenantId = uuidv4();

  // Log the start of the function execution
  ('login', tenantId, 'INFO', 'User login attempt');

  // Check if the user exists in the database
  const query = 'SELECT * FROM hrms_users WHERE Username = ?';
  db.query(query, [Username], (error, rows) => {
    try {
      if (error) {
        console.error('Error during login:', error);
        // Log the error
        logExecution('login', tenantId, 'ERROR', 'Error during login');
        throw new Error('Error during login');
      }

      if (rows.length === 0) {
        // Log the end of the function execution with an error message
        logExecution('login', tenantId, 'ERROR', 'User does not exist');
        return res.status(401).json({ message: 'User does not exist!' });
      }

      const user = rows[0];

      if (user.verified === 0) {
        // Log the end of the function execution with an error message
        logExecution('login', tenantId, 'ERROR', 'User is not verified');
        return res.status(401).json({ message: 'User is not verified. Please verify your account.' });
      }

      // Compare the provided password with the hashed password in the database
      bcrypt.compare(Password, user.Password, (error, isPasswordValid) => {
        try {
          if (error) {
            console.error('Error during password comparison:', error);
            // Log the error
            logExecution('login', tenantId, 'ERROR', 'Error during password comparison');
            throw new Error('Error during password comparison');
          }

          if (!isPasswordValid) {
            // Log the end of the function execution with an error message
            logExecution('login', tenantId, 'ERROR', 'Invalid credentials');
            return res.status(401).json({ message: 'Invalid credentials' });
          }

          // Generate a JWT token
          const token = jwtUtils.generateToken({ Username: user.Username });

          // Log the end of the function execution with a success message
          logExecution('login', tenantId, 'INFO', 'User login successful');
          res.json({ token });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Internal server error' });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

// User details endpoint
function getUserDetails(req, res) {
  const token = req.headers.authorization.split(' ')[1]; // Extract the token from the Authorization header

  // Verify the token
  const decodedToken = jwtUtils.verifyToken(token);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Fetch user details from the database using the decoded token information
  const query = 'SELECT * FROM hrms_users WHERE Username = ?';
  db.query(query, [decodedToken.Username], (error, rows) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    res.json(user);
  });
}




// Forgot password
function forgotPassword(req, res) {
  const { companyEmail } = req.body;

  // Check if the email exists in the database
  const query = 'SELECT * FROM hrms_users WHERE CompanyEmail = ?';
  db.query(query, [companyEmail], (error, rows) => {
    try {
      if (error) {
        throw new Error('Error during forgot password');
      }

      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate a reset token
      const resetToken = jwtUtils.generateToken({ companyEmail: companyEmail });

      // Save the reset token in the database
      const userId = rows[0].UserId;
      const insertQuery = 'INSERT INTO hrms_reset_tokens (UserId, token) VALUES (?, ?)';
      db.query(insertQuery, [userId, resetToken], (error, insertResult) => {
        try {
          if (error) {
            throw new Error('Error saving reset token');
          }

          // Send the reset token to the user's email
          sendResetTokenEmail(companyEmail, resetToken);

          res.json({ message: 'Reset token sent to your email' });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Internal server error' });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

function resendResetToken(req, res) {
  const { companyEmail } = req.body;

  // Check if the user is available
  const checkUserQuery = 'SELECT * FROM hrms_users WHERE CompanyEmail = ?';
  db.query(checkUserQuery, [companyEmail], (error, userResult) => {
    if (error) {
      console.error('Error checking user availability:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If no user found, send an error response
    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new verification token
    const userId = userResult[0].UserId;
    const verificationToken = jwtUtils.generateToken({ companyEmail: compamyEmail });

    // Update the user's verification token in the database
    const updateQuery = 'UPDATE hrms_reset_tokens SET token = ? WHERE UserId = ?';
    db.query(updateQuery, [verificationToken, userId], (error, updateResult) => {
      if (error) {
        console.error('Error updating Resend link:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      try {
        // Send the new verification token to the user's email
        sendResetTokenEmail(companyEmail, verificationToken);

        console.log('Resend link resent');
        res.json({ message: 'Resend link resent. Check your email for the new token.' });
      } catch (error) {
        console.error('Error sending verification token:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });
  });
}

function resetPassword(req, res) {
  const { token, password } = req.body;

  // Check if the email and reset token match in the database
  const query = 'SELECT * FROM hrms_reset_tokens WHERE token = ?';
  db.query(query, [token], (error, rows) => {
    try {
      if (error) {
        throw new Error('Error during reset password');
      }

      if (rows.length === 0) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      const userId = rows[0].UserId;

      // Hash the new password
      bcrypt.hash(password, 10, (error, hashedPassword) => {
        try {
          if (error) {
            throw new Error('Error during password hashing');
          }

          // Update the password in the database
          const updateQuery = 'UPDATE hrms_users SET Password = ? WHERE UserId = ?';
          db.query(updateQuery, [hashedPassword, userId], (error, updateResult) => {
            try {
              if (error) {
                throw new Error('Error updating password');
              }

              // Delete the reset token from the reset_tokens table
              const deleteQuery = 'DELETE FROM hrms_reset_tokens WHERE token = ?';
              db.query(deleteQuery, [token], (error, deleteResult) => {
                if (error) {
                  console.error('Error deleting reset token:', error);
                }

                res.json({ message: 'Password reset successful' });
              });
            } catch (error) {
              console.error(error);
              res.status(500).json({ message: 'Internal server error' });
            }
          });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Internal server error' });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

function Block(req, res) {
  const { UserId } = req.params;
  const { action } = req.body;
  
  if (action !== 'block' && action !== 'unblock') {
    return res.status(400).json({ message: 'Invalid action. Use "block" or "unblock".' });
  }

  const blockValue = action === 'block' ? 1 : 0;

  // Check if the user is already blocked or unblocked
  const checkQuery = 'SELECT block FROM hrms_users WHERE UserId = ?';

  db.query(checkQuery, [UserId], (checkError, checkResult) => {
    if (checkError) {
      console.error(`Error checking user block status:`, checkError);
      return res.status(500).json({ message: 'Error checking user block status' });
    }

    if (checkResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentBlockStatus = checkResult[0].block;

    if (currentBlockStatus === blockValue) {
      const statusMessage = blockValue === 1 ? 'already blocked' : 'already unblocked';
      return res.status(200).json({ message: `User is ${statusMessage}` });
    }

    // User is not in the desired block state; update the block status
    const updateQuery = 'UPDATE hrms_users SET block = ? WHERE UserId = ?';

    db.query(updateQuery, [blockValue, UserId], (updateError, updateResult) => {
      if (updateError) {
        console.error(`Error during user ${action}ing:`, updateError);
        return res.status(500).json({ message: `Error ${action}ing user` });
      }

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const successMessage = `User ${action}ed successfully`;
      res.status(200).json({ message: successMessage });
    });
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



module.exports = {
  register,
  register_dashboard,
  sendTokenEmail,
  sendTokenDashboardEmail,
  sendResetTokenEmail,
  verifyToken,
  resendToken,
  login,
  getUserDetails,
  forgotPassword,
  resendResetToken,
  resetPassword,
  Block,

};
