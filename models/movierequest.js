const mongoose = require('mongoose');

const movieRequestSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    movieName: {
        type: String,
        required: true
    }
}, { timestamps: true });

const MovieRequest = mongoose.model('MovieRequest', movieRequestSchema);

module.exports = MovieRequest;