# Authentication Explained

This document traces authentication in this repository as implemented. It describes the current code; it does not propose a replacement design.

All backend paths below are mounted beneath `/api/v1`. Auth routes are mounted at `/api/v1/auth`, user routes at `/api/v1/users`, and the admin routers at their respective `/api/v1/admin/...` paths.

## 1. Detect the auth strategy

### Finding

**This project uses MongoDB-backed server-side sessions because it depends on `express-session` and `connect-mongo`, configures a Mongo session store, and records the authenticated user's ID in `req.session.userId`.** The browser receives only a signed session-ID cookie named `multisports.sid`. The project does **not** use JWT access or refresh tokens.

Passwords are hashed with **Argon2id**, and the project additionally supports Google ID-token sign-in and HMAC-hashed, email-delivered OTP challenges.

### Dependency evidence

File: `server/package.json`

```json
{
  "dependencies": {
    "argon2": "^0.45.1",
    "connect-mongo": "^6.0.0",
    "express-session": "^1.19.0",
    "google-auth-library": "^11.0.2"
  }
}
```

Why this matters:

- `express-session` creates and validates the browser session.
- `connect-mongo` stores session records in MongoDB rather than browser-readable storage.
- `argon2` hashes and verifies passwords.
- `google-auth-library` validates Google Identity Services credentials.
- There is no `jsonwebtoken`, `passport`, `bcryptjs`, or `cookie-parser` dependency. `express-session` manages its own cookie and cookie signing, so `cookie-parser` is not needed here.

### Session configuration evidence

File: `server/src/config/session.js`

```js
export const sessionMiddleware = session({
  name: 'multisports.sid',
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: env.mongodbUri,
    collectionName: 'sessions',
    ttl: SESSION_MAX_AGE_MS / 1000,
  }),
  cookie: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
  },
});
```

The cookie lasts seven days. `httpOnly` prevents frontend JavaScript from reading it, `secure` restricts it to HTTPS in production, and `sameSite: 'lax'` provides a baseline cross-site request restriction. The cookie identifies the MongoDB session; it does not contain the user object or a JWT.

File: `server/src/app.js`

```js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use('/api/v1/auth', authRouter);
```

The session middleware runs before the route handlers, so each handler receives `req.session` after `express-session` has validated the signed cookie and loaded the corresponding MongoDB session.

### What is stored where

| Location | Authentication data |
|---|---|
| Browser cookie | Signed opaque session ID (`multisports.sid`) |
| MongoDB `sessions` collection | `userId`, `authenticatedAt`, `csrfToken`, and temporary `passwordReset` authorization when applicable |
| MongoDB `users` collection | Identity/profile fields, role, optional password hash, optional Google subject ID |
| MongoDB `authChallenges` collection | HMAC hash and lifecycle data for email verification, login OTP, reset OTP, and email-change OTP |
| Redux memory | Safe current-user object and UI/auth request status |
| Frontend module memory | Current CSRF token; no password, session ID, JWT, or refresh token |

There is no refresh-token flow. A valid session cookie continues to identify the MongoDB session until expiry or logout; protected middleware then loads the current User record on each request.

## 2. Backend — User Model

### User schema

File: `server/src/modules/users/user.model.js`

```js
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    googleSub: { type: String, select: false },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
      required: true,
    },
    passwordHash: { type: String, select: false },
    emailVerified: { type: Boolean, default: false, required: true },
    phone: { /* optional validated string */ },
    profilePhoto: { type: profilePhotoSchema, default: undefined },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true },
);
```

Field-by-field:

- `_id`: Mongoose's implicit ObjectId. Its string form becomes the application user `id` and is stored in `req.session.userId` after login.
- `name`: required display/profile name with surrounding whitespace removed.
- `email`: required, trimmed, lowercased, format-validated login identifier. A unique database index enforces one user per email.
- `googleSub`: optional Google `sub` claim used to link a Google identity. `select: false` keeps it out of normal queries. A unique partial index applies only when it is a string, allowing users without Google linking.
- `role`: required authorization role, limited to `customer` or `admin`; defaults to `customer`. Backend `requireCustomer` and `requireAdmin` use it.
- `passwordHash`: optional Argon2id hash. It is optional because a Google-created account may not have a local password. `select: false` prevents accidental exposure and login explicitly opts it into the query.
- `emailVerified`: required boolean. Password and OTP login refuse unverified accounts; new password registrations start at `false`, while a new verified Google identity starts at `true`.
- `phone`: optional profile phone number, trimmed and validated for allowed characters, length, and 7–15 digits.
- `profilePhoto`: optional embedded object with required `publicId` and `url`. `publicId` supports Cloudinary management; the safe auth response exposes only the URL.
- `addresses`: array of embedded address records. Each has `fullName`, validated `phone`, `address`, `city`, `state`, `postalCode`, `country`, and required `isDefault` (default `false`). Address subdocuments receive their own `_id` because `_id` is not disabled on `addressSchema`.
- `createdAt` and `updatedAt`: added automatically by `timestamps: true`.

### Indexes

File: `server/src/modules/users/user.model.js`

```js
userSchema.index({ email: 1 }, { unique: true });

userSchema.index(
  { googleSub: 1 },
  {
    unique: true,
    partialFilterExpression: { googleSub: { $type: 'string' } },
  },
);
```

These are race-safe database constraints for unique email and unique linked Google identity. The services do friendly pre-checks, but still catch MongoDB duplicate-key errors because concurrent requests can pass a pre-check simultaneously.

### Password hashing: no pre-save hook

There is **no Mongoose pre-save password hook**. Hashing is explicit in the auth service.

File: `server/src/modules/auth/auth.service.js`

```js
const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id,
});

user = await User.create({
  name,
  email,
  role: 'customer',
  passwordHash,
  emailVerified: false,
});
```

Registration, password reset, and authenticated password change each hash the new plaintext password with Argon2id before persistence. The plaintext is never stored. Login explicitly selects `+passwordHash` and calls `argon2.verify`.

### Safe user projection

File: `server/src/modules/auth/auth.service.js`

```js
function toSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    phone: user.phone ?? null,
    profilePhoto: user.profilePhoto?.url
      ? { url: user.profilePhoto.url }
      : null,
  };
}
```

All authentication responses use this safe shape. Password hashes, Google subject IDs, address data, and Cloudinary public IDs are not returned.

### OTP/challenge data is separate from User

The User schema has no access-token, refresh-token, or OTP fields. Short-lived challenges live separately.

File: `server/src/modules/auth/authChallenge.model.js`

```js
const authChallengeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetEmail: { type: String, required: true, lowercase: true },
  purpose: {
    type: String,
    enum: ['email_verification', 'otp_login', 'password_reset', 'email_change'],
    required: true,
  },
  challengeHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  attemptCount: { type: Number, required: true, default: 0, min: 0 },
  lastSentAt: { type: Date, default: null },
});
```

- `challengeHash` is an HMAC-SHA-256 digest of user ID, email, purpose, and OTP—not the plaintext OTP.
- `expiresAt`, `usedAt`, and `attemptCount` enforce expiry, one-time use, and a five-attempt limit.
- `lastSentAt` supports the 60-second resend cooldown.
- A unique `{ userId, purpose }` index permits one current challenge of each kind per user.
- A TTL index on `expiresAt` lets MongoDB clean up expired records.

## 3. Backend — Auth Routes & Controllers

### Route declaration and CSRF boundary

File: `server/src/modules/auth/auth.routes.js`

```js
router.get('/csrf-token', getCsrfToken);
router.get('/session', getSession);
router.post('/register', registrationRateLimiter, register);
router.post('/email-verification/verify', verificationRateLimiter, verifyEmail);
router.post('/email-verification/resend', resendVerificationRateLimiter, resendVerificationEmail);

router.use(requireCsrf);

router.post('/login', loginRateLimiter, login);
router.post('/google', loginRateLimiter, googleAuth);
router.post('/otp/request', loginRateLimiter, requestOtpLogin);
router.post('/otp/verify', verificationRateLimiter, verifyOtpLogin);
// password recovery/change, email change, and logout follow
```

The first five endpoints are deliberately before the router-wide CSRF middleware. Every mutation declared after `router.use(requireCsrf)` requires an `X-CSRF-Token` matching the token in the session. Rate limiters return HTTP 429 after their configured per-IP window is exhausted.

All successful controllers use the envelope:

```json
{
  "success": true,
  "data": {}
}
```

Errors use `{"success":false,"error":{"code":"...","message":"...","fields":{}}}` when field errors exist (`server/src/middleware/error.middleware.js`).

### Complete auth endpoint inventory

| Method and full path | Authentication/CSRF | `req.body` | Successful `data` | Session/cookie effect |
|---|---|---|---|---|
| `GET /api/v1/auth/csrf-token` | Public | none | `{ csrfToken }` | Creates/stores CSRF state; establishes the session cookie when needed |
| `GET /api/v1/auth/session` | Public status probe | none | `{ authenticated, user }` | Reads the existing session; clears a stale `userId` if its User is gone |
| `POST /api/v1/auth/register` | Public, rate-limited; before CSRF boundary | `{ name, email, password, confirmPassword }` | `{ user, verificationRequired: true }` (201) | Does not authenticate or change auth session state |
| `POST /api/v1/auth/email-verification/verify` | Public, rate-limited; before CSRF boundary | `{ email, otp }` | `{ emailVerified: true }` | No auth session change |
| `POST /api/v1/auth/email-verification/resend` | Public, rate-limited; before CSRF boundary | `{ email }` | generic `{ message }` | No auth session change |
| `POST /api/v1/auth/login` | Public identity-wise; CSRF + rate limit | `{ email, password }` | `{ user, csrfToken }` | Regenerates as authenticated session; browser receives replacement session cookie |
| `POST /api/v1/auth/google` | Public or authenticated linking; CSRF + rate limit | `{ credential }` | `{ user, csrfToken }` | Regenerates as authenticated session; browser receives replacement session cookie |
| `POST /api/v1/auth/otp/request` | Public identity-wise; CSRF + rate limit | `{ email }` | generic `{ message }` | No auth session change |
| `POST /api/v1/auth/otp/verify` | Public identity-wise; CSRF + rate limit | `{ email, otp }` | `{ user, csrfToken }` | Regenerates as authenticated session; browser receives replacement session cookie |
| `POST /api/v1/auth/password/forgot` | Public identity-wise; CSRF + rate limit | `{ email }` | generic `{ message }` | No auth session change |
| `POST /api/v1/auth/password/forgot/verify` | Public identity-wise; CSRF + rate limit | `{ email, otp }` | `{ resetAuthorized: true }` | Stores temporary reset authorization in the current server session |
| `POST /api/v1/auth/password/reset` | Temporary reset session authorization + CSRF + rate limit | `{ newPassword, confirmPassword }` | `{ passwordReset: true }` | Consumes reset authorization and clears authenticated `userId`; current anonymous session continues |
| `PATCH /api/v1/auth/password` | `requireAuth` + CSRF + rate limit | `{ currentPassword, newPassword, confirmPassword }` | `{ passwordChanged: true }` | Authenticated session continues unchanged |
| `POST /api/v1/auth/email-change/request` | `requireAuth`, customer, recent login + CSRF + rate limit | `{ newEmail }` | `{ verificationRequired: true, newEmail }` | Authenticated session continues unchanged |
| `POST /api/v1/auth/email-change/verify` | `requireAuth`, customer + CSRF + rate limit | `{ otp }` | `{ emailChanged: true, email }` | Authenticated session continues; later User reloads use the new email |
| `POST /api/v1/auth/logout` | `requireAuth` + CSRF | none | `{ authenticated: false, csrfToken }` | Regenerates as anonymous session; browser receives replacement session cookie |

Validation rejects non-object bodies and unexpected fields. Emails are trimmed and lowercased. Password policy is 8–128 characters with at least one letter and one digit. OTPs are six decimal digits.

None of these endpoints sends an access token in a response header. Cookie issuance/rotation is handled by `express-session`; rate-limited endpoints may also emit the standard `RateLimit` headers configured by `express-rate-limit`.

### `GET /auth/csrf-token`

File: `server/src/modules/auth/auth.controller.js`

```js
export function getCsrfToken(req, res) {
  const csrfToken = getOrCreateCsrfToken(req);
  res.status(200).json({ success: true, data: { csrfToken } });
}
```

It creates a random 32-byte hex token if the session lacks one, stores it in the session, and returns it to the frontend. Because the session is modified, `express-session` establishes/updates the `multisports.sid` cookie. This endpoint normally runs first during frontend bootstrap.

### `GET /auth/session`

File: `server/src/modules/auth/auth.controller.js`

```js
if (!req.session.userId) {
  return res.status(200).json({
    success: true,
    data: { authenticated: false, user: null },
  });
}

const user = await getSessionUser(req.session.userId);
```

This is a status endpoint, not a protected endpoint. If `userId` is absent it reports a guest. If present, it reloads the current safe user from MongoDB. A missing User clears the stale session user ID and reports a guest; otherwise it returns `{ authenticated: true, user }`.

### `POST /auth/register`

Files: `server/src/modules/auth/auth.controller.js`, `server/src/modules/auth/auth.service.js`

```js
const input = validateRegistrationInput(req.body);
const result = await registerCustomer(input);
res.status(201).json({ success: true, data: result });
```

```js
const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
user = await User.create({
  name, email, role: 'customer', passwordHash, emailVerified: false,
});
await issueEmailVerificationChallenge(user);
```

The service checks duplicate email, hashes the password, creates a customer, creates/replaces an email-verification challenge, and emails its six-digit OTP. Response `data` contains the safe user and `verificationRequired: true`. **Registration does not set `session.userId`; signup alone does not log the user in.**

### Email verification and resend

Files: `server/src/modules/auth/auth.service.js`, `server/src/modules/auth/auth.challenge.js`

```js
const otpMatches = verifyAuthChallengeHash({
  userId: user._id,
  email,
  purpose: EMAIL_VERIFICATION_PURPOSE,
  otp,
  challengeHash: challenge.challengeHash,
});

await User.updateOne(
  { _id: user._id },
  { $set: { emailVerified: true } },
);
```

`POST /email-verification/verify` locates the user and matching challenge, rejects missing/used/expired/over-attempt challenges, timing-safely compares the submitted OTP's HMAC, increments attempts on failure, atomically marks the challenge used, and sets `emailVerified`. It returns `{ emailVerified: true }`; it does not log the user in.

`POST /email-verification/resend` returns the same generic message whether the account is absent, already verified, cooling down, or actually sent a code. This avoids revealing account state. An eligible unverified user receives a newly generated challenge/code.

### Password login

Files: `server/src/modules/auth/auth.controller.js`, `server/src/modules/auth/auth.service.js`, `server/src/modules/auth/auth.session.js`

```js
const user = await User.findOne({ email }).select('+passwordHash');

if (!user || !user.passwordHash) throw invalidCredentialsError();

const passwordMatches = await argon2.verify(user.passwordHash, password);
if (!passwordMatches) throw invalidCredentialsError();
if (!user.emailVerified) throw new AppError(403, 'EMAIL_NOT_VERIFIED', ...);
```

```js
const user = await authenticatePassword(input);
const csrfToken = await createAuthenticatedSession(req, user.id);

res.status(200).json({ success: true, data: { user, csrfToken } });
```

The controller validates `{ email, password }`. The service performs a case-normalized email lookup, explicitly includes the hidden password hash, returns the same invalid-credentials error for no user/no password/bad password, verifies Argon2, and requires a verified email.

On success, `createAuthenticatedSession` regenerates the session (preventing session fixation), writes `userId` and `authenticatedAt`, creates a new session-bound CSRF token, and saves. `express-session` sends the session-ID cookie through its normal `Set-Cookie` behavior. The JSON response contains the safe user and CSRF token; there is no token in an Authorization header.

### Google sign-in/linking

Files: `server/src/integrations/google.js`, `server/src/modules/auth/auth.service.js`

```js
const ticket = await googleClient.verifyIdToken({
  idToken: credential,
  audience: env.googleClientId,
});

const payload = ticket.getPayload();
if (!payload?.sub || !payload?.email || payload.email_verified !== true) {
  throw new Error('Required Google identity claims are missing');
}
```

The input `credential` is a Google ID token. The backend—not the frontend—verifies its signature/claims and configured audience and requires a verified Google email.

The service then:

1. Logs in the already-linked customer when `googleSub` matches.
2. Refuses Google as an admin sign-in/link path.
3. For an existing same-email customer without a link, requires that customer to authenticate locally first, then allows only same-user linking.
4. Creates a new verified customer when both Google identity and email are new.
5. Uses unique indexes and conflict handling for concurrent requests.

It then uses the same regenerated authenticated session and `{ user, csrfToken }` response as password login. When already authenticated, `req.session.userId` is passed into the service specifically to constrain safe account linking.

### Passwordless OTP login

Files: `server/src/modules/auth/auth.service.js`, `server/src/modules/auth/auth.controller.js`

```js
export async function requestLoginOtp({ email }) {
  const genericResult = {
    message: 'If an eligible account exists, a login code will be sent.',
  };
  // Only an existing, verified customer is eligible.
}
```

`POST /otp/request` always returns a generic message. Only an existing verified customer receives a six-digit, ten-minute OTP; requests are subject to the resend cooldown and route rate limit.

`POST /otp/verify` performs the same challenge checks as email verification: matching purpose/email/user, unused, unexpired, below five attempts, timing-safe HMAC comparison, and atomic consumption. On success it returns the safe user to the controller, which regenerates an authenticated session and responds with `{ user, csrfToken }`.

### Forgot password, reset authorization, and reset

Files: `server/src/modules/auth/auth.controller.js`, `server/src/modules/auth/auth.session.js`, `server/src/modules/auth/auth.service.js`

```js
const result = await verifyPasswordResetOtp(input);
await createPasswordResetAuthorization(req, result.userId);
res.status(200).json({
  success: true,
  data: { resetAuthorized: true },
});
```

`POST /password/forgot` gives the generic response and emails a reset OTP only to an existing, verified customer with a local password. `POST /password/forgot/verify` validates and consumes that OTP, then stores this temporary server-side authorization:

```js
req.session.passwordReset = {
  userId: userId.toString(),
  expiresAt: Date.now() + authConfig.passwordRecovery.resetAuthorizationTtlMs,
};
```

`POST /password/reset` accepts `{ newPassword, confirmPassword }`, but obtains the target user only from the temporary session authorization—never from a client-supplied user ID. It Argon2id-hashes and saves the password, deletes the reset challenge, consumes `session.passwordReset`, and removes any `session.userId`. Therefore a password reset explicitly finishes logged out. It returns `{ passwordReset: true }`.

### Authenticated password change

File: `server/src/modules/auth/auth.service.js`

```js
const user = await User.findById(userId).select('+passwordHash');
const currentPasswordMatches = await argon2.verify(
  user.passwordHash,
  currentPassword,
);
// Reject same password, hash new password, update User.
```

`PATCH /auth/password` takes the user ID from the authenticated session, verifies the current password, rejects an account without a password and direct password reuse, hashes the new password, and returns `{ passwordChanged: true }`. It does not rotate or end the session.

### Email change request and verify

Files: `server/src/modules/auth/auth.routes.js`, `server/src/modules/auth/auth.service.js`

```js
router.post(
  '/email-change/request',
  requireAuth,
  requireCustomer,
  requireRecentAuthentication,
  emailChangeRateLimiter,
  requestEmailChange,
);
```

The request endpoint accepts `{ newEmail }`, requires a customer whose session was authenticated in the last ten minutes, rejects unchanged/occupied emails, and emails an OTP to the proposed new address. It returns `{ verificationRequired: true, newEmail }`.

The verify endpoint accepts `{ otp }`, re-checks the challenge and email uniqueness, atomically changes `User.email`, preserves `emailVerified: true`, consumes the challenge, and returns `{ emailChanged: true, email }`. The frontend updates the email in Redux from this response.

### Logout

Files: `server/src/modules/auth/auth.controller.js`, `server/src/modules/auth/auth.session.js`

```js
export async function logout(req, res) {
  const csrfToken = await createAnonymousSession(req);
  res.status(200).json({
    success: true,
    data: { authenticated: false, csrfToken },
  });
}
```

Logout requires the current session and CSRF token. It regenerates the whole session instead of merely deleting `userId`, leaving a fresh anonymous session with a new CSRF token. The response updates the browser's session cookie through `express-session` and gives the frontend the new CSRF token.

## 4. Backend — Auth Middleware

### Where request identity first comes from

Before `requireAuth` runs, `sessionMiddleware` has already:

1. Read the `multisports.sid` cookie.
2. Verified its signature using `SESSION_SECRET`.
3. Used its opaque ID to load the session from MongoDB.
4. Exposed that session as `req.session`.

The project's own middleware therefore validates application identity from `req.session.userId`; it does not parse an Authorization header or verify a JWT.

### `requireAuth`, line by line

File: `server/src/middleware/auth.middleware.js`

```js
export async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return next(
      new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'),
    );
  }

  const user = await getSessionUser(req.session.userId);

  if (!user) {
    delete req.session.userId;
    delete req.session.authenticatedAt;

    return next(
      new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'),
    );
  }

  req.user = user;
  next();
}
```

1. `req.session.userId` must exist. Otherwise it forwards an `AUTH_REQUIRED` error, rendered as HTTP 401 by the global error handler.
2. `getSessionUser` queries MongoDB by that ID and selects only safe current fields. This means deletion of a user or a role/profile change is reflected without waiting for the session to expire.
3. If the User record no longer exists, stale identity fields are cleared and the request gets the same 401.
4. If the User exists, the safe object is attached as `req.user` for downstream role checks/controllers.
5. `next()` continues the route chain.

### Role and recent-authentication middleware

File: `server/src/middleware/auth.middleware.js`

```js
export function requireCustomer(req, res, next) {
  if (!req.user || req.user.role !== 'customer') {
    return next(new AppError(403, 'FORBIDDEN', 'Customer access is required.'));
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError(403, 'FORBIDDEN', 'Admin access is required.'));
  }
  next();
}
```

These must run after `requireAuth`, because that middleware populates `req.user`. Wrong-role requests receive HTTP 403.

`requireRecentAuthentication` converts `req.session.authenticatedAt` to a number, rejects missing/non-finite values, calculates its age, and rejects future timestamps or ages over ten minutes with `REAUTH_REQUIRED`. It is used only for starting an email change.

### CSRF validation (related but distinct)

File: `server/src/middleware/csrf.middleware.js`

```js
const submittedToken = req.get('X-CSRF-Token');
const sessionToken = req.session.csrfToken;

const tokensMatch =
  submittedBuffer.length === sessionBuffer.length &&
  crypto.timingSafeEqual(submittedBuffer, sessionBuffer);
```

The cookie proves which server session is being used; the CSRF header proves the request came from frontend code that first obtained the session-bound token. Missing or non-matching tokens produce HTTP 403 `CSRF_INVALID`. This is independent of whether the session is authenticated.

### Routes protected by backend middleware

Auth routes (`server/src/modules/auth/auth.routes.js`):

- `PATCH /api/v1/auth/password` — authenticated user.
- `POST /api/v1/auth/email-change/request` — authenticated customer with recent authentication.
- `POST /api/v1/auth/email-change/verify` — authenticated customer.
- `POST /api/v1/auth/logout` — authenticated user.

Customer routes (`server/src/modules/users/user.routes.js`) all use `requireAuth` + `requireCustomer`:

| Method | Full path |
|---|---|
| `GET` | `/api/v1/users/me` |
| `PATCH` | `/api/v1/users/me` |
| `PUT` | `/api/v1/users/me/profile-photo` |
| `DELETE` | `/api/v1/users/me/profile-photo` |
| `GET` | `/api/v1/users/me/addresses` |
| `POST` | `/api/v1/users/me/addresses` |
| `PATCH` | `/api/v1/users/me/addresses/:addressId` |
| `DELETE` | `/api/v1/users/me/addresses/:addressId` |
| `PATCH` | `/api/v1/users/me/addresses/:addressId/default` |

Admin routers apply `router.use(requireAuth, requireAdmin)`, so every declared route below them is protected:

| Method | Full path |
|---|---|
| `GET` | `/api/v1/admin/categories` |
| `POST` | `/api/v1/admin/categories` |
| `PATCH` | `/api/v1/admin/categories/:categoryId` |
| `PATCH` | `/api/v1/admin/categories/:categoryId/status` |
| `GET` | `/api/v1/admin/products` |
| `GET` | `/api/v1/admin/products/:productId` |
| `POST` | `/api/v1/admin/products` |
| `POST` | `/api/v1/admin/products/:productId/images` |
| `PATCH` | `/api/v1/admin/products/:productId/images/:imageId` |
| `DELETE` | `/api/v1/admin/products/:productId/images/:imageId` |
| `POST` | `/api/v1/admin/products/:productId/variants` |
| `PATCH` | `/api/v1/admin/products/:productId/variants/:variantId/status` |
| `PATCH` | `/api/v1/admin/products/:productId/variants/:variantId` |
| `PATCH` | `/api/v1/admin/products/:productId/status` |
| `PATCH` | `/api/v1/admin/products/:productId` |
| `GET` | `/api/v1/admin/inventory` |
| `GET` | `/api/v1/admin/inventory/:inventoryId/adjustments` |
| `POST` | `/api/v1/admin/inventory/:inventoryId/adjustments` |
| `GET` | `/api/v1/admin/inventory/:inventoryId` |

State-changing customer/admin routes also apply `requireCsrf`; protected GET requests do not need the CSRF header.

## 5. Frontend — Auth State Management

### Redux Toolkit owns client auth state

Files: `client/src/app/store/store.js`, `client/src/features/auth/authSlice.js`

```js
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});
```

```js
const initialState = {
  user: null,
  initialized: false,
  bootstrapStatus: 'idle',
  actionStatus: 'idle',
  error: null,
  googleLinkPending: false,
};
```

- `user` is the safe backend user or `null`.
- `initialized` prevents route guards from deciding before session restoration finishes.
- `bootstrapStatus` tracks the one-time startup check.
- `actionStatus` drives login/logout/OTP/Google loading UI.
- `error` contains the normalized backend error.
- `googleLinkPending` preserves the UI state for proving ownership before same-email Google linking.

Redux is a UI mirror, not the source of server authorization. Reloading loses Redux state, but the HttpOnly cookie persists and bootstrap restores the user.

### Startup restoration

Files: `client/src/main.jsx`, `client/src/features/auth/authSlice.js`

```js
store.dispatch(bootstrapAuth());
```

```js
const csrf = await fetchCsrfToken();
setCsrfToken(csrf.csrfToken);

const session = await fetchSession();
return session;
```

Before rendering the app, the client requests/refreshes its CSRF token and then asks `/auth/session` whether the cookie maps to an authenticated session. Fulfillment sets `initialized = true` and stores `session.user` only when `authenticated` is true. Failure still sets `initialized = true` but leaves `user = null`, allowing guards to stop displaying the loading screen.

### Login and logout state changes

File: `client/src/features/auth/authSlice.js`

```js
export const login = createAsyncThunk('auth/login', async (credentials, api) => {
  const result = await loginCustomer(credentials);
  setCsrfToken(result.csrfToken);
  return result.user;
});
```

On `login.pending`, Redux clears the old error and marks the action loading. On fulfillment it stores the returned user and returns to idle. On rejection it keeps the user unchanged and stores a normalized error.

OTP verification and Google authentication follow the same successful pattern: save the rotated CSRF token and set `state.user`.

```js
export const logout = createAsyncThunk('auth/logout', async () => {
  const result = await logoutCustomer();
  setCsrfToken(result.csrfToken);
  return null;
});
```

On successful logout, the slice clears `user`, Google-link state, and errors. If the request fails, it records the error and does not falsely clear the authenticated user.

Registration is called directly by `RegisterPage`, not placed in Redux, because it does not authenticate. After success the page navigates to email verification.

### Axios cookie and CSRF behavior

File: `client/src/api/client.js`

```js
export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();

  if (method && !SAFE_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

`withCredentials: true` tells the browser to send/accept the `multisports.sid` cookie for API requests, including cross-origin development setups permitted by server CORS. The server also has `credentials: true` in `server/src/config/cors.js`.

There is no Authorization header and no response interceptor for token refresh. For every non-GET/HEAD/OPTIONS request, the request interceptor adds the in-memory CSRF value as `X-CSRF-Token` when available. The cookie remains unreadable to JavaScript.

File: `client/src/api/csrf.js`

```js
let csrfToken = null;
export function setCsrfToken(token) { csrfToken = token; }
export function getCsrfToken() { return csrfToken; }
```

The CSRF token is intentionally kept in module memory, not local/session storage. A reload obtains it again through `bootstrapAuth`.

## 6. Frontend — Protected Routes

### Router placement

File: `client/src/app/router/AppRouter.jsx`

```jsx
<Route element={<RequireCustomer />}>
  <Route path='/account' element={<ProfilePage />} />
  <Route path='/account/profile/edit' element={<EditProfilePage />} />
  <Route path='/account/security' element={<SecurityPage />} />
  <Route path='/account/security/email' element={<ChangeEmailPage />} />
  <Route path='/account/addresses' element={<AddressesPage />} />
  <Route path='/account/addresses/new' element={<AddressFormPage />} />
  <Route path='/account/addresses/:addressId/edit' element={<AddressFormPage />} />
</Route>

<Route element={<RequireAdmin />}>
  <Route element={<AdminLayout />}>
    {/* /admin/products, /admin/categories, /admin/inventory and details/forms */}
  </Route>
</Route>
```

The `/shop`, `/search`, and `/products/:productId` storefront routes are public. Account routes are customer-only. All admin pages are admin-only. Auth pages are wrapped by `RequireGuest`.

### Customer/admin guard behavior

File: `client/src/features/auth/RequireCustomer.jsx`

```jsx
if (!initialized) return <p>Checking your session...</p>;

if (!user) {
  return (
    <Navigate
      to='/auth/login'
      replace
      state={{ from: location.pathname + location.search }}
    />
  );
}

if (user.role !== 'customer') {
  return (
    <main className='grid min-h-screen place-items-center p-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Access denied</h1>
        <p className='mt-2 text-gray-600'>This page is for customers.</p>
      </div>
    </main>
  );
}

return <Outlet />;
```

`RequireAdmin` has the same structure but requires `role === 'admin'`.

When an unauthenticated visitor enters a private URL:

1. The guard waits while startup session restoration is incomplete.
2. Once initialized with no user, it redirects to `/auth/login` with `replace`.
3. It saves the original pathname and query string in router state as `from`.
4. After a successful login, `LoginPage` navigates back to `location.state.from`; otherwise it chooses `/account` for customers or `/admin/categories` for admins.

An authenticated user with the wrong role sees an access-denied page rather than being redirected. This frontend guard improves navigation/UX only; backend middleware remains the security boundary.

### Guest-only auth pages

File: `client/src/features/auth/RequireGuest.jsx`

```jsx
if (!initialized) return <p>Checking your session...</p>;

if (user) {
  const destination = user.role === 'admin' ? '/admin/categories' : '/account';
  return <Navigate to={destination} replace />;
}

return <Outlet />;
```

An already authenticated user cannot remain on login/register/recovery pages; the guard routes them to the role-appropriate area.

## 7. End-to-End Flow Diagram

### Password login flow

```text
Browser startup
  -> GET /api/v1/auth/csrf-token
  -> server creates/loads anonymous session and returns CSRF token
  -> browser retains HttpOnly multisports.sid cookie

User submits LoginPage
  -> dispatch(login({ email, password }))
  -> Axios POST /api/v1/auth/login
     - automatically sends multisports.sid (withCredentials)
     - interceptor adds X-CSRF-Token
  -> Express session middleware verifies cookie and loads Mongo session
  -> auth router's requireCsrf timing-safely checks header vs session token
  -> login rate limiter runs
  -> controller validates and normalizes req.body
  -> service queries User by normalized email with +passwordHash
  -> Argon2 verifies the submitted password
  -> service rejects unverified email or returns a safe user
  -> server regenerates the session
     - stores userId
     - stores authenticatedAt
     - creates a fresh CSRF token
     - saves the session in MongoDB
  -> response sends updated session cookie plus JSON { user, csrfToken }
  -> thunk stores CSRF token in module memory
  -> Redux stores user
  -> LoginPage redirects to saved private URL or role default
```

In plain English:

1. On app startup, the browser first gets a CSRF token. That request also gives it an anonymous, HttpOnly session cookie if needed.
2. The user enters email/password in `client/src/pages/auth/LoginPage.jsx`. Submission dispatches the Redux `login` thunk.
3. `client/src/api/authApi.js` posts the credentials using the shared Axios client. Axios includes the session cookie, and its interceptor includes the CSRF header.
4. Express loads the session from MongoDB. The auth router validates the CSRF header and applies the login rate limit before the controller runs.
5. The controller validates the JSON shape and normalizes the email, then calls `authenticatePassword`.
6. The service loads the User plus its normally hidden password hash. Argon2 verifies the password. A missing user, passwordless account, or wrong password produces the same generic invalid-credentials error; an unverified email is rejected separately.
7. On success, the server converts the User to the safe response shape and regenerates the session to prevent fixation. It stores the user's ID and authentication time in MongoDB and rotates the CSRF token.
8. The HTTP response causes the browser to retain the updated signed session-ID cookie and returns `{ user, csrfToken }` in JSON. No JWT is created or sent.
9. The thunk stores the CSRF token in module memory and the user in Redux. `LoginPage` redirects to the originally requested private page, or to the role default.
10. On a later protected API request, the browser again sends the cookie. `express-session` loads the Mongo session, `requireAuth` reads `session.userId`, reloads the current User, and attaches the safe user as `req.user`; role middleware then permits or rejects the route.

### Signup-to-login distinction

Signup follows a deliberately separate sequence:

```text
Register form -> POST /auth/register -> validate -> Argon2id hash
-> create unverified customer -> email OTP -> navigate to verification
-> POST /auth/email-verification/verify -> mark email verified
-> navigate to login -> normal login flow above creates authenticated session
```

The important distinction is that neither registration nor email verification authenticates the browser. A session becomes authenticated only after successful password login, OTP-login verification, or Google authentication.

## Missing or intentionally absent pieces

- No JWT creation/verification code exists.
- No access-token or refresh-token fields exist on User.
- No token refresh endpoint exists; the Mongo-backed session is the continuity mechanism.
- No Mongoose pre-save password hashing hook exists; all hashing is explicit in services.
- No frontend localStorage/sessionStorage auth persistence exists; the HttpOnly cookie plus `/auth/session` bootstrap restores state.
- No frontend route guard can replace backend authorization; this project correctly applies both frontend guards and backend session/role middleware.
