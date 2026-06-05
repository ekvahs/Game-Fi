const mongoose = require('mongoose');

const StakeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  pool: { type: String, default: 'Language Bond' },
  amountHub: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'collected', 'released'], default: 'active' },
  yieldHub: { type: Number, default: 0 },
  created: { type: Date, default: Date.now },
});

module.exports = mongoose.models.stake || mongoose.model('stake', StakeSchema);
