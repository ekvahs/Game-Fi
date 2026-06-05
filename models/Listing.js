const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  lotId: { type: String, required: true },
  sellerId: { type: String, required: true },
  priceHub: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['open', 'filled', 'cancelled'], default: 'open' },
  created: { type: Date, default: Date.now },
});

module.exports = mongoose.models.listing || mongoose.model('listing', ListingSchema);
