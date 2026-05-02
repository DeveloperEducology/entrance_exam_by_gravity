require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// ============================================================================
// PASTE YOUR URLS HERE
// ============================================================================
const urlsToUpload = [
    // "https://example.com/image1.png",
    // "https://example.com/image2.jpg"
];
// ============================================================================

async function main() {
    if (urlsToUpload.length === 0) {
        console.log("No URLs provided! Please paste your URLs into the 'urlsToUpload' array in this file.");
        return;
    }

    console.log(`Sending ${urlsToUpload.length} URLs to your Node.js Backend...`);
    console.log(`(Make sure your backend is running at http://localhost:5000)`);
    
    try {
        const response = await axios.post('http://localhost:5000/api/media/bulk-upload-urls', {
            urls: urlsToUpload
        });

        const results = response.data.data;
        console.log("\n==================================================");
        console.log("UPLOAD COMPLETE & REGISTERED IN MONGODB");
        console.log("==================================================");
        
        results.forEach((res, i) => {
            if (res.success) {
                console.log(`✅ [${i+1}] ${res.r2_url}`);
            } else {
                console.log(`❌ [${i+1}] Failed: ${res.error}`);
            }
        });
        
    } catch (err) {
        console.error("\n❌ Request failed. Is your backend server running on port 5000?");
        console.error(err.message);
    }
}

main();
