import { expect, test } from '@playwright/test';
import type { SkillMasteryItem } from '../../src/types/mastery';

const skill = (id: number, part: number, masteryScore: number, practiceCount: number, lastPracticed: string | null = null): SkillMasteryItem => ({ skillId: id, skillCode: `S${id}`, skillName: `Kỹ năng ${id}`, part, masteryScore, practiceCount, lastPracticed });
async function setup(page: import('@playwright/test').Page, skills: SkillMasteryItem[]) {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') return route.fulfill({ json: { id: 1, role: 'USER', email: 'fixture@example.invalid' } });
    if (path === '/auth/learning-status') return route.fulfill({ json: { hasLearningActivity: true, onboardingChoice: 'SELF_STUDY', onboardingRequired: false } });
    if (path === '/mastery/me') return route.fulfill({ json: { userId: 1, skills, overallMastery: .99, partBreakdown: [{ part: 5, averageMastery: .99, totalSkills: 3 }], topicGroups: [], learningPlan: { version: 'learning-plan-v1', generatedAt: '2026-11-01T00:00:00Z', items: [] } } });
    return route.fulfill({ status: 404, json: {} });
  });
}
test('unpracticed skills receive no invented estimate or weakness label', async ({ page }, testInfo) => {
  await setup(page, [skill(1, 1, .6, 0), skill(2, 5, .8, 0)]);
  await page.goto('/recommendations');
  const overview = page.getByRole('region', { name: 'Bạn đang ở đâu?' });
  await expect(overview).toBeVisible();
  await expect(overview.getByText('Chưa đủ dữ liệu đánh giá.', { exact: true })).toBeVisible();
  await expect(overview.locator('meter')).toHaveCount(0);
  await expect(overview.getByRole('heading', { name: 'Có thể củng cố tiếp' })).toHaveCount(0);
  await expect(overview.locator('.learner-overview-stats')).toContainText('0 / 2');
  await expect(page.getByRole('heading', { name: 'Học tiếp trong từng phần' })).toHaveCount(0);
  await expect(overview.getByRole('link', { name: 'Đánh giá đầu vào', exact: true })).toHaveAttribute('href', '/placement');
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('learner-overview-empty.png'), fullPage: true });
});

test('partial overview averages only practiced valid skill estimates and shows coverage', async ({ page }, testInfo) => {
  await setup(page, [skill(1, 5, .2, 4, '2026-10-01T00:00:00Z'), skill(2, 5, .6, 2, '2026-10-22T00:00:00Z'), skill(3, 5, .99, 0), skill(4, 2, .8, 1, 'invalid-date')]);
  await page.goto('/recommendations');
  const overview = page.getByRole('region', { name: 'Bạn đang ở đâu?' });
  const part5 = overview.getByRole('article', { name: 'Part 5', exact: true });
  await expect(part5.locator('meter')).toHaveAttribute('value', '0.4');
  await expect(part5).toContainText('2/3 kỹ năng đã luyện · một phần');
  await expect(overview.getByRole('article', { name: 'Part 1', exact: true }).locator('meter')).toHaveCount(0);
  await expect(overview.locator('.learner-overview-stats')).toContainText('3 / 4');
  await expect(overview.locator('.learner-overview-stats')).toContainText('7');
  await expect(overview.locator('time')).toHaveText('22/10/2026');
  await expect(overview.locator('.learner-focus li')).toHaveCount(2);
  await expect(overview.locator('.learner-focus li').first()).toContainText('Kỹ năng 1');
  await expect(overview).toContainText('không phải điểm TOEIC');
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('learner-overview-partial.png'), fullPage: true });
});

for (const event of ['focus', 'learning-progress-updated']) test(`overview refreshes after ${event}`, async ({ page }) => {
  const skills = [skill(1, 5, .2, 2)];
  await setup(page, skills);
  await page.goto('/recommendations');
  const part = page.getByRole('article', { name: 'Part 5', exact: true });
  await expect(part.locator('meter')).toHaveAttribute('value', '0.2');
  skills[0] = skill(1, 5, .8, 5);
  await page.evaluate(name => window.dispatchEvent(new Event(name)), event);
  await expect(part.locator('meter')).toHaveAttribute('value', '0.8');
});
