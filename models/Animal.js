const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AnimalSchema = new Schema({
  name: { type: String, required: true },
  scientific_name: { type: String },
  category: { type: String },
  diet: { type: String },
  image: { type: String },
  endangered: { type: Boolean, default: false },
  extinct: { type: Boolean, default: false },
  description: { type: String },
  national_park_id: [{ type: Schema.Types.ObjectId, ref: 'NationalPark' }],
});

module.exports = mongoose.model('Animal', AnimalSchema);