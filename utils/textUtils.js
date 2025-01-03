// Import the Video model
const { Video } = require('../models/video'); // Adjust the path if necessary

// Function to store video data in MongoDB
const storeVideoData = async (fileId, caption, size) => {
    const video = new Video({
        fileId: fileId,
        caption: caption,
        size: size
    });
    await video.save();
    return video;
};

// Function to clean the caption by removing unwanted elements
const cleanCaption = (caption) => {
    // Remove links, special characters, stickers, emojis, extra spaces, and mentions except "@MovieCastAgainBot"
    return caption
        .replace(/(?:https?|ftp):\/\/[\n\S]+/g, "") // Remove URLs
        .replace(/[^\w\s@.]/g, "") // Remove special characters except "@" and "."
        .replace(/\./g, " ") // Replace dots with a single space
        .replace(/\s\s+/g, " ") // Replace multiple spaces with a single space
        .replace(/@[A-Za-z0-9_]+/g, "@MovieCastAgainBot") // Replace all mentions with "@MovieCastAgainBot"
        .trim();
};

// Export the functions
module.exports = {
    storeVideoData,
    cleanCaption
};