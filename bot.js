const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');
const NodeCache = require('node-cache');
const { Video } = require('./models/video'); // Assuming you have a Video model
dotenv.config();
const cache = new NodeCache(); // Cache TTL set to 10 minutes
const userCache = new NodeCache({ stdTTL: 86400 });
const { bytesToMB, truncateText } = require('./utils/videoUtils');
const { deleteMessageAfter } = require('./utils/telegramUtils');
const { storeVideoData, cleanCaption } = require('./utils/textUtils');
// const scrap = require('./scraper/scrap');

const allowedUsers = ["knox7489", "vixcasm", "Knoxbros"];
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
// this 
// Function to generate inline keyboard buttons for a specific page
const generateButtons = (videos, page, totalPages) => {
    const maxButtonsPerPage = 8;
    const startIndex = (page - 1) * maxButtonsPerPage;
    const endIndex = Math.min(startIndex + maxButtonsPerPage, videos.length);

    const buttons = videos.slice(startIndex, endIndex).map(video => {
        const sizeMB = bytesToMB(video.size);
        const truncatedCaption = truncateText(video.caption, 30); // Truncate the caption to 30 characters
        const videoLink = `https://t.me/${process.env.BOT_USERNAME}?start=watch_${video._id}`;

        return [
            Markup.button.url(`${truncatedCaption} ${sizeMB != 'NaN MB' ? `📦 [${sizeMB}]` : ''}`, videoLink)
        ];
    });

    // Add navigation buttons with emojis for "Prev" and "Next"
    const navigationButtons = [];
    if (page > 1) {
        navigationButtons.push(Markup.button.callback('⬅️ Prev', `prev_${page}`)); // Use left arrow for "Prev"
    }
    if (page < totalPages) {
        navigationButtons.push(Markup.button.callback('Next ➡️', `next_${page}`)); // Use right arrow for "Next"
    }

    if (navigationButtons.length > 0) {
        buttons.push(navigationButtons);
    }

    return buttons;
};

// Handle /start command with specific video ID
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || "NoUsername";
    const name = ctx.from.first_name || ctx.from.last_name || "Anonymous";

    userCache.set(userId, { username, name });

    const message = ctx.update.message;
    const callbackQuery = ctx.update.callback_query;
    const callbackData = message ? message.text : callbackQuery.data;

    if (callbackData.startsWith('/start watch_')) {
        // const chatMember = await ctx.telegram.getChatMember('@moviecastmovie', ctx.from.id);
        const videoId = callbackData.split('_')[1]; // Extract video ID from the callback data
        try {
            if (1 == 1) {
                const cachedVideo = cache.get(videoId);
                let video;
                if (cachedVideo) {
                    video = cachedVideo;
                } else {
                    video = await Video.findById(videoId);
                    if (video) {
                        cache.set(videoId, video);
                    }
                }

                if (!video) {
                    const sentMessage = await ctx.reply(`❌ Video with ID  '${videoId}' not found.`);
                    deleteMessageAfter(ctx, sentMessage.message_id, 120);
                    return;
                }

                // Add "Join ➥ @MovieCastAgainBot" to the end of the caption
                const captionWithLink = `🎥 <b>${video.caption || "NOT AVAILABLE"}    📦 <b>SIZE:</b> ${bytesToMB(video.size)} </b>\n\n⚠️ <b>NOTE:</b> This video was not deleted.\n\n✨ <i>Join ➥</i> @moviecastmovie`;
                // Send the video file to the user
                const sentMessage = await ctx.replyWithVideo(video.fileId, {
                    caption: `${captionWithLink}`,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '▶️ Watch Movie', url: `https://t.me/moviecastmovie` }
                            ]
                        ]
                    },
                    disable_notification: true,
                    protect_content: true
                });

            } else {
                const sentMessage = await ctx.reply(
                    `🚀 <b>JOIN</b> @MovieCastAgainBot <b>TO WATCH THIS VIDEO</b> 🎥\n\n📢 <i>Unlock premium movies and exclusive content!</i>`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: '✨JOIN CHANNEL✨',
                                        url: 'https://t.me/moviecastback',
                                    },
                                    // Retry button with directional and play emojis
                                    {
                                        text: '🔄Retry',
                                        url: `https://t.me/${process.env.BOT_USERNAME}?start=watch_${videoId}`,
                                    },
                                ]
                            ]
                        }
                    }
                );
                deleteMessageAfter(ctx, sentMessage.message_id, 120);
            }
        } catch (error) {
            console.error(`Error fetching video with ID '${videoId}':`, error);
            const sentMessage = await ctx.reply(
                `⚠️ <b>Oops!</b> Something went wrong. 😟\n\n` +
                `❌ <i>Your video is here 👇👇.</i>`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '🔄 Click Here',
                                    url: `https://t.me/Filmmela1bot?start=watch_${videoId}`,
                                },
                            ]
                        ]
                    }
                }
            );
            deleteMessageAfter(ctx, sentMessage.message_id, 120);
        }
    } else {
        const sentMessage = await ctx.reply(
            `🎬 <b>Welcome to Movie-Cast Bot!</b> 🎥\n\n🌟 <i>Your gateway to amazing movies and entertainment.</i>\n\n👇 Explore now!`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🌐 Updates ', url: 'https://t.me/moviecastback' },
                            { text: '🎞️ View Movies', url: 'https://t.me/moviecastmovie' }
                        ]
                    ]
                }
            }
        );

        // Delete the message after 2 minutes
        deleteMessageAfter(ctx, sentMessage ? sentMessage.message_id : callbackQuery.sentMessage.message_id, 30);
    }
});

// Telegram bot handlers
bot.command("totalmovies", async (ctx) => {
    try {
        const count = await Video.countDocuments();

        // Fancy response message
        const sentMessage = await ctx.reply(
            `🎥 <b>Total Movies in Our Collection</b> 🎬\n\n` +
            `📁 <i>Movies Count:</i> <b>${count}</b>\n\n` +
            `✨ <i>Discover amazing films and enjoy unlimited entertainment!</i>`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🌟 Explore Movies 🌟", url: "https://yourwebsite.com/movies" }
                        ]
                    ]
                }
            }
        );

        // Delete the message after 2 minutes
        deleteMessageAfter(ctx, sentMessage.message_id, 120);

    } catch (error) {
        console.error("Error fetching movie count:", error);

        // Error response message
        const sentMessage = await ctx.reply(
            `⚠️ <b>Oops!</b> Something went wrong. 😟\n\n` +
            `❌ <i>We couldn’t fetch the movie count. Please try again later.</i>`,
            {
                parse_mode: "HTML",
            }
        );

        // Delete the message after 2 minutes
        deleteMessageAfter(ctx, sentMessage.message_id, 120);
    }
});


//     try {
//         const args = ctx.message.text.split(" ");
//         const [_, scrapFromChannel, sendToChannel, startFrom, noOfvideos] = args;

//         if (!scrapFromChannel || !sendToChannel) {
//             await ctx.reply("⚠️ Please provide both source and destination channels. Example: /scrap <source_channel> <destination_channel>");
//             return;
//         }
//         console.log(scrapFromChannel, sendToChannel, startFrom, noOfvideos)
//         console.log(`Scraping from: ${scrapFromChannel}, Sending to: ${sendToChannel}`);
//         await scrap(ctx, scrapFromChannel, sendToChannel, noOfvideos, startFrom);

//         await ctx.reply("✅ Scraping started. Check logs for progress.");
//     } catch (error) {
//         console.error("Error executing scrap command:", error);
//         await ctx.reply("⚠️ Failed to execute scrap command. Please try again later.");
//     }
// });



bot.on("text", async (ctx) => {
    const movieName = ctx.message.text.trim();
    const username = ctx.from.first_name || ctx.from.username || "user";

    try {
        if (!movieName || movieName.length < 3) {
            await ctx.reply(
                "❌ <b>Please enter a valid movie name!</b>\n\n" +
                "💡 <i>Hint: Type the name of the movie you want to search for.</i>",
                { parse_mode: "HTML", reply_to_message_id: ctx.message.message_id }
            );
            return;
        }

        // Clean and prepare movie name for regex search
        const cleanMovieName = movieName.replace(/[^\w\s]/gi, "").replace(/\s\s+/g, " ").replace(/\*/g, "").trim();
        const searchPattern = cleanMovieName.split(/\s+/).map(word => `(?=.*${word})`).join("");
        const regex = new RegExp(`${searchPattern}`, "i");

        // Find matching videos with regex
        const matchingVideos = await Video.find({ caption: { $regex: regex } }).sort({ caption: -1 });

        if (matchingVideos.length === 0) {
            await ctx.reply(
                `❌ <b>Sorry, ${username}!</b>\n` +
                `🎥 No videos found matching your search for "<i>${movieName}</i>".`,
                { parse_mode: "HTML", reply_to_message_id: ctx.message.message_id }
            );
            return;
        }

        const totalPages = Math.ceil(matchingVideos.length / 8);
        let currentPage = 1;
        const buttons = generateButtons(matchingVideos, currentPage, totalPages);

        const sentMessage = await ctx.reply(
            `🎬 <b>Hello, ${username}!</b>\n` +
            `🔍 I found <b>${matchingVideos.length}</b> videos matching your search for "<i>${movieName}</i>".\n\n` +
            `📖 <b>Choose a video to watch:</b>`,
            {
                parse_mode: "HTML",
                reply_to_message_id: ctx.message.message_id,
                reply_markup: { inline_keyboard: buttons },
            }
        );

        // Automatically delete the message after 2 minutes
        deleteMessageAfter(ctx, sentMessage.message_id, 120);

    } catch (error) {
        console.error("Error searching for videos:", error);
        const sentMessage = await ctx.reply(
            "⚠️ <b>Oops! Something went wrong.</b>\n" +
            "❌ Failed to search for videos. Please try again later.",
            { parse_mode: "HTML", reply_to_message_id: ctx.message.message_id }
        );

        // Automatically delete the error message after 2 minutes
        deleteMessageAfter(ctx, sentMessage.message_id, 120);
    }
});

// Handle next page action
bot.action(/next_(\d+)/, async (ctx) => {
    const currentPage = parseInt(ctx.match[1]);
    const nextPage = currentPage + 1;

    const movieName = ctx.callbackQuery.message.text.split("'")[1]; // Extract movieName from message text
    const regex = new RegExp(movieName, "i");

    // Check cache first
    const cacheKey = `videos_${movieName}`;
    let matchingVideos = cache.get(cacheKey);

    if (!matchingVideos) {
        matchingVideos = await Video.find({ caption: regex });
        cache.set(cacheKey, matchingVideos);
    }

    const totalPages = Math.ceil(matchingVideos.length / 8);

    if (nextPage <= totalPages) {
        const buttons = generateButtons(matchingVideos, nextPage, totalPages);
        await ctx.editMessageText(
            `Page ${nextPage}/${totalPages}: Found ${matchingVideos.length} videos matching '${movieName}'. Select one to watch:`,
            Markup.inlineKeyboard(buttons)
        );
    }
    await ctx.answerCbQuery();
});

// Handle previous page action
bot.action(/prev_(\d+)/, async (ctx) => {
    const currentPage = parseInt(ctx.match[1]);
    const prevPage = currentPage - 1;

    const movieName = ctx.callbackQuery.message.text.split("'")[1]; // Extract movieName from message text
    const regex = new RegExp(movieName, "i");

    // Check cache first
    const cacheKey = `videos_${movieName}`;
    let matchingVideos = cache.get(cacheKey);

    if (!matchingVideos) {
        matchingVideos = await Video.find({ caption: regex });
        cache.set(cacheKey, matchingVideos);
    }

    const totalPages = Math.ceil(matchingVideos.length / 8);

    if (prevPage > 0) {
        const buttons = generateButtons(matchingVideos, prevPage, totalPages);
        await ctx.editMessageText(
            `Page ${prevPage}/${totalPages}: Found ${matchingVideos.length} videos matching '${movieName}'. Select one to watch:`,
            Markup.inlineKeyboard(buttons)
        );
    }
    await ctx.answerCbQuery();
});

bot.on("video", async (ctx) => {
    const { message } = ctx.update;
    try {
        // Extract video details
        const videoFileId = message.video.file_id;
        const videoSize = message.video.file_size;

        // Use caption if available, otherwise fall back to videoFileId
        const caption = message.caption ? cleanCaption(message.caption) : videoFileId;

        // Check if the video already exists in the database
        const existingVideo = await Video.findOne({
            caption: caption,
            size: videoSize,
        });

        if (existingVideo) {
            throw new Error("This video already exists in the database.");
        }

        // Introduce a delay of 1 second for each video processing
        await delay(1000); // Delay of 1 second (1000ms)

        // Store video data in MongoDB
        const videos = await storeVideoData(videoFileId, caption, videoSize);

        if (allowedUsers.includes(ctx.from.username)) {
            if (videos) {
                const sendmessage = await ctx.reply("🎉 Video uploaded successfully.");
                deleteMessageAfter(ctx, sendmessage.message_id, 10); // Changed to 10 seconds
            }
        }

    } catch (error) {
        console.error("Error uploading video:", error);

        // Handle errors gracefully with a user-friendly message
        if (allowedUsers.includes(ctx.from.username)) {
            await ctx.reply(
                `⚠️ <b>Failed to Upload Video</b> ❌\n\n` +
                `Reason: ${error.message}`,
                { parse_mode: "HTML" }
            );
        }
    }
});

// Utility function to introduce a delay
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// bot.command("scrap", async (ctx) => {


// bot.launch().then(() => {
//     console.log('Bot started');
// });

// Catch Telegraf errors
bot.catch((err, ctx) => {
    console.error('Telegraf error:', err);
    ctx.reply('Oops! Something went wrong.');
});

module.exports = bot;
