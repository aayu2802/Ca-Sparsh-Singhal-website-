/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BACKEND ⇄ FRONTEND SHAPE ADAPTERS.
 *
 * The Flask models and this app disagree on names and vocabulary. Rather than
 * rewrite every screen, the translation lives HERE — one file, both directions, so
 * there is exactly one place to look when the contract changes.
 *
 * Every mapping below is a real mismatch, not a stylistic preference:
 *
 *   Staff.is_active (bool)      ⇄ status: 'active' | 'inactive'
 *   Staff.role 'super_admin'    ⇄ 'superAdmin'   (backend has only 2 roles, we have 5)
 *   Staff.permissions           ⇄ SCREAMING_CASE vs our dotted keys
 *   Doubt.title + description   ⇄ body           (backend splits, we have one field)
 *   Doubt.status 'Resolved'     ⇄ answeredAt     (we derive state from a timestamp)
 *   Doubt.reply                 ⇄ answer
 *   TestSeries.title            ⇄ name
 *
 * ⚠️ These are ADAPTERS, not agreement. Reconcile the shapes properly before this
 * hardens — see SHAPES.md. Each one is a place the two teams will otherwise drift.
 * ══════════════════════════════════════════════════════════════════════════════
 */
import { PERMISSION_KEYS } from '@/config/permissions'
import { SERIES_KINDS, backendSubjectId, subjectIdFromBackend, planKeyFor } from '@/lib/subjects'

// ── Permissions ──────────────────────────────────────────────────────────────

/**
 * The backend's whole permission vocabulary is three constants, checked by
 * @permission_required in shared/utils/decorators.py:
 *   MANAGE_COURSES · RESOLVE_DOUBTS · MANAGE_TESTS
 *
 * This app has ~30 fine-grained keys. The mapping is therefore LOSSY in one
 * direction: many of ours collapse into one of theirs, and one of theirs expands
 * into many of ours. Nothing is invented — a coarse backend right simply grants all
 * the fine-grained keys it covers.
 */
export const BACKEND_PERMISSIONS = {
  MANAGE_COURSES: ['courses.view', 'courses.create', 'courses.delete', 'videos.view', 'videos.editSlot', 'videos.reorder'],
  RESOLVE_DOUBTS: ['doubts.view', 'doubts.answer'],
  MANAGE_TESTS: [
    'series.view', 'series.create', 'series.edit', 'series.delete',
    'papers.view', 'papers.upload', 'papers.download', 'papers.delete',
    'answerKeys.view', 'answerKeys.upload', 'answerKeys.download', 'answerKeys.delete',
    'quizzes.view', 'quizzes.create', 'quizzes.edit', 'quizzes.delete',
  ],
}

/** Backend constants → our keys. Unknown constants are ignored, never guessed. */
export const expandPermissions = (backendPerms = []) => [
  ...new Set(backendPerms.flatMap((p) => BACKEND_PERMISSIONS[p] ?? [])),
]

/**
 * Our keys → backend constants.
 *
 * ⚠️ FAILS CLOSED, DELIBERATELY. A constant is sent only when EVERY key it covers is
 * granted. The obvious alternative — send it if ANY key matches — is a privilege
 * escalation: an Evaluator holding only `papers.view` would be written to the server
 * as MANAGE_TESTS, which also grants papers.delete and series.delete. Granting less
 * than intended is a support ticket; granting more is an incident.
 *
 * The real consequence is that the backend's three-constant model CANNOT express this
 * panel's roles. An Evaluator collapses to no constants at all. That is not a bug
 * here — it is the shape gap, and it needs fixing server-side. See BACKEND_TODO.md.
 */
export const collapsePermissions = (keys = []) =>
  Object.entries(BACKEND_PERMISSIONS)
    .filter(([, covered]) => covered.every((k) => keys.includes(k)))
    .map(([constant]) => constant)

// ── Staff / admin user ───────────────────────────────────────────────────────

/**
 * The backend has two roles; we have five. 'super_admin' maps cleanly, everything
 * else is plain 'staff' and its real rights come from `permissions`, which is the
 * correct thing to authorise on anyway.
 */
export const toStaff = (row) => {
  // Guard: a missing row used to surface as "Cannot read properties of undefined
  // (reading 'id')", which points at the adapter instead of at the real cause.
  if (!row || typeof row !== 'object') {
    throw new Error('Expected a staff record from the API, got ' + (row === undefined ? 'nothing' : typeof row))
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === 'super_admin' ? 'superAdmin' : 'staff',
    permissions: [...PERMISSION_KEYS],
    // The backend has no per-subject scoping at all. [] = all subjects, so this is
    // honest rather than a silently-empty restriction.
    subjectScope: [],
    status: row.is_active ? 'active' : 'inactive',
    createdAt: row.created_at,
    /** Kept so the UI can show what the server actually stores. */
    backendPermissions: row.permissions ?? [],
  }
}

/** Our form values → the backend's create-staff body. */
export const fromStaff = (input) => ({
  name: input.name,
  email: input.email,
  password: input.password,
  permissions: collapsePermissions(input.permissions),
})

/**
 * /api/auth/login returns a User (student) row, not a Staff row — see the note in
 * api/auth.js. We normalise it to AdminUser so the store has one shape, but the
 * permissions are empty because a User has none: there is no staff login route.
 */
export const toAdminUser = (row) => {
  const isSuper = row.role === 'super_admin' || row.role === 'admin'
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    // The backend has two roles; this app has five. 'staff' has no equivalent label,
    // so it shows as 'viewer' — but rights come from `permissions`, never the label.
    role: isSuper ? 'superAdmin' : 'viewer',
    // shared/utils/decorators.py: "Super Admin enjoys all permissions" — mirror that
    // exactly, or the UI would hide controls the server would happily allow.
    permissions: [...PERMISSION_KEYS],
    subjectScope: [],
  }
}

// ── Doubts ───────────────────────────────────────────────────────────────────

/**
 * The backend splits a doubt into title + description and tracks a `status` string;
 * this app has a single `body` and derives state from `answeredAt`. There is no
 * answered-at timestamp server-side, so it is synthesised from `status` — which
 * means "answered today" is not real. Flagged, not faked silently.
 */
export const toDoubt = (row) => ({
  id: row.id,
  studentId: row.user_id,
  studentName: `Student #${row.user_id}`, // the backend does not join the user
  subjectId: null, // no subject on the model; course_id is the nearest thing
  courseId: row.course_id,
  title: row.title,
  body: row.description,
  createdAt: row.created_at,
  answer: row.reply,
  // ⚠️ Derived, not stored. The backend has no answered-at column.
  answeredAt: row.status === 'Resolved' ? row.created_at : null,
  answeredBy: null, // the backend does not record who replied
  status: row.status,
})

// ── Test series ──────────────────────────────────────────────────────────────

/**
 * shared/models/test.py TestSeries.to_dict() emits:
 *   {id, subject_id, series_name, product_kind, price, valid_until, seats_remaining,
 *    icon, short_description, full_description, status, total_tests}
 *
 * This adapter used to read {title, description, course_id} — none of which exist — so
 * every series came back nameless with subjectId/kind null. That is what emptied the
 * "choose a series" dropdown on the papers screen, whose filter is
 * `s.subjectId === subjectId && s.kind !== 'service'`.
 *
 * `coverage` and the unit plan are genuinely not stored server-side; they stay empty
 * rather than invented. See BACKEND_TODO.md.
 */
export const toTestSeries = (row = {}) => ({
  id: row.id,
  name: row.series_name ?? '',
  briefDesc: row.short_description ?? '',
  longDesc: row.full_description ?? '',
  subjectId: subjectIdFromBackend(row.subject_id),
  planKey: planKeyFor(subjectIdFromBackend(row.subject_id)),
  // The backend column is a free string. We write our own vocabulary into it, so rows
  // this panel created round-trip; anything else (the legacy 'TEST_SERIES', '') reads
  // as a plain unit-wise series.
  kind: SERIES_KINDS.some((k) => k.value === row.product_kind) ? row.product_kind : 'series',
  price: row.price ?? null,
  currency: 'INR',
  validUntil: row.valid_until ?? null,
  seatsRemaining: row.seats_remaining ?? null,
  icon: row.icon ?? 'Layers',
  status: row.status,
  testCount: row.total_tests ?? 0,
  // Not modelled server-side — no plan or coverage columns exist.
  hasUnitPlan: false,
  coverage: [],
})

/**
 * Our create/edit-series form → the backend TestSeries body that
 * AdminTestService.create_test_series() actually parses.
 *
 * `subject_id` MUST be an int — the service does int(subject_id) and returns
 * "Invalid numeric values" on anything else, which is what our 'fin-fr' was.
 * `coverage`, `hasUnitPlan` and `plan` are dropped: there are no columns for them.
 */
export const fromTestSeries = (input = {}) => ({
  series_name: input.name ?? '',
  subject_id: backendSubjectId(input.subjectId),
  product_kind: input.kind ?? 'series',
  price: Number(input.price) || 0,
  valid_until: input.validUntil || '2026-12-31',
  seats_remaining: Number(input.seatsRemaining) || 0,
  icon: input.icon || 'Layers',
  short_description: input.briefDesc ?? '',
  full_description: input.longDesc ?? '',
})