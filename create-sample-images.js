// This script creates sample placeholder images for the demo
// In a real application, users would upload their own images

const fs = require('fs');
const path = require('path');

// Create sample avatar placeholders
const avatars = [
    'alice.jpg',
    'bob.jpg', 
    'charlie.jpg',
    'diana.jpg',
    'ethan.jpg'
];

const posts = [
    'art1.jpg',
    'music1.jpg',
    'fitness1.jpg',
    'travel1.jpg'
];

const uploadsDir = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create placeholder files (in a real app, these would be actual images)
[...avatars, ...posts, 'default-avatar.png'].forEach(filename => {
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `Placeholder for ${filename}. In production, this would be an actual image file.`);
    }
});

console.log('Sample image placeholders created in uploads directory');
console.log('In a real application, replace these with actual image files');