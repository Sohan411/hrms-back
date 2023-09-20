const express = require('express');
const cors = require('cors');
const router = require('./routes');

const app = express();

const port = 3000;


app.use(cors());
app.use(express.json());

// Use the router for handling routes
app.use(router);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
