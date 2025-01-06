const User = require("../models/user");

const saveUser = async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || "NoUsername";
    const name = ctx.from.first_name || ctx.from.last_name || "Anonymous";

    try {
        const existingUser = await User.findOne({ userId });
        if (existingUser) {
            existingUser.updatedAt = new Date();
            await existingUser.save();
        } else {
            const user = new User({ userId, username, name });
            await user.save();
        }
    } catch (error) {
        console.error('Error saving user data:', error);
    }
};

module.exports = saveUser;