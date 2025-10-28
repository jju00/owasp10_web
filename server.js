// server.js
require('dotenv').config();
const app = require('./backend/app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`up on ${PORT}`));