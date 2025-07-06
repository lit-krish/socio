const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'social-media-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/socialmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.log('MongoDB connection error:', err);
  // For development, we'll use in-memory storage if MongoDB is not available
  console.log('Using in-memory storage for development');
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit for stories (videos)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Separate upload config for posts (images only)
const uploadPost = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for posts'));
    }
  }
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  bio: { type: String, default: '' },
  profileImage: { type: String, default: '/uploads/default-avatar.png' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  joinDate: { type: Date, default: Date.now }
});

// Post Schema
const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  image: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);

// In-memory storage for development
let users = [];
let posts = [];
let stories = [];
let reels = [];
let currentUserId = 1;
let currentPostId = 1;
let currentStoryId = 1;
let currentReelId = 1;

// Authentication middleware
const authenticateUser = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Routes

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve features demo page
app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo-features.html'));
});

// Serve gallery page
app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

// Register user
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    
    // Check if user already exists (in-memory)
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
      id: currentUserId++,
      username,
      email,
      password: hashedPassword,
      fullName,
      bio: '',
      profileImage: '/uploads/default-avatar.png',
      followers: [],
      following: [],
      joinDate: new Date()
    };
    
    users.push(newUser);
    req.session.userId = newUser.id;
    
    res.json({ message: 'User registered successfully', user: { ...newUser, password: undefined } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username || u.email === username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ message: 'Login successful', user: { ...user, password: undefined } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout user
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

// Get current user
app.get('/api/user', authenticateUser, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  if (user) {
    res.json({ ...user, password: undefined });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Update profile
app.put('/api/profile', authenticateUser, upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { fullName, bio } = req.body;
    
    user.fullName = fullName || user.fullName;
    user.bio = bio || user.bio;
    
    if (req.file) {
      user.profileImage = '/uploads/' + req.file.filename;
    }

    res.json({ message: 'Profile updated successfully', user: { ...user, password: undefined } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create post
app.post('/api/posts', authenticateUser, uploadPost.single('image'), (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.session.userId;
    
    const newPost = {
      id: currentPostId++,
      user: userId,
      content,
      image: req.file ? '/uploads/' + req.file.filename : null,
      likes: [],
      comments: [],
      createdAt: new Date()
    };
    
    posts.unshift(newPost); // Add to beginning for newest first
    res.json({ message: 'Post created successfully', post: newPost });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all posts (feed)
app.get('/api/feed', (req, res) => {
  try {
    const postsWithUsers = posts.map(post => {
      const user = users.find(u => u.id === post.user);
      return {
        ...post,
        user: user ? { ...user, password: undefined } : null
      };
    });
    
    res.json(postsWithUsers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
app.get('/api/profile/:username', (req, res) => {
  try {
    const user = users.find(u => u.username === req.params.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userPosts = posts.filter(p => p.user === user.id);
    
    res.json({
      user: { ...user, password: undefined },
      posts: userPosts,
      postsCount: userPosts.length,
      followersCount: user.followers.length,
      followingCount: user.following.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/unlike post
app.post('/api/posts/:id/like', authenticateUser, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const likeIndex = post.likes.indexOf(userId);
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1); // Unlike
      res.json({ message: 'Post unliked', liked: false, likesCount: post.likes.length });
    } else {
      post.likes.push(userId); // Like
      res.json({ message: 'Post liked', liked: true, likesCount: post.likes.length });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
app.post('/api/posts/:id/comment', authenticateUser, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.session.userId;
    const { content } = req.body;
    
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const user = users.find(u => u.id === userId);
    const comment = {
      id: Date.now(),
      user: userId,
      content,
      createdAt: new Date(),
      userInfo: { ...user, password: undefined }
    };
    
    post.comments.push(comment);
    res.json({ message: 'Comment added', comment });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Follow/unfollow user
app.post('/api/users/:username/follow', authenticateUser, (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const targetUser = users.find(u => u.username === req.params.username);
    const currentUser = users.find(u => u.id === currentUserId);
    
    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === currentUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const followingIndex = currentUser.following.indexOf(targetUser.id);
    const followerIndex = targetUser.followers.indexOf(currentUserId);
    
    if (followingIndex > -1) {
      // Unfollow
      currentUser.following.splice(followingIndex, 1);
      targetUser.followers.splice(followerIndex, 1);
      res.json({ message: 'Unfollowed successfully', following: false });
    } else {
      // Follow
      currentUser.following.push(targetUser.id);
      targetUser.followers.push(currentUserId);
      res.json({ message: 'Followed successfully', following: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete post
app.delete('/api/posts/:id', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Please log in to delete posts' });
    }

    const postId = parseInt(req.params.id);
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = posts[postIndex];
    
    // Check if the user owns the post
    if (post.user !== req.session.userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Remove the post
    posts.splice(postIndex, 1);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (for search)
app.get('/api/users', (req, res) => {
  try {
    const usersWithoutPasswords = users.map(user => ({ ...user, password: undefined }));
    res.json(usersWithoutPasswords);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Initialize with sample data
function initializeSampleData() {
  // Sample users with beautiful placeholder images
  const sampleUsers = [
    {
      id: currentUserId++,
      username: 'alice_wonder',
      email: 'alice@example.com',
      password: '$2a$10$dummy.hash.for.password123',
      fullName: 'Alice Wonderland',
      bio: '🎨 Digital Artist | 📸 Photography enthusiast | ☕ Coffee lover',
      profileImage: 'https://images.unsplash.com/photo-1494790108755-2616c96f7e5a?w=400&h=400&fit=crop&crop=face',
      followers: [],
      following: [],
      joinDate: new Date('2024-01-15')
    },
    {
      id: currentUserId++,
      username: 'bob_builder',
      email: 'bob@example.com',
      password: '$2a$10$dummy.hash.for.password123',
      fullName: 'Bob Builder',
      bio: '🏗️ Software Engineer | 🚀 Tech enthusiast | 🎮 Gamer',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      followers: [],
      following: [],
      joinDate: new Date('2024-02-01')
    },
    {
      id: currentUserId++,
      username: 'charlie_music',
      email: 'charlie@example.com',
      password: '$2a$10$dummy.hash.for.password123',
      fullName: 'Charlie Melody',
      bio: '🎵 Musician | 🎸 Guitar player | 🎤 Singer-songwriter',
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
      followers: [],
      following: [],
      joinDate: new Date('2024-02-10')
    },
    {
      id: currentUserId++,
      username: 'diana_fitness',
      email: 'diana@example.com',
      password: '$2a$10$dummy.hash.for.password123',
      fullName: 'Diana Strong',
      bio: '💪 Fitness coach | 🏃‍♀️ Running enthusiast | 🥗 Healthy living advocate',
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
      followers: [],
      following: [],
      joinDate: new Date('2024-02-15')
    },
    {
      id: currentUserId++,
      username: 'ethan_travel',
      email: 'ethan@example.com',
      password: '$2a$10$dummy.hash.for.password123',
      fullName: 'Ethan Explorer',
      bio: '✈️ Travel blogger | 📍 World explorer | 📷 Adventure photographer',
      profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
      followers: [],
      following: [],
      joinDate: new Date('2024-02-20')
    }
  ];

  users.push(...sampleUsers);

  // Create some follow relationships
  users[0].following = [users[1].id, users[2].id];
  users[1].followers = [users[0].id];
  users[2].followers = [users[0].id];
  users[1].following = [users[2].id, users[3].id];
  users[2].followers.push(users[1].id);
  users[3].followers = [users[1].id];

  // Sample posts with more variety and engagement
  const samplePosts = [
    {
      id: currentPostId++,
      user: users[0].id,
      content: "Just finished my latest digital artwork! What do you think? 🎨✨ This piece took me 20 hours to complete, but I'm so proud of the result!",
      image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
      likes: [users[1].id, users[2].id, users[3].id],
      comments: [
        {
          id: 1,
          user: users[1].id,
          content: "Amazing work! The colors are so vibrant! 😍",
          createdAt: new Date('2024-12-01T10:30:00'),
          userInfo: { ...users[1], password: undefined }
        },
        {
          id: 2,
          user: users[3].id,
          content: "This is incredible! Do you sell prints?",
          createdAt: new Date('2024-12-01T11:00:00'),
          userInfo: { ...users[3], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-01T10:00:00')
    },
    {
      id: currentPostId++,
      user: users[1].id,
      content: "Working on a new React project! The component architecture is getting complex but exciting 💻 Any fellow developers here have tips for state management in large apps?",
      image: null,
      likes: [users[0].id, users[4].id],
      comments: [
        {
          id: 3,
          user: users[4].id,
          content: "Redux Toolkit is a game changer! Give it a try 🚀",
          createdAt: new Date('2024-12-01T12:30:00'),
          userInfo: { ...users[4], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-01T12:00:00')
    },
    {
      id: currentPostId++,
      user: users[2].id,
      content: "Recording session today! New song coming soon 🎵🎸 Been working on this melody for months, finally ready to share it with the world!",
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
      likes: [users[0].id, users[3].id, users[4].id],
      comments: [
        {
          id: 4,
          user: users[0].id,
          content: "Can't wait to hear it! Your last track was fire 🔥🎶",
          createdAt: new Date('2024-12-01T14:15:00'),
          userInfo: { ...users[0], password: undefined }
        },
        {
          id: 5,
          user: users[4].id,
          content: "Studio sessions are the best! What genre are you working on?",
          createdAt: new Date('2024-12-01T14:45:00'),
          userInfo: { ...users[4], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-01T14:00:00')
    },
    {
      id: currentPostId++,
      user: users[3].id,
      content: "Morning workout done! 💪 Remember, consistency is key to achieving your fitness goals! Today's session: 30 min cardio + strength training. Who's joining me tomorrow?",
      image: 'https://images.unsplash.com/photo-1571019613914-85e2e3e46e41?w=800&h=600&fit=crop',
      likes: [users[1].id, users[4].id, users[0].id],
      comments: [
        {
          id: 6,
          user: users[1].id,
          content: "You're such an inspiration! I need to get back to the gym 💪",
          createdAt: new Date('2024-12-01T16:30:00'),
          userInfo: { ...users[1], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-01T16:00:00')
    },
    {
      id: currentPostId++,
      user: users[4].id,
      content: "Just arrived in Bali! The sunset here is absolutely breathtaking 🌅 Sometimes you need to step away from the screen and experience the real world. Nature is the best inspiration!",
      image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800&h=600&fit=crop',
      likes: [users[0].id, users[2].id, users[3].id, users[1].id],
      comments: [
        {
          id: 7,
          user: users[2].id,
          content: "Wow! That's gorgeous! Have an amazing trip! 🏝️",
          createdAt: new Date('2024-12-01T18:30:00'),
          userInfo: { ...users[2], password: undefined }
        },
        {
          id: 8,
          user: users[0].id,
          content: "Living the dream! Take lots of photos for us 📸",
          createdAt: new Date('2024-12-01T18:45:00'),
          userInfo: { ...users[0], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-01T18:00:00')
    },
    {
      id: currentPostId++,
      user: users[1].id,
      content: "Late night coding session ☕💻 There's something magical about writing code when the world is quiet. What's everyone else working on tonight?",
      image: null,
      likes: [users[0].id, users[2].id],
      comments: [
        {
          id: 9,
          user: users[0].id,
          content: "Night owl crew! I'm working on some digital paintings 🎨",
          createdAt: new Date('2024-12-01T23:15:00'),
          userInfo: { ...users[0], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-01T23:00:00')
    },
    {
      id: currentPostId++,
      user: users[2].id,
      content: "Sunday vibes 🎶 Writing lyrics for my next song. Music is like painting with sound - every note tells a story. What song is stuck in your head today?",
      image: null,
      likes: [users[3].id, users[4].id],
      comments: [],
      createdAt: new Date('2024-12-02T09:00:00')
    },
    {
      id: currentPostId++,
      user: users[3].id,
      content: "Healthy meal prep Sunday! 🥗🍎 Preparing nutritious meals for the week ahead. Your body is your temple - treat it well! Who else is meal prepping today?",
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
      likes: [users[0].id, users[1].id],
      comments: [
        {
          id: 10,
          user: users[1].id,
          content: "I should really start meal prepping... any beginner tips?",
          createdAt: new Date('2024-12-02T10:30:00'),
          userInfo: { ...users[1], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-02T10:00:00')
    },
    {
      id: currentPostId++,
      user: users[0].id,
      content: "Working on some new character designs for my upcoming graphic novel! ✨ The creative process is so fulfilling 🎨",
      image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop',
      likes: [users[2].id, users[4].id],
      comments: [
        {
          id: 11,
          user: users[4].id,
          content: "Your art style is so unique! Can't wait to see the finished novel 📚",
          createdAt: new Date('2024-12-02T15:30:00'),
          userInfo: { ...users[4], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-02T15:00:00')
    },
    {
      id: currentPostId++,
      user: users[1].id,
      content: "New setup is finally complete! 💻⚡ Nothing beats a clean, organized workspace for maximum productivity 🚀",
      image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&h=600&fit=crop',
      likes: [users[0].id, users[3].id, users[4].id],
      comments: [
        {
          id: 12,
          user: users[0].id,
          content: "That setup looks amazing! What monitors are you using?",
          createdAt: new Date('2024-12-02T20:15:00'),
          userInfo: { ...users[0], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-02T20:00:00')
    },
    {
      id: currentPostId++,
      user: users[2].id,
      content: "Jamming with friends tonight! 🎸🎤 Music brings people together like nothing else can ✨",
      image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=800&h=600&fit=crop',
      likes: [users[1].id, users[3].id],
      comments: [],
      createdAt: new Date('2024-12-02T22:00:00')
    },
    {
      id: currentPostId++,
      user: users[4].id,
      content: "Exploring the local markets in Bali 🌺 The colors, smells, and energy here are incredible! #TravelLife",
      image: 'https://images.unsplash.com/photo-1555400291-2e467d3a4c8f?w=800&h=600&fit=crop',
      likes: [users[0].id, users[1].id, users[2].id],
      comments: [
        {
          id: 13,
          user: users[1].id,
          content: "The colors in this photo are amazing! 🌈",
          createdAt: new Date('2024-12-02T18:45:00'),
          userInfo: { ...users[1], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-02T18:30:00')
    },
    {
      id: currentPostId++,
      user: users[3].id,
      content: "Morning yoga session by the beach 🧘‍♀️ Starting the day with mindfulness and gratitude 🌅",
      image: 'https://images.unsplash.com/photo-1506629905607-cc234cdb62e5?w=800&h=600&fit=crop',
      likes: [users[0].id, users[2].id, users[4].id],
      comments: [
        {
          id: 14,
          user: users[2].id,
          content: "So peaceful! I need to start doing morning yoga too 🧘‍♂️",
          createdAt: new Date('2024-12-03T07:15:00'),
          userInfo: { ...users[2], password: undefined }
        }
      ],
      createdAt: new Date('2024-12-03T07:00:00')
    }
  ];

  posts.push(...samplePosts);
}

// Stories API Endpoints

// Get all active stories (not expired)
app.get('/api/stories', (req, res) => {
  try {
    const now = new Date();
    const activeStories = stories.filter(story => {
      const storyAge = now - new Date(story.createdAt);
      return storyAge < 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    });

    // Group stories by user
    const userStoriesMap = {};
    activeStories.forEach(story => {
      if (!userStoriesMap[story.user]) {
        userStoriesMap[story.user] = {
          user: users.find(u => u.id === story.user),
          stories: []
        };
      }
      userStoriesMap[story.user].stories.push(story);
    });

    // Convert to array and sort by latest story
    const userStoriesArray = Object.values(userStoriesMap)
      .sort((a, b) => new Date(b.stories[0].createdAt) - new Date(a.stories[0].createdAt));

    res.json(userStoriesArray);
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Upload new story
app.post('/api/stories', authenticateUser, upload.single('story'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    const mediaUrl = `/uploads/${req.file.filename}`;

    const newStory = {
      id: currentStoryId++,
      user: req.session.userId,
      type: fileType,
      mediaUrl: mediaUrl,
      createdAt: new Date(),
      views: []
    };

    stories.push(newStory);
    res.json({ message: 'Story uploaded successfully', story: newStory });
  } catch (error) {
    console.error('Upload story error:', error);
    res.status(500).json({ error: 'Failed to upload story' });
  }
});

// Mark story as viewed
app.post('/api/stories/:id/view', authenticateUser, (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    const story = stories.find(s => s.id === storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (!story.views.includes(userId)) {
      story.views.push(userId);
    }

    res.json({ message: 'Story marked as viewed' });
  } catch (error) {
    console.error('Mark story as viewed error:', error);
    res.status(500).json({ error: 'Failed to mark story as viewed' });
  }
});

// Delete story (own stories only)
app.delete('/api/stories/:id', authenticateUser, (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    const storyIndex = stories.findIndex(s => s.id === storyId && s.user === userId);
    if (storyIndex === -1) {
      return res.status(404).json({ error: 'Story not found or unauthorized' });
    }

    stories.splice(storyIndex, 1);
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// Clean up expired stories (runs periodically)
function cleanupExpiredStories() {
  const now = new Date();
  const initialCount = stories.length;
  
  stories = stories.filter(story => {
    const storyAge = now - new Date(story.createdAt);
    return storyAge < 24 * 60 * 60 * 1000; // Keep stories less than 24 hours old
  });
  
  const removedCount = initialCount - stories.length;
  if (removedCount > 0) {
    console.log(`🧹 Cleaned up ${removedCount} expired stories`);
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredStories, 60 * 60 * 1000);

// Add sample stories data
function initializeSampleStories() {
  const sampleStories = [
    {
      id: currentStoryId++,
      user: users[1].id, // Alice
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=700&fit=crop',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      views: [],
      reactions: []
    },
    {
      id: currentStoryId++,
      user: users[1].id, // Alice - second story
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&fit=crop&q=80',
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      views: [],
      reactions: []
    },
    {
      id: currentStoryId++,
      user: users[2].id, // Bob - fitness story
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=700&fit=crop&q=80',
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      views: [],
      reactions: []
    },
    {
      id: currentStoryId++,
      user: users[3].id, // Charlie - coffee story
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=700&fit=crop&q=80',
      createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      views: [],
      reactions: []
    },
    {
      id: currentStoryId++,
      user: users[2].id, // Bob
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=700&fit=crop',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      views: [],
      reactions: []
    },
    {
      id: currentStoryId++,
      user: users[2].id, // Bob - tech story
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=700&fit=crop',
      createdAt: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
      views: [],
      reactions: []
    },
    {
      id: currentStoryId++,
      user: users[3].id, // Charlie
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=700&fit=crop',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      views: [],
      reactions: []
    },
    {
      id: currentStoryId++,
      user: users[3].id, // Charlie - music story
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=700&fit=crop',
      createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      views: [],
      reactions: []
    },
    {
      id: currentStoryId++,
      user: users[0].id, // Alex (first user)
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&fit=crop',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      views: [],
      reactions: []
    },
    {
      id: currentStoryId++,
      user: users[1].id, // Alice - third story
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=700&fit=crop',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      views: [],
      reactions: []
    }
  ];

  stories.push(...sampleStories);
}

// Add story reaction endpoint
app.post('/api/stories/:id/react', authenticateUser, (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.session.userId;
    const { reaction } = req.body;
    
    const story = stories.find(s => s.id === storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (!story.reactions) {
      story.reactions = [];
    }

    // Remove existing reaction from this user
    story.reactions = story.reactions.filter(r => r.user !== userId);
    
    // Add new reaction
    if (reaction) {
      story.reactions.push({
        user: userId,
        reaction: reaction,
        createdAt: new Date()
      });
    }

    res.json({ message: 'Reaction updated successfully' });
  } catch (error) {
    console.error('Story reaction error:', error);
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

// Reels API Endpoints
app.get('/api/reels', (req, res) => {
  try {
    const reelsWithUserInfo = reels.map(reel => ({
      ...reel,
      user: users.find(u => u.id === reel.user)
    }));
    res.json(reelsWithUserInfo);
  } catch (error) {
    console.error('Get reels error:', error);
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
});

app.post('/api/reels/:id/like', authenticateUser, (req, res) => {
  try {
    const reelId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    const reel = reels.find(r => r.id === reelId);
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    const likeIndex = reel.likes.indexOf(userId);
    if (likeIndex > -1) {
      reel.likes.splice(likeIndex, 1);
      res.json({ message: 'Reel unliked', liked: false, likeCount: reel.likes.length });
    } else {
      reel.likes.push(userId);
      res.json({ message: 'Reel liked', liked: true, likeCount: reel.likes.length });
    }
  } catch (error) {
    console.error('Like reel error:', error);
    res.status(500).json({ error: 'Failed to update like' });
  }
});

app.post('/api/reels/:id/comment', authenticateUser, (req, res) => {
  try {
    const reelId = parseInt(req.params.id);
    const userId = req.session.userId;
    const { content } = req.body;
    
    const reel = reels.find(r => r.id === reelId);
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    const user = users.find(u => u.id === userId);
    const newComment = {
      id: Date.now(),
      user: userId,
      content: content,
      createdAt: new Date(),
      userInfo: { ...user, password: undefined }
    };

    reel.comments.push(newComment);
    res.json({ message: 'Comment added successfully', comment: newComment });
  } catch (error) {
    console.error('Add reel comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Add sample reels data
function initializeSampleReels() {
  const sampleReels = [
    {
      id: currentReelId++,
      user: users[1].id, // Alice
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=700&fit=crop',
      description: 'Beautiful nature adventure! 🌸🐰 Love this animation style 🎨 #animation #nature #adventure',
      likes: [users[2].id, users[3].id, users[4].id],
      comments: [
        {
          id: 1,
          user: users[2].id,
          content: 'This is so cute! 😍🐰',
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
          userInfo: { ...users[2], password: undefined }
        },
        {
          id: 2,
          user: users[3].id,
          content: 'Amazing quality! 🔥',
          createdAt: new Date(Date.now() - 15 * 60 * 1000),
          userInfo: { ...users[3], password: undefined }
        }
      ],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: currentReelId++,
      user: users[2].id, // Bob
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=700&fit=crop',
      description: 'Mind-bending sci-fi short! 🚀✨ Technology meets imagination 💭 #scifi #tech #future #innovation',
      likes: [users[1].id, users[3].id, users[0].id],
      comments: [
        {
          id: 3,
          user: users[1].id,
          content: 'This blew my mind! 🤯',
          createdAt: new Date(Date.now() - 45 * 60 * 1000),
          userInfo: { ...users[1], password: undefined }
        }
      ],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    },
    {
      id: currentReelId++,
      user: users[3].id, // Charlie
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=700&fit=crop',
      description: 'Epic adventure vibes! 🔥🏔️ Music and visuals in perfect harmony 🎵 #music #adventure #epic',
      likes: [users[1].id, users[2].id, users[0].id],
      comments: [
        {
          id: 4,
          user: users[1].id,
          content: 'The soundtrack is incredible! 🎵✨',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          userInfo: { ...users[1], password: undefined }
        },
        {
          id: 5,
          user: users[2].id,
          content: 'Perfect for inspiration! 🙌',
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
          userInfo: { ...users[2], password: undefined }
        }
      ],
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
    },
    {
      id: currentReelId++,
      user: users[0].id, // Alex
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&fit=crop',
      description: 'Dreaming of travel adventures! ✈️🌍 Where should I go next? #travel #adventure #wanderlust',
      likes: [users[1].id, users[2].id, users[3].id, users[0].id],
      comments: [
        {
          id: 6,
          user: users[2].id,
          content: 'Take me with you! 🙋‍♂️✈️',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          userInfo: { ...users[2], password: undefined }
        }
      ],
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000)
    },
    {
      id: currentReelId++,
      user: users[2].id, // Bob - second reel
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=700&fit=crop',
      description: 'Life is all about having fun! 🎉🌈 Spread positivity everywhere ✨ #positivity #fun #life',
      likes: [users[1].id, users[2].id, users[3].id],
      comments: [
        {
          id: 7,
          user: users[3].id,
          content: 'You always make me smile! 😊🌟',
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          userInfo: { ...users[3], password: undefined }
        }
      ],
      createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000)
    },
    {
      id: currentReelId++,
      user: users[1].id, // Alice - second reel
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&fit=crop',
      description: 'Road trip memories! 🚗💨 The journey is the destination 🛣️ Life is an adventure! #roadtrip #memories #freedom #adventure',
      likes: [users[2].id, users[0].id, users[1].id],
      comments: [],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
    },
    {
      id: currentReelId++,
      user: users[3].id, // Charlie - second reel
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=700&fit=crop',
      description: 'Off-road adventures! 🚙⛰️ Nature calls and I must go! Perfect weekend vibes 🌲 #offroad #adventure #nature #weekend',
      likes: [users[0].id, users[1].id],
      comments: [
        {
          id: 8,
          user: users[0].id,
          content: 'This looks incredible! 🤩🏔️',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          userInfo: { ...users[0], password: undefined }
        }
      ],
      createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000)
    },
    {
      id: currentReelId++,
      user: users[0].id, // Alex - second reel
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=400&h=700&fit=crop',
      description: 'Epic sci-fi vibes! 🚀✨ The future is here and it looks amazing! Technology meets art 🎭 #scifi #future #technology #art',
      likes: [users[1].id, users[2].id, users[3].id],
      comments: [
        {
          id: 9,
          user: users[2].id,
          content: 'The visual effects are insane! 🤯🔥',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          userInfo: { ...users[2], password: undefined }
        }
      ],
      createdAt: new Date(Date.now() - 16 * 60 * 60 * 1000)
    }
  ];

  reels.push(...sampleReels);
}

// Follow/Unfollow user
app.post('/api/users/:id/follow', authenticateUser, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const currentUserId = req.session.userId;
    
    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    
    const currentUser = users.find(u => u.id === currentUserId);
    const targetUser = users.find(u => u.id === targetUserId);
    
    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isFollowing = currentUser.following.includes(targetUserId);
    
    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id !== currentUserId);
      res.json({ message: 'Unfollowed successfully', following: false });
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
      res.json({ message: 'Following successfully', following: true });
    }
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    res.status(500).json({ error: 'Failed to update follow status' });
  }
});

// Initialize sample data on server start
initializeSampleData();
initializeSampleStories();
initializeSampleReels();

app.listen(PORT, () => {
  console.log(`🚀 TiVaa Social Media Platform running on http://localhost:${PORT}`);
  console.log(`📱 Features: User profiles, Posts, Comments, Likes, Follow system, Stories`);
});