const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EndangeredSpeciesSchema = new Schema({
    name:{type:String,required:true},
    image:{type:String,required:true},
    animal_id: { type: Schema.Types.ObjectId, ref: 'Animal'},
    bird_id: { type: Schema.Types.ObjectId, ref: 'Bird' },
});

module.exports = mongoose.model('EndangeredSpecies', EndangeredSpeciesSchema);