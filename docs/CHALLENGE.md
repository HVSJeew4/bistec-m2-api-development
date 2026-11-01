# Month 2 Challenge

Challenge Brief¶
Role: You are building a backend API for a blog platform Time: 4 hours (in-session) + ongoing offline work Deliverables: 5 artifacts

Context¶
Project Profile¶

Project: BlogFlow API
Type: RESTful API
Resources: Users, Posts, Comments
Endpoints: 15+ endpoints
Tech Stack: Express.js, PostgreSQL, JWT
API Requirements¶

Users:
- Registration with email/password
- Login with JWT token response
- Profile management (view, update)

Posts:
- CRUD operations (Create, Read, Update, Delete)
- List with pagination and filtering
- Author association

Comments:
- Create comments on posts
- List comments by post
- Delete own comments
Non-Functional Requirements¶
Input validation on all endpoints
Consistent error response format
Rate limiting (100 requests/minute)
JWT authentication for protected routes
Swagger documentation
Challenge Tasks¶
Part 1: Database Setup (20 min)¶
Design PostgreSQL Schema:


-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  post_id INTEGER REFERENCES posts(id),
  author_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
Expected Setup: 1. Create all tables with proper relationships 2. Add indexes for common queries 3. Create seed data (5 users, 20 posts, 50 comments)

Part 2: CRUD Endpoints (50 min)¶
User Endpoints:

Method	Endpoint	Description	Auth
POST	/api/auth/register	Create new user	No
POST	/api/auth/login	Login, return JWT	No
GET	/api/users/me	Get current user	Yes
PUT	/api/users/me	Update current user	Yes
Post Endpoints:

Method	Endpoint	Description	Auth
GET	/api/posts	List all posts	No
GET	/api/posts/:id	Get single post	No
POST	/api/posts	Create post	Yes
PUT	/api/posts/:id	Update post	Yes (owner)
DELETE	/api/posts/:id	Delete post	Yes (owner)
Comment Endpoints:

Method	Endpoint	Description	Auth
GET	/api/posts/:id/comments	List comments	No
POST	/api/posts/:id/comments	Create comment	Yes
DELETE	/api/comments/:id	Delete comment	Yes (owner)
Implementation Requirements:


// Response format for success
{
  "success": true,
  "data": { ... }
}

// Response format for error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [...]
  }
}

// Pagination format
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
Part 3: Authentication & Security (30 min)¶
JWT Implementation:


// Token generation
const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // Validate and decode token
  // Attach user to request
};
Security Checklist: - [ ] Password hashing with bcrypt (10 rounds) - [ ] JWT token validation - [ ] Protected route middleware - [ ] Owner-only operations check - [ ] Rate limiting (express-rate-limit) - [ ] Input sanitization

Part 4: Documentation & Testing (20 min)¶
Swagger Documentation:


openapi: 3.0.0
info:
  title: BlogFlow API
  version: 1.0.0
paths:
  /api/posts:
    get:
      summary: List all posts
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        200:
          description: Success
Postman Collection: - All endpoints organized by resource - Environment variables for base URL and token - Test scripts for response validation - Pre-request scripts for auth token

Submission Requirements¶
File Naming Convention¶

[participant-name]-month2-[deliverable]
Example: john-doe-month2-api-project.zip
Required Files¶
[name]-month2-api-project.zip - Complete Node.js project
[name]-month2-schema.sql - Database schema
[name]-month2-postman.json - Postman collection
[name]-month2-swagger.yaml - OpenAPI spec
[name]-month2-readme.md - Setup instructions
<!-- Paste the full challenge from the Academy site here -->
