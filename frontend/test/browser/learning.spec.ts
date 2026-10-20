import { expect, test, type Page } from '@playwright/test';

const question = { id: 101, part: 5, content: 'The meeting starts _____ nine o’clock.', optionA: 'at', optionB: 'in', optionC: 'on', optionD: 'for', passage: null, audioUrl: null, imageUrl: null };
async function fixture(page: Page, options: { lostDraft?: boolean; lostSubmit?: boolean; unauthorized?: boolean; newerDraft?: boolean; readingDocument?: boolean } = {}) {
  let submitted = false;
  let draftRevision = options.newerDraft ? 2 : 0;
  let draftAnswers: { questionId: number; selectedAnswer: string }[] = options.newerDraft ? [{ questionId: 101, selectedAnswer: 'A' }] : [];
  const readingQuestion = { ...question, part: 7, content: 'When is the meeting?', stimulus: { version: 1, groupId: 'meeting-notice', questionPosition: 1, documents: [{ id: 'notice', blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'Staff meeting schedule. Please check your assigned time below.' }] }, { type: 'table', children: [{ type: 'row', children: [{ type: 'cell', children: [{ type: 'text', text: 'Department' }] }, { type: 'cell', children: [{ type: 'text', text: 'Time' }] }] }, { type: 'row', children: [{ type: 'cell', children: [{ type: 'text', text: 'Customer support' }] }, { type: 'cell', children: [{ type: 'text', text: 'Nine o’clock' }] }] }] }] }] } };
  const exam = () => ({ attemptId: 14, examType: 'CUSTOM', selectedParts: options.readingDocument ? [7] : [5], startedAt: new Date().toISOString(), deadlineAt: new Date(Date.now() + 1_200_000).toISOString(), totalQuestions: 1, questions: [options.readingDocument ? readingQuestion : question], draftAnswers, draftRevision, submittedAt: submitted ? new Date().toISOString() : null });
  await page.addInitScript(() => localStorage.setItem('accessToken', 'ui-regression-fixture'));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/auth/me') return json({ id: 1, email: 'test@example.invalid', role: 'USER' });
    if (path === '/auth/google/config') return json({ enabled: false });
    if (path === '/exam/catalog') return json({ source: 'SANTA_EDNET', totalQuestions: 700, byPart: Array.from({ length: 7 }, (_, index) => ({ part: index + 1, count: 100 })), modes: [{ examType: 'FULL', available: true, questionCount: 200 }, { examType: 'MINI', available: true, questionCount: 100 }] });
    if (path === '/history') return json({ items: [], total: 0, pageSize: 12 });
    if (path === '/reading') return json({ articles: [1, 2, 3].map(id => ({ id, title: ['Office announcements', 'A letter to the team', 'Customer service update'][id - 1], ownerId: null, status: 'READY', error: null, generationAttempts: 0, version: { id, title: ['Office announcements', 'A letter to the team', 'Customer service update'][id - 1], topic: 'Workplace', kind: 'EMAIL', difficulty: 'EASY' } })), attempts: [], limits: { maxText: 10000, maxQuestions: 10, generations: 5, tutorCalls: 10 } });
    if (path === '/listening') return json({ sources: [1, 2, 3].map(id => ({ id, title: ['Daily conversations', 'At the airport', 'Office meeting'][id - 1], kind: 'AUDIO', ownerId: null, url: '/fixture.mp3', videoId: null, published: true })), sessions: [], settings: { maxSegmentSeconds: 300, defaultSegmentSeconds: 60 }, asrAvailable: false });
    if (path === '/theory/part/5') return json([{ id: 1, title: 'Word forms', part: 5 }, { id: 2, title: 'Verb tenses', part: 5 }]);
    if (path === '/theory/catalog') return json([{ id: 1, title: 'Word forms', part: 5, skillId: 1, skill: { code: 'P5_PARTS_OF_SPEECH', name: 'Từ loại' }, topic: { id: 'word-forms', title: 'Từ loại & cấu trúc câu', description: 'Danh, động, tính, trạng từ.' } }]);
    if (path === '/theory/1') return json({ id: 1, title: 'Word forms', part: 5, skill: { name: 'Grammar', code: 'GRAMMAR' }, content: '## Identify the missing word\nRead the words before and after the blank.\n\nNouns name people, places and things.' });
    if (path === '/flashcards/folders') return json([1, 2, 3].map(id => ({ id, name: ['Office vocabulary', 'Travel and transport', 'Business meetings'][id - 1], description: 'Từ vựng theo ngữ cảnh thường gặp trong bài thi TOEIC.', count: 12, authorName: 'Library', isOwner: false, code: `TOPIC${id}` })));
    if (path === '/mastery/me') return json({ userId: 1, skills: [{ skillId: 1, skillCode: 'GRAMMAR', skillName: 'Word forms', part: 5, masteryScore: 0.3, practiceCount: 4, lastPracticed: null }], partBreakdown: [], overallMastery: 0.3 });
    if (path === '/rag/priority-roadmap') return json({ prioritySteps: [] });
    if (path === '/auth/login') { options.unauthorized = false; return json({ accessToken: 'restored-fixture' }); }
    if (path === '/exam/14/draft') {
      const body = route.request().postDataJSON();
      draftAnswers = body.answers; draftRevision = body.revision;
      if (options.lostDraft) { options.lostDraft = false; return route.abort(); }
      return json({ draftRevision, savedAt: new Date().toISOString() });
    }
    if (path === '/exam/submit') {
      submitted = true;
      if (options.lostSubmit) return route.abort();
      return json({ attemptId: 14, totalScore: 495 });
    }
    if (path === '/exam/14/review') return json({ id: 14, examType: 'CUSTOM', selectedParts: [5], totalScore: 495, readingScore: 495, listeningScore: 0, answers: [{ id: 1, questionId: 101, selectedAnswer: 'A', isCorrect: true, question: { ...question, correctAnswer: 'A', explanation: 'Use at for clock times.' } }] });
    if (path === '/exam/14') return options.unauthorized ? json({ message: 'Expired' }, 401) : json(exam());
    if (path === '/rag/chat-history') return json([]);
    if (path === '/flashcards/folders/1') return json({ id: 1, name: 'Office vocabulary', count: 2, isOwner: true });
    if (path === '/flashcards/folders/1/cards') return json([{ id: 1, word: 'invoice', meaning: 'hóa đơn' }, { id: 2, word: 'meeting', meaning: 'cuộc họp' }]);
    if (path === '/flashcards/folders/1/reviews') return json([{ cardId: 2, known: true, reviewCount: 1, intervalDays: 1, dueAt: new Date(Date.now() + 86400000).toISOString() }]);
    return json({ message: `Unexpected fixture route ${path}` }, 404);
  });
}

test('exam saves server draft, resumes and recovers a lost submission response', async ({ page }, testInfo) => {
  await fixture(page, { lostDraft: true, lostSubmit: true });
  await page.goto('/exam/14');
  const answer = page.getByRole('radio', { name: 'A at', exact: true });
  await answer.check();
  await expect(page.getByText('Đã lưu máy chủ', { exact: true })).toHaveCount(1);
  await page.reload();
  await expect(answer).toBeChecked();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(element => element.clientWidth));
  if (testInfo.project.name === 'mobile') {
    const material = await page.getByRole('region', { name: 'Tư liệu bài thi', exact: true }).boundingBox();
    const questions = await page.getByRole('region', { name: 'Câu hỏi và đáp án', exact: true }).boundingBox();
    expect(Math.abs(material!.x - questions!.x)).toBeLessThan(2);
    expect(questions!.y).toBeGreaterThanOrEqual(material!.y + material!.height - 1);
    expect(await page.getByRole('button', { name: 'Nộp bài', exact: true }).evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await expect(page).toHaveURL(/\/exam\/14\/review$/);
  await expect(page.getByText('CHỮA BÀI · PART 5', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('exam-review.png'), fullPage: true });
});

test('expired session returns to the same exam after login', async ({ page }) => {
  await fixture(page, { unauthorized: true });
  await page.goto('/exam/14');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('test@example.invalid');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('fixture-only-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/exam\/14$/);
  await expect(page.getByRole('radio', { name: 'A at', exact: true })).toBeVisible();
});

test('stale local answers cannot overwrite a newer server draft', async ({ page }) => {
  await fixture(page, { newerDraft: true });
  await page.addInitScript(() => {
    sessionStorage.setItem('exam_answers_14', JSON.stringify({ 101: 'B' }));
    sessionStorage.setItem('exam_draft_revision_14', '0');
  });
  await page.goto('/exam/14');
  await expect(page.getByRole('button', { name: 'Tải bản lưu máy chủ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nộp bài', exact: true })).toBeDisabled();
  await expect(page.getByRole('radio', { name: 'A at', exact: true })).toBeDisabled();
});

test('flashcard due filter and keyboard recall hide the answer until committed', async ({ page }, testInfo) => {
  await fixture(page);
  await page.goto('/flashcards/1');
  await expect(page.getByRole('heading', { name: 'hóa đơn', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'invoice', exact: true })).toHaveCount(0);
  await page.getByLabel('Câu trả lời của bạn').fill('invoice');
  await page.getByLabel('Câu trả lời của bạn').press('Enter');
  await expect(page.getByRole('paragraph').filter({ hasText: /^invoice$/ })).toBeVisible();
  await page.getByLabel('Lọc trạng thái ghi nhớ').selectOption('known');
  await expect(page.getByRole('heading', { name: 'cuộc họp', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('flashcard.png'), fullPage: true });
});

test('structured reading table stays readable and answers remain reachable', async ({ page }, testInfo) => {
  await fixture(page, { readingDocument: true });
  await page.goto('/exam/14');
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Customer support' })).toBeVisible();
  await page.getByRole('radio', { name: 'A at', exact: true }).check();
  await expect(page.getByText('Đã lưu máy chủ', { exact: true })).toHaveCount(1);
  const overflow = await page.locator('body').evaluate(element => element.scrollWidth > element.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('reading-table.png'), fullPage: true });
});

test('learning workspace exposes clear navigation and a structured exam setup', async ({ page }, testInfo) => {
  await fixture(page);
  await page.goto('/exam');
  await expect(page.getByRole('heading', { name: 'Chọn bài luyện TOEIC', exact: true })).toBeVisible();
  const navigation = page.locator('.learning-navigation');
  await expect(navigation).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('exam-catalog-workspace.png'), fullPage: true });
  await page.getByRole('radio', { name: /Đề rút gọn/ }).check();
  await expect(page.locator('.exam-selection-metrics')).toContainText('100');
  await expect(page.getByRole('heading', { name: 'Kiểm tra gọn trong 60 phút' })).toBeVisible();
  await page.getByRole('radio', { name: /Tự chọn Part/ }).check();
  await expect(page.locator('.exam-selection-metrics')).toContainText('30');
  await page.getByRole('button', { name: 'Bỏ chọn', exact: true }).click();
  await expect(page.locator('.exam-selection-start')).toBeDisabled();
  await expect(page.getByText('Chọn ít nhất một Part để tiếp tục.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chọn tất cả', exact: true }).click();
  await expect(page.locator('.exam-selection-metrics')).toContainText('200');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.exam-selection-content').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('body').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false);
  if (testInfo.project.name === 'mobile') {
    await page.locator('.mobile-nav-trigger').click();
    await navigation.getByRole('link', { name: 'Lịch sử làm bài', exact: true }).click();
  } else {
    const link = navigation.getByRole('link', { name: 'Thi thử', exact: true });
    await expect(link).toHaveAttribute('aria-current', 'page');
    await navigation.locator('.nav-dropdown > summary').filter({ hasText: 'Ôn tập' }).click();
    await navigation.getByRole('link', { name: 'Lịch sử làm bài', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByRole('heading', { name: 'Lịch sử làm bài', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('history-workspace.png'), fullPage: true });
  if (testInfo.project.name === 'desktop') {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/exam');
    await expect(page.getByRole('heading', { name: 'Chọn bài luyện TOEIC', exact: true })).toBeVisible();
    expect(await page.locator('body').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false);
    await page.screenshot({ path: testInfo.outputPath('exam-catalog-tablet.png'), fullPage: true });
  }
});

test('exam catalog failure can be retried without starting an unavailable exam', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/exam/catalog', route => route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } }));
  await page.goto('/exam');
  await expect(page.getByText('Chưa tải được dữ liệu. Vui lòng thử lại.', { exact: true })).toBeVisible();
  await expect(page.locator('.exam-selection-start')).toBeDisabled();
  await page.unroute('**/api/exam/catalog');
  await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
  await expect(page.locator('.exam-selection-start')).toBeEnabled();
});

test('learning sections have top navigation and distinct task layouts', async ({ page }, testInfo) => {
  await fixture(page);
  await page.goto('/dashboard');
  await expect(page.locator('#prep-home-title')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('homepage-brand-reference.png') });
  const homeBrand = await page.locator('.app-brand').innerText();
  if (testInfo.project.name === 'mobile') {
    await page.locator('.mobile-nav-trigger').click();
  } else {
    await page.locator('.nav-dropdown > summary').filter({ hasText: 'Luyện tập' }).click();
  }
  await page.locator('.learning-navigation').getByRole('link', { name: 'Reading', exact: true }).click();
  await expect(page).toHaveURL(/\/reading$/);
  await expect(page.locator('.app-brand')).toHaveText(homeBrand, { useInnerText: true });
  await expect(page.locator('.app-navigation-capsule .learning-navigation')).toBeVisible();
  await expect(page.locator('.study-navigation')).toHaveCount(0);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [path, heading] of [['reading', 'Luyện đọc'], ['listening', 'Luyện nghe'], ['theory', 'Lý thuyết'], ['flashcards', 'Thư mục từ vựng'], ['recommendations', 'Gợi ý học tiếp']]) {
    await page.goto(`/${path}`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.locator('.app-content [role="alert"]')).toHaveCount(0);
    expect(await page.locator('body').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false);
    const navigation = await page.locator('.app-header').boundingBox();
    const main = await page.locator('.app-content').boundingBox();
    expect(main!.y).toBeGreaterThanOrEqual(navigation!.y + navigation!.height - 1);
    if (path === 'reading') await expect(page.getByRole('button', { name: /Office announcements/ })).toBeVisible();
    if (path === 'listening') await expect(page.getByRole('button', { name: /Daily conversations/ })).toBeVisible();
    if (path === 'theory') {
      await page.getByRole('button', { name: /P5 Word forms/ }).click();
      await expect(page.getByRole('heading', { name: 'Word forms', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Làm quiz củng cố →' })).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath(`${path}-section.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});






test('typed retrieval preserves the first answer and attempt ID when saving is retried', async ({ page }) => {
  await fixture(page);
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/flashcards/cards/1/review', async route => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) return route.abort();
    return route.fulfill({ json: { cardId: 1, known: false, reviewCount: 1, dueAt: new Date(Date.now() + 600000).toISOString(), schedulingSource: 'hlr-prior-experimental' } });
  });
  await page.goto('/flashcards/1');
  await page.getByLabel('Câu trả lời của bạn').fill('wrong');
  await page.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click();
  await expect(page.getByLabel('Câu trả lời của bạn')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: 'Đã nhớ', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Lưu lượt ôn', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Lượt ôn chưa được xác nhận');
  await expect(page.getByLabel('Lọc trạng thái ghi nhớ')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tất cả thẻ', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Lưu lượt ôn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đã lưu lượt ôn', exact: true })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'Lịch cá nhân hóa thử nghiệm' })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0]).toMatchObject({ response: 'wrong', recallMode: 'typed', known: false });
  expect(requests[0].attemptId).toMatch(/^[0-9a-f-]{36}$/);
});
