const mysql = require('mysql');
require('dotenv').config(); // Load environment variables from .env file

const connection = mysql.createPool({
  connectionLimit: 20, // Set the maximum number of connections in the pool
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  //port: process.env.DB_PORT,
  connectTimeout: 10000,
});

connection.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
    return;
  }
  console.log('Connected to database with ID:', connection.threadId);
});

module.exports = connection;