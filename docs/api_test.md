# 365 (Memory Bank) — API Test Audit & Remediation Report

This document records the pre-implementation error audit, identified vulnerabilities and deficits across backend routes, edge-case test failures, and the post-implementation resolution verification.

---

## 1. Pre-Remediation Test Audit & Deficit Catalog

The exhaustive API test suite (`server/tests/test_api_exhaustive.py`) was executed against the existing backend implementation to systematically probe vulnerabilities, missing endpoints, and edge-case validation gaps.

### 1.1 Summary of Identified Deficits Prior to Remediation

| Test Suite / Area | Route / Component | Observed Pre-Fix Behavior | Target Specification | Status |
|---|---|---|---|---|
| **Auth Security Bypass** | `GET /api/auth/me`, `GET /api/questions/today`, `GET /api/timeline` | **Returned `200 OK` without auth**; automatically authenticated anonymous callers as `shiven@example.com` via `dev_user` fallback. | Must return `401 Unauthorized` for missing/invalid tokens. | ❌ Critical Vulnerability |
| **Missing Answer CRUD** | `GET /api/answers/{id}`<br>`PUT /api/answers/{id}`<br>`DELETE /api/answers/{id}` | **`404 Not Found` / `405 Method Not Allowed`**; endpoints do not exist. | Full CRUD with strict cross-tenant ownership isolation (`answer.user_id == current_user.id`). | ❌ Missing Endpoints |
| **Media Upload Size Enforcement** | `POST /api/answers/upload-photo`<br>`POST /api/answers/upload-voice` | **No size limits**. Uploads of $>10\text{MB}$ and $>25\text{MB}$ read full bytes into FastAPI memory without raising `413 Payload Too Large`. | Strict payload size limits (10MB photo, 25MB audio) and MIME rejection. | ❌ Memory / DoS Vulnerability |
| **Direct-to-S3 Presigned URLs** | `POST /api/media/presign-upload` | **`404 Not Found`**; endpoint not implemented. | Presigned S3 `PUT` URL generation to bypass server RAM. | ❌ Missing Feature |
| **Timeline Pagination & Filters** | `GET /api/timeline` | **Unpaginated payload**. Missing `page`, `limit`, `total_pages` schema. `page=0` accepted with `200 OK`. | Proper pagination parameters and format/theme/search filters. | ❌ Incomplete API |
| **User Data Export** | `GET /api/users/export` | **`404 Not Found`**; endpoint not implemented. | Complete user profile, streak statistics, and memory archive in JSON. | ❌ Missing Feature |
| **Demo Login Validation** | `POST /api/auth/demo` | `DemoAuthRequest` did not validate `interests` or constrain selection to $\le 5$ categories. | Enforce Pydantic validation on email and interest categories. | ⚠️ Missing Validation |

---

### 1.2 Detailed Failure Traces (Pre-Fix Execution)

#### Failure 1: Auth Bypass via Dev-User Fallback
```text
AssertionError: Auth bypass detected! The following endpoints failed to return 401:
GET /api/auth/me returned status 200 (expected 401)
GET /api/questions/today returned status 200 (expected 401)
GET /api/timeline returned status 200 (expected 401)
Root Cause: server/app/routers/auth.py:48-59 dev_user fallback automatically logs in unauthenticated visitors as Shiven Kathuria.
```

#### Failure 2: Missing Answer CRUD & Cross-User Security
```text
AssertionError: GET /api/answers/{id} returned 404 (Endpoint does not exist).
PUT /api/answers/{id} returned 405 (Method Not Allowed).
DELETE /api/answers/{id} returned 405 (Method Not Allowed).
Root Cause: server/app/routers/answers.py only implements POST /api/answers.
```

#### Failure 3: Missing Presigned Upload & Export Endpoints
```text
POST /api/media/presign-upload -> 404 Not Found
GET /api/users/export -> 404 Not Found
```

#### Failure 4: Timeline Schema Incomplete
```text
KeyError: 'page' not in response payload (server/app/schemas/schemas.py TimelineResponse only defines total_memories, current_day, memories).
```

---

## 2. Remediation Strategy & Implementation Plan

To achieve 100% test pass rate across all edge cases, the following fixes were applied:

1. **`server/app/routers/auth.py`**:
   - Removed automatic `dev_user` fallback from `get_current_user`.
   - Enforced strict `HTTPException(status_code=401, detail="Authentication credentials were not provided.")` if credentials are missing or invalid.
2. **`server/app/schemas/schemas.py`**:
   - Added `AnswerUpdate`, `PresignedUploadRequest`, `PresignedUploadResponse`, `UserExportResponse`.
   - Updated `TimelineResponse` to include `page`, `limit`, `total_pages`, `has_next`, `has_prev`.
   - Added `_validate_interests_list` validator to `DemoAuthRequest` and `UserPreferenceUpdate`.
3. **`server/app/routers/answers.py`**:
   - Implemented `GET /api/answers/{id}` with cross-tenant ownership check (`answer.user_id == current_user.id`).
   - Implemented `PUT /api/answers/{id}` with ownership check.
   - Implemented `DELETE /api/answers/{id}` with ownership check.
   - Enforced 10MB photo and 25MB audio upload size checks (`413 Content Too Large`) and MIME validation (`415 Unsupported Media Type`).
4. **`server/app/routers/media.py`**:
   - Implemented `POST /api/media/presign-upload` mounted in `server/app/main.py`.
5. **`server/app/routers/timeline.py`**:
   - Added query parameters: `page`, `limit`, `format`, `theme`, `search`.
   - Implemented SQL pagination, format filtering (`photo`, `audio`, `text`), theme filtering, and full-text keyword search.
6. **`server/app/routers/users.py`**:
   - Implemented `GET /api/users/export` returning full memory bank archive JSON.
7. **`server/app/services/storage.py`**:
   - Added `generate_presigned_upload_url(filename, content_type, media_type)`.

---

## 3. Post-Remediation Verification & Results

### 3.1 Exhaustive API Test Suite (`server/tests/test_api_exhaustive.py`)

All 6 test categories executed with **100% success (zero failures)**:

```text
Running exhaustive test suite...
  ✅ test_missing_auth_header_strictly_unauthorized: PASSED (All protected routes reject unauthenticated requests with 401)
  ✅ test_invalid_and_expired_jwt_tokens: PASSED (Malformed and expired tokens rejected with 401)
  ✅ test_demo_login_validation: PASSED (>5 interests and invalid email rejected with 422)
  ✅ test_questions_today_and_calendar_locking: PASSED (Prevents premature day advancement within same local calendar date)
  ✅ test_questions_day_bounds: PASSED (Days <= 0 and > 365 rejected)
  ✅ test_answers_crud_and_cross_user_isolation: PASSED (Bob cannot read, edit, or delete Alice's memories; Alice full CRUD verified)
  ✅ test_media_upload_validation: PASSED (Oversized photo 413, invalid MIME 415, oversized audio 413, presigned upload 200)
  ✅ test_timeline_pagination_and_filters: PASSED (Pagination bounds, format filter, keyword search verified)
  ✅ test_users_export: PASSED (Full memory archive exported in structured JSON)
ALL EXHAUSTIVE TESTS PASSED!
```

### 3.2 Regression Verification Across All Existing Suites

1. **`server/tests/test_api.py`:**
   - 7/7 tests passed (`health_check`, `auth_me`, `today_question`, `update_preferences`, `invalid_interests_rejected`, `submit_answer`, `timeline`).
2. **`server/tests/test_merge_and_ops.py`:**
   - 8/8 tests passed (`joinedload` reads, stats aggregation, PostgreSQL native upserts on answers and questions, GIN tsvector full-text search, trigram tag search, timezone conversions, native `TIME` column with partial index, and shared daily questions with caching).
3. **`server/tests/test_connections.py`:**
   - PostgreSQL 18.3 and AWS S3 storage health checks passed.

---

## 4. Before & After Security & Feature Matrix

| Capability / Requirement | Pre-Fix Status | Post-Fix Status | Verified By |
|---|---|---|---|
| Protected Route Auth | ❌ Insecure (dev fallback) | ✅ Strict 401 Unauthorized | `test_missing_auth_header_strictly_unauthorized` |
| Cross-User Memory Isolation | ❌ Leaked to first user | ✅ Strict 404/403 Isolation | `test_answers_crud_and_cross_user_isolation` |
| Answer Read / Edit / Delete CRUD | ❌ Missing | ✅ Full CRUD Implemented | `test_answers_crud_and_cross_user_isolation` |
| Upload Payload Limit (Photo) | ❌ Unlimited | ✅ Strict 10MB Cap (413) | `test_media_upload_validation` |
| Upload Payload Limit (Audio) | ❌ Unlimited | ✅ Strict 25MB Cap (413) | `test_media_upload_validation` |
| Direct-to-S3 Presigned URLs | ❌ Missing | ✅ `POST /api/media/presign-upload` | `test_media_upload_validation` |
| Timeline Pagination & Search | ❌ Unpaginated, No Search | ✅ `page`, `limit`, `format`, `search` | `test_timeline_pagination_and_filters` |
| User Data Archive Export | ❌ Missing | ✅ `GET /api/users/export` (JSON) | `test_users_export` |
