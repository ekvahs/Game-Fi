const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  listingId: { type: String, required: true },
  lotId: { type: String, required: true },
  buyerId: { type: String, required: true },
  sellerId: { type: String, required: true },
  flow: { type: String, enum: ['take', 'trade'], required: true },
  priceHub: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['open', 'settled', 'failed'], default: 'settled' },
  created: { type: Date, default: Date.now },
});

module.exports = mongoose.models.order || mongoose.model('order', OrderSchema);
