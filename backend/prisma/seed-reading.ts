import { PrismaClient, Prisma } from '@prisma/client';
import { isDeepStrictEqual } from 'node:util';
import books from './reading-demo.json';
import { validateQuestions } from '../src/reading/reading-core';
const prisma = new PrismaClient();
async function main() {
  for (const book of books) {
    const questions = validateQuestions(book.text, book.questions);
    const existing = await prisma.readingArticle.findUnique({
      where: { key: book.key },
      include: { versions: { orderBy: { revision: 'desc' }, take: 1 } },
    });
    if (
      existing?.versions[0]?.text === book.text &&
      isDeepStrictEqual(existing.versions[0].questions, questions)
    )
      continue;
    await prisma.$transaction(async (db) => {
      const article =
        existing ||
        (await db.readingArticle.create({
          data: {
            key: book.key,
            title: book.title,
            originalText: book.text,
            status: 'PUBLISHED',
          },
        }));
      const version = await db.readingVersion.create({
        data: {
          articleId: article.id,
          revision: (existing?.versions[0]?.revision || 0) + 1,
          title: book.title,
          text: book.text,
          topic: book.topic,
          kind: book.kind,
          difficulty: book.difficulty,
          origin: 'SYSTEM',
          reviewed: true,
          questions: questions as unknown as Prisma.InputJsonValue,
        },
      });
      await db.readingArticle.update({
        where: { id: article.id },
        data: { currentVersionId: version.id, publishedVersionId: version.id },
      });
    });
  }
  console.log(
    '25 original Reading lessons with 125 evidence-grounded questions. Difficulty is editorial, not calibrated. DAS3H unchanged.',
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
