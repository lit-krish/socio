# 🌟 SocialConnect - Beautiful Social Media Platform

A stunning, feature-rich social media platform built with modern web technologies. Experience the perfect blend of functionality and beauty!

## ✨ Features

### 🎨 **Beautiful Design**
- Colorful gradient backgrounds with animations
- Modern glassmorphism UI elements
- Responsive design for all devices
- Dark mode support
- Smooth animations and transitions

### 👥 **User Management**
- User registration and authentication
- Profile creation with bio and avatar
- Profile editing functionality
- User search and discovery

### 📱 **Social Features**
- Create posts with text and images
- Like and comment on posts
- Follow/unfollow users
- Real-time feed updates
- User profiles with post history

### 🔧 **Technical Features**
- Express.js backend with RESTful API
- File upload with Multer
- Session-based authentication
- In-memory storage (easily switchable to MongoDB)
- Beautiful, responsive frontend

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone or download the project**
   ```bash
   cd Social_Media_Platform(1)_CodeAlpha
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create sample images** (optional)
   ```bash
   node create-sample-images.js
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎯 Demo Users

The platform comes with pre-loaded demo users for testing:

| Username | Password | Role |
|----------|----------|------|
| alice_wonder | password123 | Digital Artist |
| bob_builder | password123 | Software Engineer |
| charlie_music | password123 | Musician |
| diana_fitness | password123 | Fitness Coach |
| ethan_travel | password123 | Travel Blogger |

## 📁 Project Structure

```
Social_Media_Platform(1)_CodeAlpha/
├── server.js                 # Express server and API routes
├── package.json              # Dependencies and scripts
├── public/                   # Frontend files
│   ├── index.html           # Main HTML file
│   ├── styles.css           # Beautiful CSS with animations
│   └── script.js            # Frontend JavaScript
├── uploads/                 # User uploaded files
└── README.md               # This file
```

## 🛠️ API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Posts
- `GET /api/feed` - Get all posts
- `POST /api/posts` - Create new post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comment` - Add comment

### Users
- `GET /api/users` - Get all users (for search)
- `GET /api/profile/:username` - Get user profile
- `PUT /api/profile` - Update user profile
- `POST /api/users/:username/follow` - Follow/unfollow user

## 🎨 Customization

### Colors and Themes
The platform uses CSS custom properties for easy theming. Main colors:
- Primary: `#667eea` (Purple-blue gradient)
- Secondary: `#764ba2` (Deep purple)
- Accent colors: Various vibrant colors for different elements

### Adding New Features
1. **Backend**: Add new routes in `server.js`
2. **Frontend**: Add new functions in `script.js`
3. **Styling**: Update `styles.css` with new styles

## 🔧 Configuration

### Database
By default, the app uses in-memory storage. To use MongoDB:

1. Install MongoDB locally or use MongoDB Atlas
2. Update the connection string in `server.js`
3. The app will automatically switch to MongoDB when available

### File Upload
- Maximum file size: 5MB
- Supported formats: Images (jpg, png, gif, etc.)
- Files are stored in the `uploads/` directory

## 📱 Mobile Responsive

The platform is fully responsive and works beautifully on:
- 📱 Mobile phones
- 📱 Tablets
- 💻 Laptops
- 🖥️ Desktop computers

## 🎭 Features Demo

### 🔐 Authentication
- Beautiful login/register modals
- Form validation
- Session management
- Auto-login persistence

### 📝 Post Creation
- Rich text posting
- Image upload with preview
- Instant post publishing
- Real-time feed updates

### 💬 Social Interactions
- One-click like/unlike
- Comment threads
- User following system
- Profile browsing

### 🔍 Search & Discovery
- Real-time user search
- Profile discovery
- Follow suggestions
- User recommendations

## 🚀 Performance

- **Fast Loading**: Optimized assets and code
- **Smooth Animations**: Hardware-accelerated CSS
- **Responsive Design**: Mobile-first approach
- **Efficient API**: RESTful endpoints with proper caching

## 🎨 Design Highlights

- **Glassmorphism**: Modern frosted glass effects
- **Gradient Animations**: Dynamic color transitions
- **Micro-interactions**: Delightful hover effects
- **Typography**: Beautiful font combinations
- **Color Psychology**: Carefully chosen color palettes

## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication
- File upload validation
- XSS protection
- CSRF protection ready

## 🌐 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ⚠️ Internet Explorer (not supported)

## 📈 Future Enhancements

- [ ] Real-time notifications
- [ ] Video upload support
- [ ] Stories feature
- [ ] Direct messaging
- [ ] Advanced search filters
- [ ] Content moderation
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎉 Acknowledgments

- Font Awesome for beautiful icons
- Google Fonts for typography
- Modern CSS techniques for animations
- Express.js community for excellent documentation

---

**Built with ❤️ for CodeAlpha**

*Experience the future of social media with SocialConnect!*