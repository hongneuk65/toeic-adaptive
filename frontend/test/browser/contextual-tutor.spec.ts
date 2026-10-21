import { expect, test } from '@playwright/test';

test('question tutor sends attempt context, changes presentation and shows evidence limits', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests: Record<string, unknown>[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'tutor-fixture'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 1, email: 'learner@example.invalid', role: 'USER' } });
    if (path === '/api/exam/14/review') return route.fulfill({ json: { id: 14, examType: 'CUSTOM', selectedParts: [5], totalScore: 0, listeningScore: 0, readingScore: 0,
      answers: [{ id: 1, questionId: 101, selectedAnswer: 'B', isCorrect: false, question: { id: 101, part: 5, content: 'The meeting starts _____ nine.', optionA: 'at', optionB: 'on', optionC: 'in', optionD: 'by', correctAnswer: 'A' } }] } });
    if (path === '/api/rag/explain-error-stream') {
      const request = route.request().postDataJSON(); requests.push(request);
      const result = { questionId: 101, part: 5, selectedAnswer: 'B', correctAnswer: 'A', isCorrect: false,
        learnerMastery: { skillCode: 'P5_PREP', skillName: 'Giới từ', masteryScore: null, levelDescription: 'Chưa đủ dữ liệu' },
        learnerEvidence: [{ id: 1, name: 'Giới từ', attempts: 1, distinctQuestions: 1, recentAttempts: 1, status: 'insufficient' }],
        presentation: { mode: request.mode, style: 'neutral', description: 'Giải thích rõ ràng, chưa kết luận trình độ', version: 'v1' }, answerOrigin: 'submitted_attempt',
        grounding: 'insufficient', generationStatus: 'stored_only', knowledgeNotice: 'Chưa có tài liệu được duyệt để kiểm chứng thêm.', contextWarnings: [],
        explanation: 'Thông tin lưu sẵn', retrievedSources: [], sections: { misconceptionAnalysis: 'Đối chiếu lựa chọn, chưa kết luận nguyên nhân sai.', correctAnswerExplanation: 'Lời giải lưu sẵn.', keyTakeawayRule: 'Chưa có tài liệu được duyệt.', recommendedAction: 'Xem lại ngữ cảnh.' } };
      return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ chunk: result.explanation })}\n\ndata: ${JSON.stringify({ result })}\n\ndata: [DONE]\n\n` });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/exam/14/review');
  await page.getByRole('button', { name: 'Giải thích thêm bằng AI' }).click();
  const dialog = page.getByRole('dialog', { name: 'Giải thích câu hỏi', exact: true });
  await expect(dialog.getByText('Chưa có tài liệu được duyệt để kiểm chứng thêm.', { exact: true })).toBeVisible();
  for (const [label, mode] of [['Giải thích dễ hơn', 'simpler'], ['Cho ví dụ', 'example'], ['Giải thích sâu hơn', 'deeper']]) {
    const button = dialog.getByRole('button', { name: label, exact: true });
    await expect(button).toBeEnabled(); await button.click();
    await expect(button).toBeEnabled(); await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => requests.at(-1)?.mode).toBe(mode);
  }
  expect(requests.every(request => request.attemptId === 14 && request.questionId === 101)).toBe(true);
  expect(requests.every(request => !('masteryScore' in request))).toBe(true);
  await dialog.getByText('Căn cứ điều chỉnh cách giải thích', { exact: true }).click();
  await expect(dialog.getByText('DAS3H là dự đoán, không phải kết luận trình độ đã được kiểm chứng.', { exact: true })).toBeVisible();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('contextual-tutor.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Đã hiểu bài' }).click();
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});
