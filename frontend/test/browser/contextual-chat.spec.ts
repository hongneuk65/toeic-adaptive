import { expect, test } from '@playwright/test';

for (const sameGroup of [false, true]) {
test(`question chat sends scoped context and cancels stale streams (${sameGroup ? 'same group' : 'separate groups'})`, async ({ page },info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sent: Record<string, unknown>[] = [];
  const history: string[] = [];
  let releaseSlow: (() => void) | undefined;
  await page.addInitScript(() => localStorage.setItem('accessToken', 'context-fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { id: 1, email: 'learner@example.invalid', role: 'USER' } });
    if (url.pathname === '/api/auth/learning-status') return route.fulfill({ json: { hasLearningActivity: true, onboardingChoice: 'SELF_STUDY', onboardingRequired: false } });
    if (url.pathname === '/api/exam/catalog') return route.fulfill({ json: { totalQuestions: 0, byPart: [], modes: [] } });
    if (url.pathname === '/api/exam/14/review') return route.fulfill({ json: {
      id: 14, examType: 'CUSTOM', selectedParts: [sameGroup ? 7 : 5], totalScore: 0, listeningScore: 0, readingScore: 0,
      answers: [101, 102].map((id, index) => ({ id, questionId: id, selectedAnswer: 'B', isCorrect: false,
        question: { id, part: sameGroup ? 7 : 5, ...(sameGroup ? { stimulus: { version: 1, groupId: 'shared', questionPosition: index + 1, documents: [] } } : {}), content: `Question ${index + 1}`, optionA: 'at', optionB: 'on', optionC: 'in', optionD: 'by', correctAnswer: 'A' } })),
    } });
    if (url.pathname === '/api/rag/chat-history') {
      history.push(url.search);
      return route.fulfill({ json: url.searchParams.has('questionId') ? [{ id: 1, role: 'assistant', content: `History ${url.searchParams.get('questionId')}`, createdAt: new Date().toISOString() }] : [] });
    }
    if (url.pathname === '/api/rag/chat-stream') {
      const payload = route.request().postDataJSON();
      sent.push(payload);
      if (payload.message === 'slow') return new Promise<void>(resolve => { releaseSlow = () => { void route.fulfill({ contentType: 'text/event-stream', body: 'data: {"chunk":"STALE ANSWER"}\n\ndata: [DONE]\n\n' }).then(resolve).catch(resolve); }; });
      return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"chunk":"A contextual answer"}\n\ndata: [DONE]\n\n' });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/exam/14/review');
  await page.getByRole('button', { name: 'Hỏi AI về câu này', exact: true }).first().click();
  const tutor = page.getByRole('complementary', { name: 'Gia sư AI', exact: true });
  await tutor.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Hỏi AI về câu này', exact: true }).first().click();
  await expect(tutor.getByText('History 101', { exact: true })).toBeVisible();
  await expect(tutor).not.toHaveAttribute('aria-modal','true');
  const studyBounds=await page.locator('#learning-main').boundingBox();
  const tutorBounds=await tutor.boundingBox();
  expect(studyBounds).toBeTruthy();expect(tutorBounds).toBeTruthy();
  if((page.viewportSize()?.width??0)>=1100)expect(studyBounds!.x+studyBounds!.width).toBeLessThanOrEqual(tutorBounds!.x+1);
  else expect(studyBounds!.y+studyBounds!.height).toBeLessThanOrEqual(tutorBounds!.y+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  await page.screenshot({path:info.outputPath('tutor-split.png'),fullPage:false});
  await expect.poll(() => history.at(-1)).toBe('?questionId=101&attemptId=14');
  await tutor.getByPlaceholder('Hỏi AI về ngữ pháp, bẫy đề thi...').fill('Tại sao mình sai?');
  await tutor.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(tutor.getByText('A contextual answer', { exact: true })).toBeVisible();
  expect(sent[0]).toMatchObject({ message: 'Tại sao mình sai?', questionId: 101, attemptId: 14, selectedAnswer: 'B' });
  await tutor.getByRole('button', { name: 'Hỏi chung · bỏ câu này' }).click();
  await expect(tutor.getByText('History 101', { exact: true })).toHaveCount(0);
  await expect.poll(() => history.at(-1)).toBe('');
  await tutor.getByPlaceholder('Hỏi AI về ngữ pháp, bẫy đề thi...').fill('slow');
  await tutor.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect.poll(() => !!releaseSlow).toBe(true);
  expect(sent.at(-1)).not.toHaveProperty('questionId');
  expect(sent.at(-1)).not.toHaveProperty('attemptId');
  await tutor.getByRole('button', { name: 'Đóng', exact: true }).click();
  if (!sameGroup) await page.getByRole('button', { name: 'Nhóm tiếp', exact: true }).click();
  await page.getByRole('button', { name: 'Hỏi AI về câu này', exact: true }).nth(sameGroup ? 1 : 0).click();
  await expect(tutor.getByText('History 102', { exact: true })).toBeVisible();
  await expect(tutor.getByText('A contextual answer', { exact: true })).toHaveCount(0);
  await expect.poll(() => history.at(-1)).toBe('?questionId=102&attemptId=14');
  await tutor.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Hỏi AI về câu này', exact: true }).nth(sameGroup ? 1 : 0).click();
  await expect(tutor.getByText('History 102', { exact: true })).toBeVisible();
  if (!sameGroup) {
    // Changing the visible group must release even a repeatedly reopened context.
    await tutor.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.getByRole('button', { name: 'Nhóm trước', exact: true }).click();
    await expect(tutor).toHaveCount(0);
    await page.getByRole('button', { name: 'Hỏi AI về câu này', exact: true }).click();
    await expect(tutor.getByText('History 101', { exact: true })).toBeVisible();
  }
  releaseSlow?.();
  await expect(tutor.getByText('STALE ANSWER', { exact: true })).toHaveCount(0);
  await tutor.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn đề khác', exact: true }).click();
  await expect(page).toHaveURL(/\/exam$/);
  await page.getByRole('button', { name: /Mở.*AI|Gia sư AI|Trợ lý AI/ }).first().click();
  await expect(tutor.getByText('Câu 2 · Chữa bài', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

}

test('adaptive question offers keyboard accessible tutor and restores context after clear', async ({ page }) => {
  const sent: Record<string, unknown>[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('accessToken', 'practice-fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { id: 1, email: 'learner@example.invalid', role: 'USER' } });
    if (url.pathname === '/api/auth/learning-status') return route.fulfill({ json: { hasLearningActivity: true, onboardingChoice: 'SELF_STUDY', onboardingRequired: false } });
    if (url.pathname === '/api/exam/14/review') return route.fulfill({ json: {
      id: 14, examType: 'CUSTOM', selectedParts: [5], totalScore: 0, listeningScore: 0, readingScore: 0,
      answers: [{ id: 1, questionId: 101, selectedAnswer: 'B', isCorrect: false, question: { id: 101, part: 5, content: 'Review question', optionA: 'at', optionB: 'on', optionC: 'in', optionD: 'by', correctAnswer: 'A' } }],
    } });
    if (url.pathname === '/api/rag/explain-error-stream') {
      const result = { questionId: 101, part: 5, selectedAnswer: 'B', correctAnswer: 'A', isCorrect: false,
        nextPractice: { skillId: 1, skillName: 'Giới từ', part: 5, excludeQuestionId: 101 },
        learnerMastery: { skillCode: 'P5_PREP', skillName: 'Giới từ', masteryScore: null, levelDescription: 'Chưa đủ dữ liệu' },
        learnerEvidence: [], presentation: { mode: 'default', description: 'Lời giải', version: 'v1' }, answerOrigin: 'submitted_attempt',
        grounding: 'insufficient', generationStatus: 'stored_only', contextWarnings: [], explanation: 'Lời giải', retrievedSources: [],
        sections: { misconceptionAnalysis: 'Đối chiếu', correctAnswerExplanation: 'Lời giải', keyTakeawayRule: 'Quy tắc', recommendedAction: 'Luyện tiếp' } };
      return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ result })}\n\ndata: [DONE]\n\n` });
    }
    if (url.pathname === '/api/das3h/adaptive-question') return route.fulfill({ json: {
      selectedQuestion: { id: 102, part: 5, content: 'We meet _____ Monday.', optionA: 'at', optionB: 'on', optionC: 'in', optionD: 'by' },
      predictedProb: 0.5, targetProb: 0.7, evaluatedCandidatesCount: 3, isExploration: false,
    } });
    if (url.pathname === '/api/rag/chat-history') return route.fulfill({ json: [] });
    if (url.pathname === '/api/rag/chat-stream') {
      sent.push(route.request().postDataJSON());
      return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"chunk":"Practice answer"}\n\ndata: [DONE]\n\n' });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/exam/14/review');
  await page.getByRole('button', { name: 'Giải thích thêm bằng AI', exact: true }).click();
  await page.getByRole('button', { name: 'Luyện cùng kỹ năng', exact: true }).click();
  const practice = page.getByRole('dialog', { name: 'Luyện kỹ năng', exact: true });
  await practice.getByRole('button', { name: 'B. on', exact: true }).click();
  const ask = practice.getByRole('button', { name: 'Hỏi AI về câu này', exact: true });
  await ask.focus();
  await page.keyboard.press('Enter');
  const tutor = page.getByRole('complementary', { name: 'Gia sư AI', exact: true });
  await expect(tutor.getByText('Luyện kỹ năng · Câu #102', { exact: true })).toBeVisible();
  await tutor.getByRole('textbox', { name: 'Tin nhắn cho Gia sư AI' }).fill('Giải thích lựa chọn của mình');
  await tutor.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(tutor.getByText('Practice answer', { exact: true })).toBeVisible();
  expect(sent[0]).toMatchObject({ questionId: 102, selectedAnswer: 'B' });
  expect(sent[0]).not.toHaveProperty('attemptId');
  await tutor.getByRole('button', { name: 'Hỏi chung · bỏ câu này', exact: true }).click();
  await tutor.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(practice).toBeVisible();
  await ask.click();
  await expect(tutor.getByText('Luyện kỹ năng · Câu #102', { exact: true })).toBeVisible();
  await tutor.getByRole('textbox', { name: 'Tin nhắn cho Gia sư AI' }).fill('Giải thích lại');
  await tutor.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect.poll(() => sent.length).toBe(2);
  expect(sent[1]).toMatchObject({ questionId: 102, selectedAnswer: 'B' });
  expect(errors).toEqual([]);
});
