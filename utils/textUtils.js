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
    // Remove links and Telegram usernames, and clean up the caption
    return caption
        .replace(/(?:https?|ftp):\/\/[\n\S]+/g, "") // Remove URLs
        .replace(/@[A-Za-z0-9_]+/g, "") // Remove Telegram usernames
        .replace(/[^\w\s\[\]]/g, "") // Remove special characters except brackets
        .replace(/\[\]/g, "") // Remove empty brackets
        .replace(/\s\s+/g, " ") // Replace multiple spaces with a single space
        .trim();
};

// Export the functions
module.exports = {
    storeVideoData,
    cleanCaption
};