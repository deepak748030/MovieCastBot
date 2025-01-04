const puppeteer = require("puppeteer");

const performPuppeteerTask = async (userMessage) => {
    const browser = await puppeteer.launch({
        headless: true, // Ensures the browser runs in headless mode
        defaultViewport: null,
        args: ["--no-sandbox"], // Required for Vercel's environment
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000); // Increase navigation timeout
    page.setDefaultTimeout(60000); // Increase default timeout for all actions
    try {
        const url = "https://www.getmerlin.in/chat";
        // console.log(`Navigating to ${url}`);
        await page.goto(url);

        // Ensure the input element exists and is interactable
        const inputSelector = ".tiptap p";
        await page.evaluate(() => {
            let pTag = document.querySelector(".tiptap p");
            if (!pTag) {
                const tiptapDiv = document.querySelector(".tiptap");
                if (tiptapDiv) {
                    pTag = document.createElement("p");
                    tiptapDiv.appendChild(pTag);
                }
            }
        });
        await page.waitForSelector(inputSelector);

        // console.log("Typing a message...");
        await page.type(inputSelector, userMessage);

        // Click the send button
        const sendButtonSelector = ".T107_3";
        // console.log("Clicking the send button...");
        await page.waitForSelector(sendButtonSelector);
        await page.click(sendButtonSelector);

        // console.log("Waiting for the response...");
        const responseSelector = ".chat-message.assistant-message p";
        await page.waitForSelector(responseSelector);

        // Scrape the response
        const response = await page.evaluate((selector) => {
            return document.querySelector(selector)?.innerText || "No response found.";
        }, responseSelector);

        // console.log("ChatGPT Response:", response);
        return response;
    } catch (err) {
        console.error("An error occurred:", err);
        return "An error occurred while processing your request.";
    } finally {
        await browser.close();
    }
};

module.exports = { performPuppeteerTask };
