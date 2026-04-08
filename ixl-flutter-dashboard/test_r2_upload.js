
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

// CREDENTIALS FROM .env
const accountId = "b6d7aa4846a017f6f1e161b31ec109cb";
const accessKeyId = "c954d1200b09a1c4cc65e2e5fefb0860";
const secretAccessKey = "e4eff2d49c51d87347e27bb4adfbb2106f423797c30548e1de01428c9dfefbe9";

const execute = async () => {
    try {
        const client = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        console.log("Attempting to list buckets...");
        const command = new ListBucketsCommand({});
        const data = await client.send(command);
        console.log("Success! Buckets:", data.Buckets.map(b => b.Name));
    } catch (err) {
        console.error("Failed to list buckets:", err);
    }
};

execute();
