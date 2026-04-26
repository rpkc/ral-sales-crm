require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const collectionRoutes = require('./routes/collectionRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/collections', collectionRoutes);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
/*
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});
*/

// For now, just export the app
module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
