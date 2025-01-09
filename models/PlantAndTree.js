const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlantAndTreeSchema = new Schema({
    name: { type: String, required: true },
    scientific_name: { type: String },
    type: { type: String },
    uses: { type: String },
    description: { type: String },
    image: { type: String ,default:""},
    national_park_id: [{ type: Schema.Types.ObjectId, ref: 'NationalPark' }],
  });
  
  module.exports = mongoose.model('PlantAndTree', PlantAndTreeSchema);