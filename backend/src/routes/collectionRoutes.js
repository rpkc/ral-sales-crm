const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');

router.get('/', collectionController.getCollections);
router.get('/:id', collectionController.getCollectionById);
router.post('/', collectionController.createCollection);
router.put('/:id/verify', collectionController.verifyCollection);

module.exports = router;
