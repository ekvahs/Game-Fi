const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  flow: {
    type: String,
    enum: ['reserve', 'list', 'take', 'trade', 'collect', 'ledger'],
    required: true,
  },
  kind: { type: String, required: true },
  amountHub: { type: Number, default: 0 },
  refId: { type: String, default: '' },
  note: { type: String, default: '' },
  created: { type: Date, default: Date.now },
});

module.exports = mongoose.models.transaction || mongoose.model('transaction', TransactionSchema);
