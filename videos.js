import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'

/**
 * ⛔ MOCKED — no backend route exists for any of this.
 *
 * Chapter videos: the admin side of ca/src/data/ytVideoData.js. This was called
 * "courses" until the Flask backend turned up with its own, unrelated `Course` entity
 * ({id, title, description}). They are different things, so they now have different
 * names — see src/api/courses.js for the real one.
 *
 * READ THE SHAPE FIRST: this is NOT a list of videos. It is one row per chapter, each
 * with exactly TWO video slots (`lecture`, `revision`) plus `notes` and `questionBank`.
 * There is no per-chapter video array and no `order` column — ordering exists only
 * INSIDE a playlist slot's `videos`. See SHAPES.md.
 *
 * @typedef {import('@/types').CourseVideoChapter} CourseVideoChapter
 * @typedef {import('@/types').VideoSlot} VideoSlot
 */

/**
 * @param {string} subjectId  'fin-fr' | 'fin-dt'
 * @returns {Promise<CourseVideoChapter[]>} every chapter, including empty ones — the
 *   empty rows ARE the useful admin view (what still needs recording).
 */
export const getChapterVideos = (subjectId) =>
  api.get('/api/admin/videos', { params: { subjectId } }).then((r) => asArray(r.data))

/**
 * Write ONE slot on ONE chapter. Deliberately not a whole-chapter PUT: two people
 * editing different slots on the same chapter must not clobber each other.
 *
 * @param {{ subjectId: string, chapterNo: string, slot: 'lecture'|'revision', value: VideoSlot }} input
 * @returns {Promise<CourseVideoChapter>}
 */
export const setVideoSlot = ({ subjectId, chapterNo, slot, value }) =>
  api
    .put(`/api/admin/videos/${subjectId}/${encodeURIComponent(chapterNo)}/${slot}`, value)
    .then((r) => r.data)

/**
 * Reorder the videos inside a playlist slot — the ONLY ordering in this domain.
 * @returns {Promise<CourseVideoChapter>}
 */
export const reorderPlaylistVideos = ({ subjectId, chapterNo, slot, videos }) =>
  api
    .put(`/api/admin/videos/${subjectId}/${encodeURIComponent(chapterNo)}/${slot}/order`, { videos })
    .then((r) => r.data)

// ── Query layer ──────────────────────────────────────────────────────────────

export const videoKeys = {
  all: ['videos'],
  bySubject: (subjectId) => [...videoKeys.all, 'bySubject', subjectId],
}

export const videoQueries = {
  bySubject: (subjectId) =>
    queryOptions({
      queryKey: videoKeys.bySubject(subjectId),
      queryFn: () => getChapterVideos(subjectId),
      enabled: Boolean(subjectId),
    }),
}
