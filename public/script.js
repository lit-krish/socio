// Global variables
let currentUser = null;
let currentViewingUser = null;
let posts = [];
let users = [];
let stories = [];
let currentStoryIndex = 0;
let currentUserStories = [];
let storyTimer = null;
let storyMuted = false;
let reels = [];
let currentReelIndex = 0;
let reelsObserver = null;

// DOM Elements
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const navbar = document.getElementById('navbar');
const feedPage = document.getElementById('feedPage');
const profilePage = document.getElementById('profilePage');
const userProfilePage = document.getElementById('userProfilePage');
const editProfileModal = document.getElementById('editProfileModal');
const toastContainer = document.getElementById('toastContainer');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    loadUsers();
});

// Check if user is authenticated
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            currentUser = await response.json();
            showMainApp();
            loadFeed();
        } else {
            showAuthModal();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showAuthModal();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth modal events
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    document.getElementById('closeAuthModal').addEventListener('click', () => {
        // Don't allow closing if not authenticated
        if (currentUser) {
            authModal.style.display = 'none';
        }
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Create post
    document.getElementById('createPostBtn').addEventListener('click', createPost);
    document.getElementById('postImage').addEventListener('change', handleImagePreview);
    document.getElementById('removeImage').addEventListener('click', removeImagePreview);

    // Profile editing
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        showEditProfileModal();
    });

    document.getElementById('closeEditModal').addEventListener('click', () => {
        editProfileModal.style.display = 'none';
    });

    document.getElementById('editProfileForm').addEventListener('submit', handleProfileUpdate);

    // Avatar upload
    document.getElementById('avatarUpload').addEventListener('change', handleAvatarUpload);

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('searchInput').addEventListener('focus', () => {
        document.getElementById('searchResults').style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-search')) {
            document.getElementById('searchResults').style.display = 'none';
        }
    });

    // User profile navigation
    document.getElementById('backToFeedBtn').addEventListener('click', () => {
        navigateTo('feed');
    });

    document.getElementById('followBtn').addEventListener('click', handleFollow);
}

// Authentication functions
function showAuthModal() {
    authModal.style.display = 'flex';
    navbar.style.display = 'none';
}

function hideAuthModal() {
    authModal.style.display = 'none';
    navbar.style.display = 'block';
}

function showLoginForm() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    document.getElementById('authTitle').textContent = 'Welcome Back!';
}

function showRegisterForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    document.getElementById('authTitle').textContent = 'Join TiVaa!';
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const loginData = {
        username: document.getElementById('loginUsername').value,
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (response.ok) {
            currentUser = result.user;
            showToast('Login successful! Welcome back!', 'success');
            hideAuthModal();
            showMainApp();
            loadFeed();
        } else {
            showToast(result.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const registerData = {
        username: document.getElementById('registerUsername').value,
        email: document.getElementById('registerEmail').value,
        fullName: document.getElementById('registerFullName').value,
        password: document.getElementById('registerPassword').value
    };

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });

        const result = await response.json();

        if (response.ok) {
            currentUser = result.user;
            showToast('Registration successful! Welcome to SocialConnect!', 'success');
            hideAuthModal();
            showMainApp();
            loadFeed();
        } else {
            showToast(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        showToast('Logged out successfully!', 'success');
        showAuthModal();
        // Clear all pages
        feedPage.style.display = 'none';
        profilePage.style.display = 'none';
        userProfilePage.style.display = 'none';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Main app functions
function showMainApp() {
    navbar.style.display = 'block';
    document.getElementById('currentUserAvatar').src = currentUser.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face';
    navigateTo('feed');
}

function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected page
    switch(page) {
        case 'feed':
            feedPage.style.display = 'block';
            document.querySelector('[data-page="feed"]').classList.add('active');
            loadFeed();
            break;
        case 'reels':
            document.getElementById('reelsPage').style.display = 'block';
            document.querySelector('[data-page="reels"]').classList.add('active');
            loadReels();
            break;
        case 'profile':
            profilePage.style.display = 'block';
            document.querySelector('[data-page="profile"]').classList.add('active');
            loadUserProfile(currentUser.username, true);
            break;
    }
}

// Feed functions
async function loadFeed() {
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i>Loading posts...</div>';

    try {
        const response = await fetch('/api/feed');
        if (response.ok) {
            posts = await response.json();
            displayPosts(posts, postsContainer);
        } else {
            postsContainer.innerHTML = '<div class="loading">Failed to load posts</div>';
        }
    } catch (error) {
        console.error('Feed loading error:', error);
        postsContainer.innerHTML = '<div class="loading">Network error</div>';
    }
}

function displayPosts(posts, container) {
    if (posts.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-heart"></i>
                No posts yet. Be the first to share something!
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => createPostHTML(post)).join('');
    
    // Add event listeners to post actions
    container.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const postId = e.target.closest('[data-post-id]').dataset.postId;
            toggleLike(postId);
        });
    });

    container.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const postId = e.target.closest('[data-post-id]').dataset.postId;
            const input = e.target.querySelector('input');
            if (input.value.trim()) {
                addComment(postId, input.value.trim());
                input.value = '';
            }
        });
    });

    // Add click handlers for user profiles
    container.querySelectorAll('.post-user').forEach(userEl => {
        userEl.addEventListener('click', (e) => {
            e.preventDefault();
            const username = userEl.dataset.username;
            if (username !== currentUser.username) {
                showUserProfile(username);
            }
        });
    });

    // Add delete post handlers
    container.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const postCard = e.target.closest('.post-card');
            const postId = postCard.dataset.postId;
            
            if (confirm('Are you sure you want to delete this post?')) {
                await deletePost(postId);
            }
        });
    });
}

function createPostHTML(post) {
    const isLiked = post.likes.includes(currentUser.id);
    const timeAgo = getTimeAgo(new Date(post.createdAt));
    const isOwnPost = post.user.id === currentUser.id;
    
    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-user" data-username="${post.user.username}" style="cursor: pointer;">
                <img src="${post.user.profileImage}" alt="${post.user.fullName}" class="avatar" onerror="this.src='https://via.placeholder.com/50x50/8b8bff/ffffff?text=${post.user.fullName.charAt(0)}'">
                <div class="post-user-info">
                    <h4>${post.user.fullName}</h4>
                    <p class="username">@${post.user.username}</p>
                </div>
                <div class="post-header-right">
                    <span class="post-time">${timeAgo}</span>
                    ${isOwnPost ? `<button class="delete-post-btn" title="Delete Post"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="post-content">${post.content}</div>
            ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image" onerror="this.style.display='none'">` : ''}
            <div class="post-stats">
                <div class="post-stat">
                    <i class="fas fa-heart"></i>
                    <span>${post.likes.length} likes</span>
                </div>
                <div class="post-stat">
                    <i class="fas fa-comment"></i>
                    <span>${post.comments.length} comments</span>
                </div>
            </div>
            <div class="post-actions-buttons">
                <button class="like-btn ${isLiked ? 'liked' : ''}">
                    <i class="fas fa-heart"></i>
                    ${isLiked ? 'Liked' : 'Like'}
                </button>
                <button class="comment-btn">
                    <i class="fas fa-comment"></i>
                    Comment
                </button>
            </div>
            <div class="comments-section">
                ${post.comments.map(comment => `
                    <div class="comment">
                        <img src="${comment.userInfo.profileImage}" alt="${comment.userInfo.fullName}" class="comment-avatar" onerror="this.src='https://via.placeholder.com/35x35/667eea/ffffff?text=${comment.userInfo.fullName.charAt(0)}'">
                        <div class="comment-content">
                            <div class="comment-user">${comment.userInfo.fullName}</div>
                            <div class="comment-text">${comment.content}</div>
                        </div>
                    </div>
                `).join('')}
                <form class="comment-form">
                    <img src="${currentUser.profileImage}" alt="Your avatar" class="comment-avatar" onerror="this.src='https://via.placeholder.com/35x35/667eea/ffffff?text=${currentUser.fullName.charAt(0)}'">
                    <input type="text" placeholder="Write a comment..." required>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
    `;
}

// Delete post function
async function deletePost(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Post deleted successfully!', 'success');
            loadFeed();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to delete post', 'error');
        }
    } catch (error) {
        console.error('Delete post error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Post creation
async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    const imageFile = document.getElementById('postImage').files[0];

    if (!content) {
        showToast('Please write something to share!', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('content', content);
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            document.getElementById('postContent').value = '';
            document.getElementById('postImage').value = '';
            removeImagePreview();
            showToast('Post created successfully!', 'success');
            loadFeed();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to create post', 'error');
        }
    } catch (error) {
        console.error('Post creation error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removeImagePreview() {
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('postImage').value = '';
}

// Like and comment functions
async function toggleLike(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            const likeBtn = postCard.querySelector('.like-btn');
            const likesCount = postCard.querySelector('.post-stat i.fa-heart').nextElementSibling;
            
            if (result.liked) {
                likeBtn.classList.add('liked');
                likeBtn.innerHTML = '<i class="fas fa-heart"></i> Liked';
            } else {
                likeBtn.classList.remove('liked');
                likeBtn.innerHTML = '<i class="fas fa-heart"></i> Like';
            }
            
            likesCount.textContent = `${result.likesCount} likes`;
        }
    } catch (error) {
        console.error('Like error:', error);
        showToast('Failed to update like', 'error');
    }
}

async function addComment(postId, content) {
    try {
        const response = await fetch(`/api/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            const result = await response.json();
            loadFeed(); // Reload to show new comment
            showToast('Comment added!', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Comment error:', error);
        showToast('Failed to add comment', 'error');
    }
}

// Profile functions
async function loadUserProfile(username, isOwnProfile = false) {
    try {
        const response = await fetch(`/api/profile/${username}`);
        if (response.ok) {
            const profileData = await response.json();
            
            if (isOwnProfile) {
                displayOwnProfile(profileData);
            } else {
                displayUserProfile(profileData);
            }
        } else {
            showToast('User not found', 'error');
        }
    } catch (error) {
        console.error('Profile loading error:', error);
        showToast('Failed to load profile', 'error');
    }
}

function displayOwnProfile(profileData) {
    document.getElementById('profileName').textContent = profileData.user.fullName;
    document.getElementById('profileUsername').textContent = `@${profileData.user.username}`;
    document.getElementById('profileBio').textContent = profileData.user.bio || 'No bio yet';
    document.getElementById('profileAvatar').src = profileData.user.profileImage;
    document.getElementById('postsCount').textContent = profileData.postsCount;
    document.getElementById('followersCount').textContent = profileData.followersCount;
    document.getElementById('followingCount').textContent = profileData.followingCount;
    
    // Display user's posts
    const profilePostsContainer = document.getElementById('profilePosts');
    if (profileData.posts.length > 0) {
        // Need to add user info to posts for display
        const postsWithUserInfo = profileData.posts.map(post => ({
            ...post,
            user: profileData.user
        }));
        displayPosts(postsWithUserInfo, profilePostsContainer);
    } else {
        profilePostsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-camera"></i>
                No posts yet. Share your first post!
            </div>
        `;
    }
}

function displayUserProfile(profileData) {
    currentViewingUser = profileData.user;
    
    document.getElementById('userProfileName').textContent = profileData.user.fullName;
    document.getElementById('userProfileUsername').textContent = `@${profileData.user.username}`;
    document.getElementById('userProfileBio').textContent = profileData.user.bio || 'No bio yet';
    document.getElementById('userProfileAvatar').src = profileData.user.profileImage;
    document.getElementById('userPostsCount').textContent = profileData.postsCount;
    document.getElementById('userFollowersCount').textContent = profileData.followersCount;
    document.getElementById('userFollowingCount').textContent = profileData.followingCount;
    
    // Update follow button
    const followBtn = document.getElementById('followBtn');
    const isFollowing = currentUser.following.includes(profileData.user.id);
    
    if (isFollowing) {
        followBtn.innerHTML = '<i class="fas fa-user-minus"></i> Unfollow';
        followBtn.classList.remove('btn-primary');
        followBtn.classList.add('btn-secondary');
    } else {
        followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
        followBtn.classList.remove('btn-secondary');
        followBtn.classList.add('btn-primary');
    }
    
    // Display user's posts
    const userProfilePostsContainer = document.getElementById('userProfilePosts');
    if (profileData.posts.length > 0) {
        const postsWithUserInfo = profileData.posts.map(post => ({
            ...post,
            user: profileData.user
        }));
        displayPosts(postsWithUserInfo, userProfilePostsContainer);
    } else {
        userProfilePostsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-camera"></i>
                No posts yet.
            </div>
        `;
    }
}

function showUserProfile(username) {
    userProfilePage.style.display = 'block';
    feedPage.style.display = 'none';
    profilePage.style.display = 'none';
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    loadUserProfile(username, false);
}

// Follow functionality
async function handleFollow() {
    if (!currentViewingUser) return;
    
    try {
        const response = await fetch(`/api/users/${currentViewingUser.username}/follow`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            const followBtn = document.getElementById('followBtn');
            
            if (result.following) {
                followBtn.innerHTML = '<i class="fas fa-user-minus"></i> Unfollow';
                followBtn.classList.remove('btn-primary');
                followBtn.classList.add('btn-secondary');
                currentUser.following.push(currentViewingUser.id);
                showToast(`You are now following ${currentViewingUser.fullName}!`, 'success');
            } else {
                followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
                followBtn.classList.remove('btn-secondary');
                followBtn.classList.add('btn-primary');
                const index = currentUser.following.indexOf(currentViewingUser.id);
                if (index > -1) currentUser.following.splice(index, 1);
                showToast(`You unfollowed ${currentViewingUser.fullName}`, 'success');
            }
            
            // Update follower count
            loadUserProfile(currentViewingUser.username, false);
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update follow status', 'error');
        }
    } catch (error) {
        console.error('Follow error:', error);
        showToast('Failed to update follow status', 'error');
    }
}

// Profile editing
function showEditProfileModal() {
    document.getElementById('editFullName').value = currentUser.fullName;
    document.getElementById('editBio').value = currentUser.bio || '';
    editProfileModal.style.display = 'flex';
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('fullName', document.getElementById('editFullName').value);
    formData.append('bio', document.getElementById('editBio').value);

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            currentUser = result.user;
            editProfileModal.style.display = 'none';
            showToast('Profile updated successfully!', 'success');
            loadUserProfile(currentUser.username, true);
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showToast('Failed to update profile', 'error');
    }
}

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);
    formData.append('fullName', currentUser.fullName);
    formData.append('bio', currentUser.bio || '');

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            currentUser = result.user;
            document.getElementById('profileAvatar').src = currentUser.profileImage;
            document.getElementById('currentUserAvatar').src = currentUser.profileImage;
            showToast('Profile picture updated!', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update profile picture', 'error');
        }
    } catch (error) {
        console.error('Avatar upload error:', error);
        showToast('Failed to update profile picture', 'error');
    }
}

// Search functionality
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            users = await response.json();
        }
    } catch (error) {
        console.error('Users loading error:', error);
    }
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const searchResults = document.getElementById('searchResults');
    
    if (!query) {
        searchResults.style.display = 'none';
        return;
    }

    const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(query) ||
        user.fullName.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to 5 results

    if (filteredUsers.length > 0) {
        searchResults.innerHTML = filteredUsers.map(user => `
            <div class="search-result-item" data-username="${user.username}">
                <img src="${user.profileImage}" alt="${user.fullName}">
                <div>
                    <div style="font-weight: 600; color: #333;">${user.fullName}</div>
                    <div style="font-size: 12px; color: #667eea;">@${user.username}</div>
                </div>
            </div>
        `).join('');
        
        searchResults.style.display = 'block';
        
        // Add click handlers
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const username = item.dataset.username;
                document.getElementById('searchInput').value = '';
                searchResults.style.display = 'none';
                
                if (username === currentUser.username) {
                    navigateTo('profile');
                } else {
                    showUserProfile(username);
                }
            });
        });
    } else {
        searchResults.innerHTML = '<div class="search-result-item">No users found</div>';
        searchResults.style.display = 'block';
    }
}

// Utility functions
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Stories Functionality
async function loadStories() {
    try {
        const response = await fetch('/api/stories');
        if (response.ok) {
            stories = await response.json();
            displayStories();
        }
    } catch (error) {
        console.error('Load stories error:', error);
    }
}

function displayStories() {
    const storiesContainer = document.getElementById('storiesContainer');
    if (!storiesContainer) return;

    storiesContainer.innerHTML = '';

    // Update the "Your Story" avatar
    const userStoryAvatar = document.getElementById('userStoryAvatar');
    if (userStoryAvatar && currentUser) {
        userStoryAvatar.src = currentUser.profileImage || `https://via.placeholder.com/60x60/8b8bff/ffffff?text=${currentUser.fullName.charAt(0)}`;
    }

    stories.forEach(userStories => {
        const storyItem = document.createElement('div');
        storyItem.className = 'story-item';
        storyItem.onclick = () => openStoryViewer(userStories);

        const hasUnviewed = userStories.stories.some(story => !story.views.includes(currentUser.id));
        const avatarClass = hasUnviewed ? 'story-avatar' : 'story-avatar viewed';

        storyItem.innerHTML = `
            <div class="${avatarClass}">
                <img src="${userStories.user.profileImage || `https://via.placeholder.com/60x60/8b8bff/ffffff?text=${userStories.user.fullName.charAt(0)}`}" 
                     alt="${userStories.user.fullName}" 
                     onerror="this.src='https://via.placeholder.com/60x60/8b8bff/ffffff?text=${userStories.user.fullName.charAt(0)}'">
            </div>
            <span class="story-username">${userStories.user.fullName.split(' ')[0]}</span>
        `;

        storiesContainer.appendChild(storyItem);
    });
}

// Story Upload Functions
function openStoryUpload() {
    document.getElementById('storyUploadModal').style.display = 'flex';
    setupStoryUpload();
}

function closeStoryUpload() {
    document.getElementById('storyUploadModal').style.display = 'none';
    cancelStoryUpload();
}

function setupStoryUpload() {
    const uploadZone = document.getElementById('storyUploadZone');
    const fileInput = document.getElementById('storyFileInput');

    uploadZone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            previewStory(file);
        }
    };

    // Drag and drop functionality
    uploadZone.ondragover = (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#8b8bff';
        uploadZone.style.background = 'rgba(139, 139, 255, 0.1)';
    };

    uploadZone.ondragleave = (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(139, 139, 255, 0.5)';
        uploadZone.style.background = 'rgba(139, 139, 255, 0.05)';
    };

    uploadZone.ondrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            fileInput.files = e.dataTransfer.files;
            previewStory(file);
        }
        uploadZone.style.borderColor = 'rgba(139, 139, 255, 0.5)';
        uploadZone.style.background = 'rgba(139, 139, 255, 0.05)';
    };
}

function previewStory(file) {
    const uploadZone = document.getElementById('storyUploadZone');
    const preview = document.getElementById('storyPreview');
    const previewImg = document.getElementById('storyPreviewImg');
    const previewVideo = document.getElementById('storyPreviewVideo');

    uploadZone.style.display = 'none';
    preview.style.display = 'block';

    if (file.type.startsWith('image/')) {
        previewImg.src = URL.createObjectURL(file);
        previewImg.style.display = 'block';
        previewVideo.style.display = 'none';
    } else if (file.type.startsWith('video/')) {
        previewVideo.src = URL.createObjectURL(file);
        previewVideo.style.display = 'block';
        previewImg.style.display = 'none';
    }
}

function cancelStoryUpload() {
    const uploadZone = document.getElementById('storyUploadZone');
    const preview = document.getElementById('storyPreview');
    const previewImg = document.getElementById('storyPreviewImg');
    const previewVideo = document.getElementById('storyPreviewVideo');
    const fileInput = document.getElementById('storyFileInput');

    uploadZone.style.display = 'block';
    preview.style.display = 'none';
    previewImg.src = '';
    previewVideo.src = '';
    fileInput.value = '';
}

async function uploadStory() {
    const fileInput = document.getElementById('storyFileInput');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Please select a file to upload', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('story', file);

    try {
        const response = await fetch('/api/stories', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showToast('Story uploaded successfully!', 'success');
            closeStoryUpload();
            loadStories();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to upload story', 'error');
        }
    } catch (error) {
        console.error('Upload story error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Story Viewer Functions
function openStoryViewer(userStories) {
    currentUserStories = userStories.stories;
    currentStoryIndex = 0;
    document.getElementById('storyViewerModal').style.display = 'flex';
    
    // Add click to advance functionality
    const storyContent = document.querySelector('.story-content');
    const storyViewer = document.querySelector('.story-viewer');
    
    // Remove existing listeners
    storyContent.onclick = null;
    storyViewer.onclick = null;
    
    // Add click to advance
    storyContent.onclick = (e) => {
        e.stopPropagation();
        nextStory();
    };
    
    // Add keyboard navigation
    document.addEventListener('keydown', handleStoryKeyboard);
    
    showCurrentStory();
}

function handleStoryKeyboard(e) {
    if (document.getElementById('storyViewerModal').style.display === 'flex') {
        switch(e.key) {
            case 'ArrowLeft':
                previousStory();
                break;
            case 'ArrowRight':
            case ' ':
                e.preventDefault();
                nextStory();
                break;
            case 'Escape':
                closeStoryViewer();
                break;
        }
    }
}

function closeStoryViewer() {
    document.getElementById('storyViewerModal').style.display = 'none';
    if (storyTimer) {
        clearTimeout(storyTimer);
        storyTimer = null;
    }
    
    // Remove keyboard listener
    document.removeEventListener('keydown', handleStoryKeyboard);
    
    // Stop any playing video
    const video = document.getElementById('storyViewerVideo');
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
}

function showCurrentStory() {
    if (!currentUserStories || currentStoryIndex >= currentUserStories.length) {
        closeStoryViewer();
        return;
    }

    const story = currentUserStories[currentStoryIndex];
    const userStories = stories.find(us => us.stories.includes(story));
    const user = userStories?.user;

    if (!user) {
        console.error('User not found for story');
        closeStoryViewer();
        return;
    }

    // Update header
    document.getElementById('storyViewerAvatar').src = user.profileImage || `https://via.placeholder.com/40x40/8b8bff/ffffff?text=${user.fullName.charAt(0)}`;
    document.getElementById('storyViewerUsername').textContent = user.fullName;
    document.getElementById('storyViewerTime').textContent = getTimeAgo(new Date(story.createdAt));

    // Update content
    const img = document.getElementById('storyViewerImg');
    const video = document.getElementById('storyViewerVideo');

    if (story.type === 'image') {
        img.src = story.mediaUrl;
        img.style.display = 'block';
        video.style.display = 'none';
        video.pause();
        startStoryTimer(5000); // 5 seconds for images
    } else if (story.type === 'video') {
        video.src = story.mediaUrl;
        video.style.display = 'block';
        img.style.display = 'none';
        video.currentTime = 0;
        video.play().catch(error => {
            console.error('Video play error:', error);
            // If video fails, treat as image with longer duration
            startStoryTimer(8000);
        });
        video.onended = () => nextStory();
        // Clear any existing timer for videos
        if (storyTimer) {
            clearTimeout(storyTimer);
            storyTimer = null;
        }
    }

    // Update progress bar
    updateProgressBar();

    // Mark as viewed
    markStoryAsViewed(story.id);
}

function startStoryTimer(duration) {
    if (storyTimer) clearTimeout(storyTimer);
    storyTimer = setTimeout(() => {
        nextStory();
    }, duration);
}

function updateProgressBar() {
    const progressBar = document.getElementById('storyProgressBar');
    progressBar.classList.remove('animating');
    progressBar.offsetHeight; // Trigger reflow
    progressBar.classList.add('animating');
}

function nextStory() {
    currentStoryIndex++;
    if (currentStoryIndex >= currentUserStories.length) {
        closeStoryViewer();
    } else {
        showCurrentStory();
    }
}

function previousStory() {
    currentStoryIndex--;
    if (currentStoryIndex < 0) {
        currentStoryIndex = 0;
    } else {
        showCurrentStory();
    }
}

async function markStoryAsViewed(storyId) {
    try {
        await fetch(`/api/stories/${storyId}/view`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Mark story as viewed error:', error);
    }
}

// Update initialization to load stories
function initializeStories() {
    if (currentUser) {
        loadStories();
    }
}

// Add stories loading to the existing initialization
document.addEventListener('DOMContentLoaded', function() {
    // Existing initialization code will be called
    // Add stories initialization after login
    const originalShowPage = showPage;
    showPage = function(page) {
        originalShowPage.call(this, page);
        if (page === 'feed' && currentUser) {
            setTimeout(() => {
                loadStories();
            }, 500);
        } else if (page === 'reels' && currentUser) {
            setTimeout(() => {
                loadReels();
            }, 500);
        }
    };
});

// Story Reactions Functions
async function reactToStory(emoji) {
    if (!currentUserStories || !currentUserStories[currentStoryIndex]) {
        return;
    }
    
    const storyId = currentUserStories[currentStoryIndex].id;
    
    try {
        const response = await fetch(`/api/stories/${storyId}/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reaction: emoji })
        });
        
        if (response.ok) {
            // Add visual feedback
            showReactionFeedback(emoji);
            showToast(`Reacted with ${emoji}`, 'success');
        } else {
            showToast('Failed to add reaction', 'error');
        }
    } catch (error) {
        console.error('React to story error:', error);
        showToast('Network error', 'error');
    }
}

function showReactionFeedback(emoji) {
    const storyContent = document.querySelector('.story-content');
    const feedback = document.createElement('div');
    feedback.textContent = emoji;
    feedback.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 80px;
        z-index: 20;
        pointer-events: none;
        animation: reactionPop 1s ease-out forwards;
    `;
    
    // Add CSS animation
    if (!document.querySelector('#reaction-styles')) {
        const style = document.createElement('style');
        style.id = 'reaction-styles';
        style.textContent = `
            @keyframes reactionPop {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    storyContent.appendChild(feedback);
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
        }
    }, 1000);
}

function shareStory() {
    if (navigator.share) {
        navigator.share({
            title: 'Check out this story on TiVaa',
            text: 'Amazing story on TiVaa!',
            url: window.location.href
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('Link copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
    }
}

function downloadStory() {
    if (!currentUserStories || !currentUserStories[currentStoryIndex]) {
        return;
    }
    
    const story = currentUserStories[currentStoryIndex];
    const link = document.createElement('a');
    link.href = story.mediaUrl;
    link.download = `story-${story.id}.${story.type === 'image' ? 'jpg' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download started!', 'success');
}

// Reels Functions
async function loadReels() {
    try {
        const response = await fetch('/api/reels');
        if (response.ok) {
            reels = await response.json();
            displayReels();
        }
    } catch (error) {
        console.error('Load reels error:', error);
    }
}

function displayReels() {
    const reelsScroll = document.getElementById('reelsScroll');
    if (!reelsScroll) return;
    
    reelsScroll.innerHTML = '';
    
    reels.forEach((reel, index) => {
        const reelElement = createReelElement(reel, index);
        reelsScroll.appendChild(reelElement);
    });
    
    setupReelsScrolling();
}

function createReelElement(reel, index) {
    const reelDiv = document.createElement('div');
    reelDiv.className = 'reel-item';
    reelDiv.dataset.index = index;
    reelDiv.dataset.reelId = reel.id;
    
    const isLiked = reel.likes.includes(currentUser?.id);
    const isFollowing = currentUser?.following?.includes(reel.user.id);
    
    reelDiv.innerHTML = `
        <video class="reel-video" loop muted playsinline preload="metadata" poster="${reel.thumbnail}">
            <source src="${reel.videoUrl}" type="video/mp4">
        </video>
        
        <div class="reel-loading">
            <i class="fas fa-spinner"></i>
        </div>
        
        <div class="reel-overlay">
            <div class="reel-info">
                <div class="reel-user">
                    <img src="${reel.user.profileImage || `https://via.placeholder.com/35x35/8b8bff/ffffff?text=${reel.user.fullName.charAt(0)}`}" 
                         alt="${reel.user.fullName}" 
                         class="reel-avatar" 
                         onerror="this.src='https://via.placeholder.com/35x35/8b8bff/ffffff?text=${reel.user.fullName.charAt(0)}'">
                    <span class="reel-username">${reel.user.fullName}</span>
                    <button class="reel-follow-btn ${isFollowing ? 'following' : ''}" 
                            onclick="toggleFollowFromReel(${reel.user.id}, this)" 
                            ${reel.user.id === currentUser?.id ? 'style="display:none"' : ''}>
                        ${isFollowing ? 'Following' : 'Follow'}
                    </button>
                </div>
                <div class="reel-description">${reel.description}</div>
                <div class="reel-stats">
                    <span class="reel-time">${getTimeAgo(new Date(reel.createdAt))}</span>
                    <span class="reel-views">👁️ ${Math.floor(Math.random() * 10000) + 1000} views</span>
                </div>
                <div class="reel-music">
                    <i class="fas fa-music"></i>
                    <span>Original audio • ${reel.user.fullName}</span>
                </div>
            </div>
        </div>
        
        <div class="reel-actions">
            <div class="reel-action" onclick="toggleReelLike(${reel.id}, ${index})">
                <button class="reel-action-btn ${isLiked ? 'liked' : ''}" id="like-btn-${reel.id}">
                    <i class="fas fa-heart"></i>
                </button>
                <span class="reel-action-count" id="like-count-${reel.id}">${formatCount(reel.likes.length)}</span>
            </div>
            
            <div class="reel-action" onclick="openReelComments(${reel.id}, ${index})">
                <button class="reel-action-btn">
                    <i class="fas fa-comment"></i>
                </button>
                <span class="reel-action-count">${formatCount(reel.comments.length)}</span>
            </div>
            
            <div class="reel-action" onclick="shareReel(${reel.id})">
                <button class="reel-action-btn">
                    <i class="fas fa-share"></i>
                </button>
                <span class="reel-action-count">Share</span>
            </div>
            
            <div class="reel-action" onclick="toggleReelSound(${index})">
                <button class="reel-action-btn" id="sound-btn-${index}">
                    <i class="fas fa-volume-mute"></i>
                </button>
                <span class="reel-action-count">Sound</span>
            </div>
        </div>
        
        <!-- Double tap to like overlay -->
        <div class="reel-like-animation" style="display: none;">
            <i class="fas fa-heart"></i>
        </div>
    `;
    
    // Add double tap to like functionality
    let tapCount = 0;
    const video = reelDiv.querySelector('.reel-video');
    
    video.addEventListener('click', () => {
        tapCount++;
        setTimeout(() => {
            if (tapCount === 1) {
                // Single tap - pause/play
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            } else if (tapCount === 2) {
                // Double tap - like
                if (!isLiked) {
                    toggleReelLike(reel.id, index);
                    showLikeAnimation(reelDiv);
                }
            }
            tapCount = 0;
        }, 300);
    });
    
    return reelDiv;
}

function showLikeAnimation(reelElement) {
    const animation = reelElement.querySelector('.reel-like-animation');
    animation.style.display = 'block';
    animation.style.animation = 'likeAnimation 0.8s ease-out';
    
    setTimeout(() => {
        animation.style.display = 'none';
        animation.style.animation = '';
    }, 800);
}

function formatCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

function setupReelsScrolling() {
    const reelsScroll = document.getElementById('reelsScroll');
    if (!reelsScroll) return;
    
    // Remove existing observer
    if (reelsObserver) {
        reelsObserver.disconnect();
    }
    
    // Setup intersection observer for auto-play
    reelsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('.reel-video');
            const loading = entry.target.querySelector('.reel-loading');
            
            if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
                // Play video when in view
                currentReelIndex = parseInt(entry.target.dataset.index);
                
                // Pause all other videos first
                document.querySelectorAll('.reel-video').forEach(v => {
                    if (v !== video) v.pause();
                });
                
                video.currentTime = 0; // Start from beginning
                video.play().then(() => {
                    loading.style.display = 'none';
                    showReelProgress(video);
                }).catch(error => {
                    console.log('Auto-play prevented:', error);
                    loading.style.display = 'none';
                    // Show play button overlay
                    showPlayButton(entry.target);
                });
            } else {
                // Pause video when out of view
                video.pause();
                hideReelProgress();
            }
        });
    }, {
        threshold: 0.7
    });
    
    // Observe all reel items
    const reelItems = reelsScroll.querySelectorAll('.reel-item');
    reelItems.forEach(item => {
        reelsObserver.observe(item);
    });
}

async function toggleReelLike(reelId, index) {
    try {
        const response = await fetch(`/api/reels/${reelId}/like`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update UI
            const reelElement = document.querySelector(`[data-index="${index}"]`);
            const likeBtn = reelElement.querySelector('.reel-action-btn');
            const likeCount = reelElement.querySelector('.reel-action-count');
            
            if (result.liked) {
                likeBtn.classList.add('liked');
                likeBtn.style.animation = 'bounce 0.5s ease';
            } else {
                likeBtn.classList.remove('liked');
            }
            
            likeCount.textContent = result.likeCount;
            
            // Reset animation
            setTimeout(() => {
                likeBtn.style.animation = '';
            }, 500);
            
        }
    } catch (error) {
        console.error('Toggle reel like error:', error);
        showToast('Failed to update like', 'error');
    }
}

async function toggleFollowFromReel(userId, button) {
    try {
        const response = await fetch(`/api/users/${userId}/follow`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.following) {
                button.textContent = 'Following';
                button.classList.add('following');
                showToast('Now following!', 'success');
            } else {
                button.textContent = 'Follow';
                button.classList.remove('following');
                showToast('Unfollowed', 'info');
            }
        } else {
            showToast('Failed to update follow status', 'error');
        }
    } catch (error) {
        console.error('Follow error:', error);
        showToast('Network error', 'error');
    }
}

function openReelComments(reelId, index) {
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    
    // Create a simple comment modal
    const modal = document.createElement('div');
    modal.className = 'comment-modal-overlay';
    modal.innerHTML = `
        <div class="comment-modal">
            <div class="comment-modal-header">
                <h3>Comments</h3>
                <button onclick="this.closest('.comment-modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="comment-modal-body">
                <div class="comments-list">
                    ${reel.comments.map(comment => `
                        <div class="comment-item">
                            <img src="${comment.userInfo.profileImage || `https://via.placeholder.com/30x30/8b8bff/ffffff?text=${comment.userInfo.fullName.charAt(0)}`}" 
                                 class="comment-avatar">
                            <div class="comment-content">
                                <strong>${comment.userInfo.fullName}</strong>
                                <p>${comment.content}</p>
                                <span class="comment-time">${getTimeAgo(new Date(comment.createdAt))}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="comment-input-area">
                    <input type="text" placeholder="Add a comment..." id="commentInput-${reelId}">
                    <button onclick="addReelComment(${reelId}, ${index})">Post</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function addReelComment(reelId, index) {
    const input = document.getElementById(`commentInput-${reelId}`);
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch(`/api/reels/${reelId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update local data
            const reel = reels.find(r => r.id === reelId);
            if (reel) {
                reel.comments.push(result.comment);
                
                // Update comment count in UI
                const reelElement = document.querySelector(`[data-index="${index}"]`);
                const commentCount = reelElement.querySelector('.reel-action:nth-child(2) .reel-action-count');
                commentCount.textContent = formatCount(reel.comments.length);
            }
            
            input.value = '';
            showToast('Comment added!', 'success');
            
            // Close modal and refresh
            document.querySelector('.comment-modal-overlay').remove();
        } else {
            showToast('Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Add comment error:', error);
        showToast('Network error', 'error');
    }
}

function toggleReelSound(index) {
    const reelElement = document.querySelector(`[data-index="${index}"]`);
    const video = reelElement.querySelector('.reel-video');
    const soundBtn = document.getElementById(`sound-btn-${index}`);
    const icon = soundBtn.querySelector('i');
    
    if (video.muted) {
        video.muted = false;
        icon.className = 'fas fa-volume-up';
        showToast('Sound on', 'info');
    } else {
        video.muted = true;
        icon.className = 'fas fa-volume-mute';
        showToast('Sound off', 'info');
    }
}

function shareReel(reelId) {
    const reel = reels.find(r => r.id === reelId);
    const shareText = reel ? `Check out "${reel.description.substring(0, 50)}..." on TiVaa! 🔥` : 'Amazing reel on TiVaa!';
    
    if (navigator.share) {
        navigator.share({
            title: 'TiVaa - Amazing Reel',
            text: shareText,
            url: `${window.location.origin}/?reel=${reelId}`
        }).catch(err => console.log('Error sharing:', err));
    } else {
        const shareUrl = `${window.location.origin}/?reel=${reelId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Link copied to clipboard! 📋✨', 'success');
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
    }
}

function showPlayButton(reelElement) {
    const existing = reelElement.querySelector('.reel-play-button');
    if (existing) return;
    
    const playButton = document.createElement('div');
    playButton.className = 'reel-play-button';
    playButton.innerHTML = '<i class="fas fa-play"></i>';
    playButton.onclick = () => {
        const video = reelElement.querySelector('.reel-video');
        video.play().then(() => {
            playButton.remove();
        });
    };
    
    reelElement.appendChild(playButton);
}

function showReelProgress(video) {
    // Add a subtle progress indicator
    const reelElement = video.closest('.reel-item');
    let progressBar = reelElement.querySelector('.reel-progress');
    
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'reel-progress';
        progressBar.innerHTML = '<div class="reel-progress-fill"></div>';
        reelElement.appendChild(progressBar);
    }
    
    const updateProgress = () => {
        if (video.duration) {
            const progress = (video.currentTime / video.duration) * 100;
            const fill = progressBar.querySelector('.reel-progress-fill');
            fill.style.width = progress + '%';
        }
        
        if (!video.paused && !video.ended) {
            requestAnimationFrame(updateProgress);
        }
    };
    
    updateProgress();
}

function hideReelProgress() {
    document.querySelectorAll('.reel-progress').forEach(progress => {
        progress.style.opacity = '0';
    });
}

// Add keyboard controls for reels
document.addEventListener('keydown', (e) => {
    const reelsPage = document.getElementById('reelsPage');
    if (reelsPage.style.display !== 'block') return;
    
    const reelsScroll = document.getElementById('reelsScroll');
    const currentReel = reelsScroll.querySelector(`[data-index="${currentReelIndex}"]`);
    
    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            // Scroll to previous reel
            if (currentReelIndex > 0) {
                const prevReel = reelsScroll.querySelector(`[data-index="${currentReelIndex - 1}"]`);
                prevReel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            // Scroll to next reel
            if (currentReelIndex < reels.length - 1) {
                const nextReel = reelsScroll.querySelector(`[data-index="${currentReelIndex + 1}"]`);
                nextReel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            break;
            
        case ' ':
            e.preventDefault();
            // Toggle play/pause
            if (currentReel) {
                const video = currentReel.querySelector('.reel-video');
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            }
            break;
            
        case 'm':
            e.preventDefault();
            // Toggle mute
            if (currentReel) {
                toggleReelSound(currentReelIndex);
            }
            break;
            
        case 'l':
            e.preventDefault();
            // Like current reel
            if (currentReel) {
                const reelId = parseInt(currentReel.dataset.reelId);
                toggleReelLike(reelId, currentReelIndex);
            }
            break;
    }
});

// Story Upload Functions
function openStoryUpload() {
    document.getElementById('storyUploadModal').style.display = 'flex';
    setupStoryUploadHandlers();
}

function closeStoryUpload() {
    document.getElementById('storyUploadModal').style.display = 'none';
    resetStoryUpload();
}

function setupStoryUploadHandlers() {
    const fileInput = document.getElementById('storyFileInput');
    const dropZone = document.getElementById('storyDropZone');
    const captionInput = document.getElementById('storyCaptionInput');
    const captionCounter = document.getElementById('captionCounter');
    
    // File input handler
    fileInput.addEventListener('change', handleStoryFileSelect);
    
    // Caption counter
    captionInput.addEventListener('input', () => {
        captionCounter.textContent = captionInput.value.length;
    });
    
    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleStoryFile(files[0]);
        }
    });
    
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
}

function handleStoryFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleStoryFile(file);
    }
}

function handleStoryFile(file) {
    // Validate file
    const maxSize = 15 * 1024 * 1024; // 15MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'video/webm'];
    
    if (file.size > maxSize) {
        showToast('File too large! Maximum size is 15MB', 'error');
        return;
    }
    
    if (!allowedTypes.includes(file.type)) {
        showToast('Unsupported file type! Use JPG, PNG, GIF, MP4, MOV, or WEBM', 'error');
        return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        showStoryPreview(e.target.result, file.type, file);
    };
    reader.readAsDataURL(file);
}

function showStoryPreview(src, type, file) {
    const dropZone = document.getElementById('storyDropZone');
    const preview = document.getElementById('storyPreview');
    const previewImg = document.getElementById('storyPreviewImg');
    const previewVideo = document.getElementById('storyPreviewVideo');
    
    dropZone.style.display = 'none';
    preview.style.display = 'block';
    
    if (type.startsWith('image/')) {
        previewImg.src = src;
        previewImg.style.display = 'block';
        previewVideo.style.display = 'none';
    } else if (type.startsWith('video/')) {
        previewVideo.src = src;
        previewVideo.style.display = 'block';
        previewImg.style.display = 'none';
    }
    
    // Store file for upload
    preview.dataset.file = JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size,
        data: src
    });
}

function resetStoryUpload() {
    const dropZone = document.getElementById('storyDropZone');
    const preview = document.getElementById('storyPreview');
    const fileInput = document.getElementById('storyFileInput');
    const captionInput = document.getElementById('storyCaptionInput');
    const captionCounter = document.getElementById('captionCounter');
    
    dropZone.style.display = 'block';
    preview.style.display = 'none';
    fileInput.value = '';
    captionInput.value = '';
    captionCounter.textContent = '0';
    
    // Clear previews
    document.getElementById('storyPreviewImg').src = '';
    document.getElementById('storyPreviewVideo').src = '';
}

async function uploadStory() {
    const preview = document.getElementById('storyPreview');
    const captionInput = document.getElementById('storyCaptionInput');
    const fileData = JSON.parse(preview.dataset.file || '{}');
    
    if (!fileData.data) {
        showToast('No file selected', 'error');
        return;
    }
    
    const uploadBtn = document.querySelector('.story-upload-actions .btn-primary');
    const originalText = uploadBtn.innerHTML;
    
    try {
        // Show loading state
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        uploadBtn.disabled = true;
        
        // Simulate upload progress
        showUploadProgress();
        
        // Create form data
        const formData = new FormData();
        
        // Convert data URL to blob
        const response = await fetch(fileData.data);
        const blob = await response.blob();
        
        formData.append('story', blob, fileData.name);
        formData.append('caption', captionInput.value);
        formData.append('type', fileData.type.startsWith('image/') ? 'image' : 'video');
        
        // Upload to server
        const uploadResponse = await fetch('/api/stories', {
            method: 'POST',
            body: formData
        });
        
        if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            showToast('🎉 Story uploaded successfully!', 'success');
            closeStoryUpload();
            
            // Refresh stories
            setTimeout(() => {
                loadStories();
            }, 1000);
        } else {
            const error = await uploadResponse.json();
            showToast(error.error || 'Upload failed', 'error');
        }
        
    } catch (error) {
        console.error('Story upload error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
        hideUploadProgress();
    }
}

function showUploadProgress() {
    const preview = document.getElementById('storyPreview');
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress';
    progressContainer.innerHTML = '<div class="upload-progress-fill"></div>';
    
    preview.appendChild(progressContainer);
    
    // Animate progress
    const fill = progressContainer.querySelector('.upload-progress-fill');
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 90) {
            progress = 90;
            clearInterval(interval);
        }
        fill.style.width = progress + '%';
    }, 200);
    
    // Store interval for cleanup
    progressContainer.dataset.interval = interval;
}

function hideUploadProgress() {
    const progressContainer = document.querySelector('.upload-progress');
    if (progressContainer) {
        const interval = progressContainer.dataset.interval;
        if (interval) clearInterval(interval);
        
        const fill = progressContainer.querySelector('.upload-progress-fill');
        fill.style.width = '100%';
        
        setTimeout(() => {
            progressContainer.remove();
        }, 500);
    }
}