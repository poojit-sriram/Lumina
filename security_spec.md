# Security Specification & Dirty Dozen Threat Model

## 1. Data Invariants
1. **Identity Integrity**: Every user-authored document (`posts`, `comments`, `likes`, `saves`, `follows`, `stories`, `messages`, `notifications`) must enforce `authorId / userId / senderId / actorId == request.auth.uid` on creation (except bootstrapped admin seeding).
2. **PII Isolation**: User email addresses reside exclusively in `/users/{userId}/private/info`, readable and writable solely by `request.auth.uid == userId`. Public `/users/{userId}` documents contain zero PII.
3. **Private Messaging Isolation**: Conversations and their nested messages are strictly accessible only to the 2 UIDs listed in `participants`. Non-participants cannot `get`, `list`, `create`, or `update` any conversation or message.
4. **Atomic Engagement Counters**: `likesCount` and `savesCount` on `/posts/{postId}` can only change by `+1` or `-1` in lockstep with `existsAfter` / `!existsAfter` on `/likes/{postId}_{uid}` and `/saves/{postId}_{uid}`.
5. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time`; `createdAt` and `authorId` are immutable after creation.
6. **Strict Schema & Bounds**: Every string field has explicit `.size()` bounds; arrays are strictly capped (`tags <= 8`, `favoriteTopics <= 6`, `participants == 2`, `unreadBy <= 2`); unknown shadow fields are rejected via `keys().hasOnly(...)`.

## 2. The Dirty Dozen Adversarial Payloads
1. **Shadow Field Injection on Profile**: `{ uid, username, ..., isAdmin: true }` -> Rejected by `keys().hasOnly(...)`.
2. **Author Spoofing on Post**: `{ id, authorId: "other_uid", ... }` -> Rejected because `authorId != request.auth.uid`.
3. **PII Theft on Private Info**: Non-owner `get /users/victim/private/info` -> Rejected by `isOwner(userId)`.
4. **DM Snooping via List Query**: User C runs `list /conversations` without participant match -> Rejected by `request.auth.uid in resource.data.participants`.
5. **DM Message Injection into Foreign Thread**: User C creates `/conversations/A_B/messages/msg1` -> Rejected by Master Gate `get(...).data.participants == incoming().participants` and `request.auth.uid in incoming().participants`.
6. **Unbounded ID Poisoning**: Creating `/posts/aaaa...200chars` -> Rejected by `isValidId(postId)` (`<= 128` chars, regex).
7. **Timestamp Forgery**: Creating a post with `createdAt: "2099-01-01"` -> Rejected by `incoming().createdAt == request.time`.
8. **Immutable Author Hijack on Update**: Updating a post to change `authorId` -> Rejected by `affectedKeys().hasOnly(...)` and `incoming().authorId == existing().authorId`.
9. **Counter Manipulation Without Like Doc**: Updating `/posts/p1` `likesCount: 9999` without creating `/likes/p1_{uid}` -> Rejected by `incoming().likesCount == existing().likesCount + 1 && existsAfter(...)`.
10. **Orphaned Comment Creation**: Creating `/posts/nonexistent/comments/c1` -> Rejected by `exists(/databases/$(database)/documents/posts/$(postId))`.
11. **Notification Snooping / Tampering**: User B reading or deleting User A's notifications -> Rejected by `resource.data.recipientId == request.auth.uid`.
12. **Unverified Email Bypass**: Unverified account attempting write -> Rejected by `request.auth.token.email_verified == true`.
