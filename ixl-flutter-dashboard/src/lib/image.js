
/**
 * Compresses and resizes an image file to meet specific size constraints.
 * It will iteratively reduce quality and dimensions until the file size is under the limit.
 * 
 * @param {File} file - The image file to process.
 * @param {number} maxHeight - The target maximum height of the image (default: 300px).
 * @param {number} maxSizeKB - The target maximum file size in KB (default: 50KB). 
 * @returns {Promise<File>} - A promise that resolves to the processed File.
 */
export const compressImage = async (file, maxHeight = 300, maxSizeKB = 50) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = async () => {
            URL.revokeObjectURL(objectUrl);

            let currentHeight = maxHeight;
            let quality = 0.9;
            let blob = null;
            let attempts = 0;

            // Loop adjustment variables
            let width = img.width;
            let height = img.height;

            // Initial aspect ratio
            const ratio = width / height;

            // Iterative compression
            while (attempts < 15) {
                // Calculate dimensions for this iteration
                let newHeight = currentHeight;
                let newWidth = newHeight * ratio;

                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Compress
                const tryBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));

                if (!tryBlob) {
                    reject(new Error('Canvas blob creation failed'));
                    return;
                }

                blob = tryBlob;
                const sizeKB = blob.size / 1024;

                // Success: Size is under limit OR meaningful progress stopped (quality too low)
                if (sizeKB <= maxSizeKB) {
                    break;
                }

                if (quality <= 0.1) {
                    // Try reducing dimensions significantly if quality bottomed out
                    if (currentHeight > 100) {
                        currentHeight = Math.floor(currentHeight * 0.8);
                        // Reset quality slightly to try again at smaller size
                        quality = 0.5;
                    } else {
                        console.warn(`Could not compress to ${maxSizeKB}KB. Final: ${sizeKB.toFixed(2)}KB`);
                        break;
                    }
                } else {
                    // Reduce quality
                    quality -= 0.1;
                }
                attempts++;
            }

            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
            });

            console.log(`Compressed: ${file.size} -> ${newFile.size} bytes (${(newFile.size / 1024).toFixed(2)} KB)`);
            resolve(newFile);
        };

        img.onerror = (error) => reject(error);
        img.src = objectUrl;
    });
};
