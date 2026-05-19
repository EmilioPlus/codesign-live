# Security Fixes Applied to CoDesign Live

## Critical Fixes Applied

### 1. Project Routes Authentication
**File:** `server/src/routes/projects.routes.js`

- Added `authMiddleware` to all project routes
- Users must now be authenticated to view, create, or delete projects

### 2. Project Ownership Validation
**File:** `server/src/controllers/projects.controller.js`

- `getUserProjects`: Added userId validation
- `createProject`:
  - Uses authenticated user's ID instead of trusting client input
  - Sanitizes title input (max 200 chars, trimmed)
  - Validates fileUrl is from allowed Firebase domain
  - Validates type is '2d' or '3d'
- `deleteProject`:
  - Verifies project exists
  - Verifies user owns the project before deletion

### 3. Upload Route Authentication
**File:** `server/src/routes/upload.routes.js`

- Added `authMiddleware` - users must be authenticated to upload files
- Improved file type validation:
  - Strict extension-to-MIME-type mapping
  - Both extension AND MIME type must match
  - Removed permissive `application/octet-stream`

### 4. JWT Secret Configuration
**File:** `server/src/middlewares/middleware.auth.js`

- **BREAKING CHANGE:** JWT_SECRET is now required
- Application will fail to start if JWT_SECRET is not set
- Exported JWT_SECRET for use in auth controller

### 5. Authentication Improvements
**File:** `server/src/controllers/auth.controller.js`

- Imports JWT_SECRET from middleware (single source of truth)
- Password minimum length: 8 characters
- Increased bcrypt rounds from 10 to 12
- Generic error messages to prevent user enumeration
- Email format validation
- Avatar URL validation (HTTPS only)
- Name length limit (100 chars)

### 6. Firebase Credentials Security
**File:** `server/src/config/firebase.js`

- Now supports `FIREBASE_SERVICE_ACCOUNT` environment variable
- Falls back to file for local development (with warning)
- Clear error messages when credentials missing

## Required Actions

### IMMEDIATE (Before Deploying)

1. **Generate secure JWT secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Set environment variables:**
   ```env
   JWT_SECRET=<your-generated-secret>
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
   ```

3. **Rotate Firebase credentials:**
   - Go to Google Cloud Console
   - Navigate to IAM & Admin > Service Accounts
   - Find the firebase-adminsdk service account
   - Create new key (this invalidates the old one)
   - Download and convert to JSON string for env variable
   - **DELETE** the old key immediately

4. **Remove Firebasekey.json from git history:**
   ```bash
   # Option 1: Using BFG Repo-Cleaner (recommended)
   bfg --delete-files Firebasekey.json

   # Option 2: Using git filter-branch
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch server/Firebasekey.json' \
     --prune-empty --tag-name-filter cat -- --all
   ```

### After Fixes

1. **Force push to remote:**
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

2. **Invalidate old credentials:**
   - Ensure old Firebase key is revoked
   - Update any CI/CD environment variables

3. **Add .env to .gitignore:**
   Already done in `server/.gitignore`

## Remaining Recommendations

### Medium Priority

1. **Rate limiting for auth endpoints:**
   ```javascript
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5,
     message: { error: "Too many attempts" }
   })
   router.post("/login", authLimiter, loginUser)
   ```

2. **Input sanitization library:**
   Add `sanitize-html` or similar for XSS prevention

3. **Content Security Policy:**
   Configure CSP headers for frontend

4. **CORS specific origins:**
   Limit CORS to exact origins in production

## Security Checklist

- [x] All project routes require authentication
- [x] Project deletion verifies ownership
- [x] File upload requires authentication
- [x] File type validation (extension + MIME)
- [x] JWT secret required (no default)
- [x] Password requirements (min 8 chars)
- [x] Generic auth error messages
- [x] Firebase supports env variable
- [ ] Firebase credentials rotated
- [ ] Firebasekey.json removed from git history
- [ ] Rate limiting for auth endpoints
- [ ] Content Security Policy headers