const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NationalParkSchema = new Schema({
  name: { type: String, required: true },
  area: { type: Number },
  image: { type: String },
  description: { type: String },
  animal_ids: [{ type: Schema.Types.ObjectId, ref: 'Animal' }],
  bird_ids: [{ type: Schema.Types.ObjectId, ref: 'Bird' }],
  plant_ids: [{ type: Schema.Types.ObjectId, ref: 'PlantAndTree' }]
});
  
module.exports = mongoose.model('NationalPark', NationalParkSchema);