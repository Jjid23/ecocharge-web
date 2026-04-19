# Security Specification: EcoCharge Kiosk

## Data Invariants
1. A transaction must belong to a valid user.
2. A user can only read and write their own profile data (except for internal fields).
3. Kiosk data is publicly readable but only writable by admins (simulated for this kiosk environment).
4. Credits and bottlesRecycled in the User document should only increment if a valid transaction is created (handled via rules/logic).
5. Transaction documents are immutable once created.

## The "Dirty Dozen" Payloads (Test Cases)
1. **Malicious User Create**: Attempt to create a user profile for someone else.
2. **Credit Injection**: Trying to update `credits` directly without a transaction.
3. **Ghost Field**: Adding `isAdmin: true` to a user profile.
4. **Invalid Kiosk Update**: Non-admin attempting to put a kiosk in "Maintenance".
5. **ID Poisoning**: Creating a transaction with a massive 1MB string as ID.
6. **Self-Assigned Transaction**: Creating a transaction for another user.
7. **Negative Bottles**: Reporting -10 bottles recycled.
8. **Double Counting**: Updating a transaction after it was successfully saved.
9. **Private Profile Hack**: Reading another user's private recycling history.
10. **Timestamp Spoofing**: Sending a transaction with a timestamp from 2 years ago.
11. **Shadow Join**: Joining a kiosk session as an unauthorized user.
12. **PII Leak**: Querying the global `users` collection for emails without ownership.

## Test Runner (firestore.rules.test.ts)
(This is a conceptual plan for the tests as per instructions)
- Verify `allow create` on `/users/{uid}` fails if `uid != auth.uid`.
- Verify `allow update` on `/users/{uid}` fails if `affectedKeys().hasAny(['credits'])` (should be controlled).
- Verify `allow create` on `/transactions/{tid}` fails if `request.resource.data.userId != auth.uid`.
- Verify `allow update` on `/kiosks/{kid}` fails for non-admins.
