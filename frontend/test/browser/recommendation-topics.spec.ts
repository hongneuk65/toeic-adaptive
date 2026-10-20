import { expect, test } from '@playwright/test';
const topics = Array.from({ length: 12 }, (_, i) => ({ id: `topic-${i}`, title: `Chủ đề ${i + 1}`, description: 'Kết nối kiến thức và luyện tập trong cùng một chủ đề.', parts: [i < 4 ? 2 : 5], skillIds: [i + 1], observedSkillCount: i ? 0 : 1, totalSkillCount: 2, estimatedSuccess: i ? null : .42, evidenceStatus: i ? 'unassessed' : 'limited', priority: i ? 'diagnostic' : 'focus', recommendedSkillId: i + 1, lesson: { id: i + 1, title: 'Bài học', part: 5 } }));
test('topic recommendations are compact, filterable and connect practice with theory', async ({ page }, testInfo) => {
  let roadmapCalls = 0;
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') return route.fulfill({ json: { id: 1, role: 'USER', email: 'fixture@example.invalid' } });
    if (path === '/mastery/me') return route.fulfill({ json: { userId: 1, skills: topics.map((t, i) => ({ skillId: i + 1, skillCode: `SKILL_${i}`, skillName: t.title, part: t.parts[0], masteryScore: .42, practiceCount: i ? 0 : 3, lastPracticed: null })), partBreakdown: [], overallMastery: .42, topicGroups: topics } });
    if (path === '/rag/priority-roadmap') roadmapCalls++;
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/recommendations');
  await expect(page.locator('.topic-card')).toHaveCount(3);
  await page.locator('.topic-browse > summary').click();
  await expect(page.locator('.topic-library-item')).toHaveCount(6);
  await expect(page.locator('.topic-card').nth(1)).toContainText('Chưa đủ dữ liệu');
  await expect(page.locator('.topic-card').first()).toContainText('Dự đoán đúng 42%');
  await expect(page.getByRole('link', { name: 'Học lý thuyết →' }).first()).toHaveAttribute('href', '/theory?topic=topic-0&lesson=1');
  await page.getByRole('button', { name: 'Xem thêm 6 chủ đề' }).click();
  await expect(page.locator('.topic-library-item')).toHaveCount(12);
  await page.getByRole('button', { name: 'Nghe', exact: true }).click();
  await expect(page.locator('.topic-library-item')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Nghe', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(roadmapCalls).toBe(0);
  expect(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('recommendation-topics.png'), fullPage: true });
});

test('group practice keeps its session after profile refresh and rotates to another skill', async ({ page }) => {
  let profileLoads = 0; let profileRefreshesAfterAnswer = 0;
  const requestedSkills: number[] = [];
  const answeredSkills: number[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/auth/me') return json({ id: 1, role: 'USER', email: 'fixture@example.invalid' });
    if (path === '/mastery/me') {
      profileLoads++; if (answeredSkills.length) profileRefreshesAfterAnswer++;
      // The fresh profile recommends a different first skill. The open session must remain stable.
      return json({ userId: 1, skills: [1, 2].map(id => ({ skillId: id, skillCode: `S${id}`, skillName: `Kỹ năng ${id}`, part: 5, masteryScore: .4, practiceCount: profileLoads, lastPracticed: null })), partBreakdown: [], overallMastery: .4, topicGroups: [{ ...topics[0], title: 'Ngữ pháp nền tảng', parts: [5], skillIds: [1, 2], recommendedSkillId: answeredSkills.length ? 2 : 1 }] });
    }
    if (path === '/das3h/adaptive-question') {
      const skill = Number(url.searchParams.get('skillId'));
      requestedSkills.push(skill);
      return json({ selectedQuestion: { id: 100 + skill, part: 5, content: `Question for skill ${skill}`, optionA: 'at', optionB: 'in', optionC: 'on', optionD: 'for', passage: null, audioUrl: null, imageUrl: null }, predictedProb: .7, targetProb: .75, evaluatedCandidatesCount: 10, isExploration: false });
    }
    if (path === '/das3h/answer-adaptive') {
      answeredSkills.push(route.request().postDataJSON().skillId);
      return json({ isCorrect: true, correctAnswer: 'A', explanation: 'Use at.' });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/recommendations');
  await page.getByRole('button', { name: 'Luyện Ngữ pháp nền tảng', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Luyện kỹ năng', exact: true });
  await expect(dialog.getByRole('heading', { name: 'Kỹ năng 1 (Part 5)', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'A. at', exact: true }).click();
  await dialog.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click();
  await expect(dialog.getByText('Đã lưu kết quả luyện tập.')).toBeVisible();
  await expect.poll(() => profileRefreshesAfterAnswer).toBeGreaterThan(0);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Kỹ năng 1 (Part 5)', exact: true })).toBeVisible();
  await expect(dialog.getByText('Ngữ pháp nền tảng', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Kỹ năng 2 (Part 5)', exact: true })).toBeVisible();
  await expect(dialog.getByText('Ngữ pháp nền tảng', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Question for skill 2', { exact: true })).toBeVisible();
  expect(requestedSkills.filter((skill, index) => index === 0 || skill !== requestedSkills[index - 1])).toEqual([1, 2]);
  expect(answeredSkills).toEqual([1]);
});

