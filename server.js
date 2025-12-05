// server.js
require('dotenv').config();
const app = require('./backend/app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => console.log(`up on ${PORT} (localhost only)`));