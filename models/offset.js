const mongoose = require("mongoose");

// Define schema and model for offset storage
const offsetSchema = new mongoose.Schema({
    channelId: String,
    offsetId: { type: Number, default: 0 },
});

const Offset = mongoose.model("Offset", offsetSchema);

module.exports = Offset;
