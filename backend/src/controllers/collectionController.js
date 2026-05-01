const Collection = require('../models/Collection');

exports.getCollections = async (req, res) => {
  try {
    const filters = {};
    if (req.query.collectedById) filters.collectedById = req.query.collectedById;
    if (req.query.status) filters.status = req.query.status;

    const collections = await Collection.find(filters).populate('collectedById', 'name role');
    res.json(collections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCollectionById = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id).populate('collectedById', 'name role');
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    res.json(collection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCollection = async (req, res) => {
  try {
    const newCollection = new Collection(req.body);
    const savedCollection = await newCollection.save();
    res.status(201).json(savedCollection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.verifyCollection = async (req, res) => {
  try {
    // Expected to be called by Admin or Accounts
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ message: 'Collection not found' });

    collection.status = req.body.status; // e.g., 'Verified', 'Mismatch'
    if (req.body.remarks) collection.remarks = req.body.remarks;

    await collection.save();
    res.json(collection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
