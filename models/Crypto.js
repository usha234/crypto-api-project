const mongoose = require('mongoose');

const cryptoSchema = new mongoose.Schema({
  coin: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  marketCap: { type: Number, required: true },
  change24h: { type: Number, required: true },
}, { timestamps: true });

const Crypto = mongoose.model('Crypto', cryptoSchema);

module.exports = Crypto;
