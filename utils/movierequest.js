const MovieRequest = require("../models/movierequest");

// Function to create and save a new movie request
const createMovieRequest = async (username, movieName) => {
    const movieRequest = new MovieRequest({ username, movieName });
    try {
        await movieRequest.save();
        console.log("Movie request saved successfully");
    } catch (error) {
        console.error("Error saving movie request:", error);
    }
};

module.exports = createMovieRequest;