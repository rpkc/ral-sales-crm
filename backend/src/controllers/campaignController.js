const Campaign = require('../models/Campaign');

exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const newCampaign = new Campaign(req.body);
    const savedCampaign = await newCampaign.save();
    res.status(201).json(savedCampaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const updatedCampaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCampaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(updatedCampaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
