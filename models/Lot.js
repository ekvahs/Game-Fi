const mongoose = require('mongoose');

const LotSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  modelType: { type: String, default: 'Language' },
  ownerId: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'listed', 'taken', 'traded'], default: 'draft' },
  created: { type: Date, default: Date.now },
});

module.exports = mongoose.models.lot || mongoose.model('lot', LotSchema);
