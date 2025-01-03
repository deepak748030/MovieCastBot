const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const mongoose = require("mongoose");

const offsetSchema = new mongoose.Schema({
    channelId: String,
    offsetId: { type: Number, default: 0 },
});

const Offset = mongoose.model("Offset", offsetSchema);

const scrap = async (ctx, scrapFromChannel, sendToChannel) => {
    scrapFromChannel = scrapFromChannel.replace(/_/g, " ");
    sendToChannel = sendToChannel.replace(/_/g, " ");

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const accounts = [
        {
            apiId: 25900274,
            apiHash: "0aa8d2ef404590b2b2cdd434f50d689d",
            stringSession: "YOUR_STRING_SESSION_1",
        },
        {
            apiId: 23518873,
            apiHash: "ff19c52a7a4b48b66ae905330065ddb4",
            stringSession: "YOUR_STRING_SESSION_2",
        },
    ];

    let currentAccountIndex = 0;
    let offsetId = 0;
    const batchSize = 50;
    let forwardedCount = 0;

    const loadOffset = async (channelId) => {
        try {
            const offset = await Offset.findOne({ channelId });
            return offset ? offset.offsetId : 0;
        } catch (error) {
            console.error("Error loading offsetId from MongoDB:", error);
            return 0;
        }
    };

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
        currentAccountIndex = (currentAccountIndex + 1) % accounts.length;
        console.log(`Switched to account index ${currentAccountIndex}`);
        const newClient = createClient(accounts[currentAccountIndex]);
        await newClient.connect();
        return newClient;
    };

    const processMessages = async (client, targetChannel) => {
        offsetId = await loadOffset(targetChannel.id);

        while (forwardedCount < 500) {
            try {
                const messages = await client.getMessages(targetChannel, {
                    limit: batchSize,
                    offsetId,
                });

                if (messages.length === 0) break;

                for (const message of messages) {
                    if (forwardedCount >= 500) break;
                    if (message.media && message.media.video) {
                        try {
                            await client.sendFile(sendToChannel, {
                                file: message.media.document,
                                caption: message.message || "",
                            });
                            forwardedCount++;
                        } catch (error) {
                            if (error.errorMessage?.includes("FLOOD_WAIT")) {
                                const waitTime = parseInt(error.errorMessage.split(" ")[1], 10) * 1000;
                                console.log(`Flood wait error. Waiting ${waitTime / 1000} seconds...`);
                                await sleep(waitTime);
                            } else {
                                console.error("Error sending message:", error);
                                client = await switchAccount();
                            }
                        }
                    }
                }
                offsetId = messages[messages.length - 1].id - 1;
                await saveOffset(targetChannel.id, offsetId);
            } catch (error) {
                console.error("Error processing messages:", error);
                client = await switchAccount();
            }
        }
    };

    const main = async () => {
        const client = createClient(accounts[currentAccountIndex]);
        await client.connect();

        const dialogs = await client.getDialogs();
        const targetChannel = dialogs.find(
            (dialog) => dialog.entity.username === scrapFromChannel || dialog.entity.title === scrapFromChannel
        )?.entity;

        if (!targetChannel) {
            const errorMsg = `Channel ${scrapFromChannel} not found.`;
            console.error(errorMsg);
            ctx.reply(errorMsg);
            return;
        }

        ctx.reply(`Starting to forward messages from ${scrapFromChannel} to ${sendToChannel}`);

        await processMessages(client, targetChannel);

        ctx.reply(`Forwarded 500 messages from ${scrapFromChannel} to ${sendToChannel}. Stopping now.`);
        await client.disconnect();
    };

};

module.exports = scrap;
