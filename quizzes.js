import { queryOptions } from '@tanstack/react-query'
import { api, asArray } from './client'

/**
 * MCQ quizzes.
 *
 * ⚠️ [VERIFY] — THE BIGGEST OPEN SHAPE QUESTION. The student app has no quiz entity at
 * all; it has a flat vault of Question rows where `source: 'MCQ'` marks practice questions
 * (ca/src/data/questions.js). This module assumes Quiz becomes real. If the decision goes
 * the other way, these endpoints collapse into a questions CRUD and `questions` moves out
 * of the Quiz body. See SHAPES.md.
 *
 * Note `answerIndex` is an INDEX into `options` (0-3) — not the option text, not 'A'-'D'.
 * That is the student app's convention and it is load-bearing.
 *
 * @typedef {import('@/types').Quiz} Quiz
 * @typedef {import('@/types').Question} Question
 */

/**
 * List view does NOT include `questions` — only a count, so the list is one cheap query.
 * @returns {Promise<Array<Omit<Quiz,'questions'> & { questionCount: number }>>}
 */
export const getQuizzes = () => api.get('/api/admin/quizzes').then((r) => asArray(r.data))

/** @returns {Promise<Quiz>} Full quiz, questions included — for the edit form. */
export const getQuiz = (id) => api.get(`/api/admin/quizzes/${id}`).then((r) => r.data)

/**
 * Questions are sent nested. A quiz with no questions is not creatable — the form
 * enforces at least one.
 *
 * @param {{ title: string, subjectId: string, chapterId: string, questions: Omit<Question,'id'|'subjectId'|'chapterId'>[] }} input
 * @returns {Promise<Quiz>}
 */
export const createQuiz = (input) => api.post('/api/admin/quizzes', input).then((r) => r.data)

/** @returns {Promise<Quiz>} Full replacement including the question set. */
export const updateQuiz = (id, input) => api.put(`/api/admin/quizzes/${id}`, input).then((r) => r.data)

/** @returns {Promise<{ ok: true }>} */
export const deleteQuiz = (id) => api.delete(`/api/admin/quizzes/${id}`).then((r) => r.data)

// ── Query layer ──────────────────────────────────────────────────────────────

export const quizKeys = {
  all: ['quizzes'],
  list: () => [...quizKeys.all, 'list'],
  detail: (id) => [...quizKeys.all, 'detail', id],
}

export const quizQueries = {
  list: () => queryOptions({ queryKey: quizKeys.list(), queryFn: getQuizzes }),
  detail: (id) =>
    queryOptions({ queryKey: quizKeys.detail(id), queryFn: () => getQuiz(id), enabled: Boolean(id) }),
}
