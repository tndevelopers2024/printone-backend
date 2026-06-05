require('dotenv').config();

async function testDarwinbox() {
    console.log("==========================================");
    console.log("    DARWINBOX API LIMIT TEST SCRIPT       ");
    console.log("==========================================\n");

    const email = 'mohammed.junaid@tigeranalytics.com';
    console.log(`Checking API for email: ${email}...\n`);

    const darwinUrl = process.env.DARWINBOX_API_URL;
    const apiKey = process.env.DARWINBOX_API_KEY;
    const datasetKey = process.env.DARWINBOX_DATASET_KEY;
    const userId = process.env.DARWINBOX_USER_ID;
    const password = process.env.DARWINBOX_PASSWORD;

    const authHeader = 'Basic ' + Buffer.from(`${userId}:${password}`).toString('base64');

    try {
        const response = await fetch(darwinUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({
                api_key: apiKey,
                datasetKey: datasetKey,
                email_ids: [email]
            })
        });

        const data = await response.json();
        
        console.log("--- DARWINBOX API RESPONSE ---");
        console.log(JSON.stringify(data, null, 2));
        console.log("------------------------------\n");

        if (data.status === 0 && data.message && data.message.toLowerCase().includes('limit')) {
            console.log("❌ CONCLUSION: The Darwinbox API is currently blocking requests because the daily limit has been exhausted.");
        } else if (data.status === 1) {
            console.log("✅ CONCLUSION: The Darwinbox API is working and returning data.");
        }

    } catch (error) {
        console.error("Error connecting to Darwinbox API:", error);
    }
}

testDarwinbox();
