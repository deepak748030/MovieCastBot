const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const mongoose = require("mongoose");

// Define schema and model for offset storage
const offsetSchema = new mongoose.Schema({
    channelId: String,
    offsetId: { type: Number, default: 0 },
});

const Offset = mongoose.model("Offset", offsetSchema);

const scrap = async (ctx, scrapFromChannel, sendToChannel) => {
    scrapFromChannel = scrapFromChannel.replace(/_/g, ' ');
    sendToChannel = sendToChannel.replace(/_/g, ' ');
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    console.log(scrapFromChannel, sendToChannel)
    const accounts = [
        {
            apiId: 25900274,
            apiHash: "0aa8d2ef404590b2b2cdd434f50d689d",
            stringSession: "1BQANOTEuMTA4LjU2LjE3NAG7tQoElNJFqINOMRQOcOblnIqEGFPcfA4erBhIp5R2P/1Mv7YuS+SPFZXS6cey4Tp3kg5kSamYY9yK4ZZMJBUkxaKgQeCPWntquhIm5fZpsvTEvCgJwXOR4O9c3vuoVIFuZ/YVujTQnxgB1/6I6uORXY5Uy8o/XsL4v8k9Yoj+2sade/cxk2jpucJ9B+OaMcJKGtsVc3xv0rOdPjO56BRyYxhdrJL/wJWvH9Dcd+n84lDFRWOsYzbtpb4+qeuYksZbAIWrI+Rli2UtKKhptxjhPYoB2GPanb5zUeJU2l/E8cn46lq95tmyF+aYfksm4XQ8Dbzvb5/4BBPVE0TwZyXzxg==",
        },
        {
            apiId: 23518873,
            apiHash: "ff19c52a7a4b48b66ae905330065ddb4",
            stringSession: "1BQANOTEuMTA4LjU2LjE2MAG7baAoXw2SWIpFM7nuF+kOg2phtbrVyKfZMBYLAb6TwhTcNnYkyemESZqYm7YbjU9BVzlZorhazZkcyZN9dHEzJHLzs+3QTGSEoBUPxMfR+j8coA5avEHwoxQZdR/ElySunpDpDgqBgmiWm0EceLYfLmwLE6YhSSCzMoGlL5XtlvT5JRqDE61m1mefKV37hhs+DqSPX4/i2fxUJQs3iX1Y24jnuEm3QePDpkgjGHnbwqZaRHlIAsJtrLDS97agGWzhiOI5Vsp7wcxcvxQq36odJeiacF2d523V4BmdH4231Px17ZFxeSOKvqUSGOmYE6M/CUHkpoCOTWwQoOdfCGO7yw==",
        },
    ];

    let currentAccountIndex = 0;
    let offsetId = 0; // Start offset
    const batchSize = 100; // Messages per batch
    let processing = true;

    // Load the last saved offsetId from MongoDB
    const loadOffset = async (channelId) => {
        try {
            const offset = await Offset.findOne({ channelId });
            return offset ? offset.offsetId : 0;
        } catch (error) {
            console.error("Error loading offsetId from MongoDB:", error);
            return 0; // Default to 0 in case of an error
        }
    };

    // Save the current offsetId to MongoDB
    const saveOffset = async (channelId, offset) => {
        try {
            const result = await Offset.findOneAndUpdate(
                { channelId },
                { offsetId: offset },
                { upsert: true, new: true }
            );
            console.log(`OffsetId saved to MongoDB: ${result.offsetId}`);
        } catch (error) {
            console.error("Error saving offsetId to MongoDB:", error);
        }
    };

    // Create a Telegram client for an account
    const createClient = (account) => {
        const client = new TelegramClient(
            new StringSession(account.stringSession),
            account.apiId,
            account.apiHash,
            { connectionRetries: 5 }
        );

        client.on("disconnected", () => {
            console.log("Client disconnected. Reconnecting...");
            client.connect();
        });

        return client;
    };

    const switchAccount = async () => {
        console.log(`Disconnecting current account ${currentAccountIndex + 1}...`);
        await clients[currentAccountIndex].disconnect();

        currentAccountIndex = (currentAccountIndex === 0) ? 1 : 0;
        console.log(`Switching to account ${currentAccountIndex + 1}...`);

        const newClient = createClient(accounts[currentAccountIndex]);
        await newClient.connect();
        console.log(`Switched and connected to account ${currentAccountIndex + 1}.`);
        return newClient;
    };

    const processMessages = async (client, targetChannel) => {
        offsetId = await loadOffset(targetChannel.id);
        await ctx.reply(`Starting message processing from offsetId: ${offsetId}`);

        console.log(`Fetching messages starting from offsetId ${offsetId}...`);
        await ctx.reply(`Fetching messages from offsetId ${offsetId}...`);

        try {
            const messages = await client.getMessages(targetChannel, {
                limit: batchSize,
                offsetId,
            });

            if (messages.length === 0) {
                console.log("No more messages to process.");
                await ctx.reply("No more messages to process.");
                return;
            }

            for (const message of messages) {
                if (message.media && message.media.video === true) {
                    try {
                        await client.sendFile(sendToChannel, {
                            file: message.media.document,
                            caption: message.message || "",
                            forceDocument: false,
                        });
                        console.log(`Video forwarded: ${message.id}`);
                        if (message.id % 10 === 0) {
                            await ctx.reply(`Video forwarded: ${message.id}`);
                        }
                    } catch (error) {
                        if (error.errorMessage && error.errorMessage.includes("FLOOD_WAIT")) {
                            const waitTime = parseInt(error.errorMessage.split(" ")[1], 10) * 1000;
                            console.log(`Flood wait error. Waiting for ${waitTime / 1000} seconds...`);
                            await ctx.reply(`Flood wait error. Waiting for ${waitTime / 1000} seconds...`);
                            await sleep(waitTime);
                        } else {
                            console.error(`Error forwarding message ${message.id}:`, error);
                            await ctx.reply(`Error forwarding message ${message.id}. Switching account...`);
                            client = await switchAccount();
                            break;
                        }
                    }
                }
            }

            offsetId = messages[messages.length - 1].id - 1;
            await saveOffset(targetChannel.id, offsetId);
            await ctx.reply(`Processed batch. Next offsetId: ${offsetId}`);
        } catch (error) {
            console.error("Error processing messages:", error);
            await ctx.reply(`Error processing messages: ${error.message}`);
        }
    };

    const main = async () => {
        let client = createClient(accounts[currentAccountIndex]);

        try {
            await client.connect();
            console.log("Client connected.");
            await ctx.reply("Telegram client connected.");

            const dialogs = await client.getDialogs();
            const targetChannel = dialogs.find(
                (dialog) => dialog.entity.username === scrapFromChannel || dialog.entity.title === scrapFromChannel
            )?.entity;

            if (!targetChannel) {
                console.error(`Target channel ${scrapFromChannel} not found.`);
                await ctx.reply(`Target channel ${scrapFromChannel} not found.`);
                return;
            }

            console.log("Target channel found.");
            await ctx.reply(`Target channel ${scrapFromChannel} found.`);
            await processMessages(client, targetChannel);
        } catch (error) {
            console.error("Critical error:", error);
            await ctx.reply(`Critical error: ${error.message}`);
        } finally {
            await client.disconnect();
            console.log("Client disconnected.");
            await ctx.reply("Telegram client disconnected.");
        }
    };

    main();
};

module.exports = scrap;
