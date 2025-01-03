const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    fileId: { type: String, required: true, index: true },
    caption: { type: String, required: false, index: true },
    size: { type: Number }
});

const Video = mongoose.model('Video', videoSchema);

module.exports = { Video };
