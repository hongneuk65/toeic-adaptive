import { expect, test } from '@playwright/test';

test('knowledge quiz keeps the selected question available to tutor before and after grading', async ({ page }) => {
  const sent: Record<string, unknown>[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('accessToken', 'quiz-context-fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { id: 1, role: 'USER', email: 'learner@example.invalid' } });
    if (url.pathname === '/api/auth/learning-status') return route.fulfill({ json: { hasLearningActivity: true, onboardingChoice: 'SELF_STUDY', onboardingRequired: false } });
    if (url.pathname === '/api/theory/7/quiz') return route.fulfill({ json: [{ id: 203, part: 5, content: 'We meet _____ Monday.', optionA: 'at', optionB: 'on', optionC: 'in', optionD: 'by' }] });
    if (url.pathname === '/api/theory/7/quiz/submit') return route.fulfill({ json: { totalQuestions: 1, correctCount: 0, scorePercentage: 0, details: [{ questionId: 203, selectedAnswer: 'A', correctAnswer: 'B', isCorrect: false, explanation: 'Use on for days.' }] } });
    if (url.pathname === '/api/mastery/activities') return route.fulfill({ json: { generatedAt: new Date().toISOString(), sections: { theory: [], vocabulary: [], listening: [], reading: [] } } });
    if (url.pathname === '/api/rag/chat-history') return route.fulfill({ json: [] });
    if (url.pathname === '/api/rag/chat-stream') {
      sent.push(route.request().postDataJSON());
      return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"chunk":"Question-aware response"}\n\ndata: [DONE]\n\n' });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/theory/7/quiz');
  await page.getByRole('radio').first().check();
  const ask = page.getByRole('button', { name: 'Hỏi AI về câu này', exact: true });
  await ask.press('Enter');
  const tutor = page.getByRole('complementary', { name: 'Gia sư AI', exact: true });
  await expect(tutor.getByText('Câu 1 · Ôn kiến thức', { exact: true })).toBeVisible();
  const input = tutor.getByRole('textbox', { name: 'Tin nhắn cho Gia sư AI' });
  await input.fill('Explain my choice');
  await tutor.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(tutor.getByText('Question-aware response', { exact: true })).toBeVisible();
  expect(sent[0]).toMatchObject({ questionId: 203, selectedAnswer: 'A' });
  expect(sent[0]).not.toHaveProperty('attemptId');
  await tutor.getByRole('button', { name: 'Hỏi chung · bỏ câu này' }).click();
  await tutor.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Nộp bài quiz', exact: true }).click();
  await expect(page.getByText('Use on for days.')).toBeVisible();
  await expect(ask).toBeEnabled();
  await ask.click();
  await expect(tutor.getByText('Câu 1 · Ôn kiến thức', { exact: true })).toBeVisible();
  await input.fill('Why did I get this wrong?');
  await tutor.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(tutor.getByText('Question-aware response', { exact: true })).toBeVisible();
  expect(sent.at(-1)).toMatchObject({ questionId: 203, selectedAnswer: 'A' });
  expect(errors).toEqual([]);
});
