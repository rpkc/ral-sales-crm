require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('./server');

let mongoServer;

async function startServer() {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
  console.log('Connected to in-memory MongoDB');

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
}

startServer();
