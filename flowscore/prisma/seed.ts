import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@flowscore.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Demo user ${email} already exists.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: "Demo",
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      userId: user.id,
      slug: "automation-readiness-demo",
      title: "How ready is your business for automation?",
      intro:
        "A quick 5-question scorecard to see where you are on the automation curve.",
      ctaLabel: "Start assessment",
      collectEmail: true,
      published: true,
    },
  });

  const questions = [
    {
      text: "How often do you review your KPIs?",
      type: "single",
      options: [
        { text: "Weekly", score: 10 },
        { text: "Monthly", score: 5 },
        { text: "Rarely", score: 0 },
      ],
    },
    {
      text: "Which processes are already automated?",
      type: "multi",
      options: [
        { text: "Email marketing", score: 3 },
        { text: "Invoicing", score: 3 },
        { text: "Reporting", score: 4 },
      ],
    },
    {
      text: "On a scale of 0–10, how confident are you in your data?",
      type: "scale",
      options: [],
    },
  ];

  for (const [i, q] of questions.entries()) {
    await prisma.question.create({
      data: {
        quizId: quiz.id,
        order: i,
        text: q.text,
        type: q.type,
        required: true,
        options: {
          create: q.options.map((o, j) => ({ order: j, text: o.text, score: o.score })),
        },
      },
    });
  }

  await prisma.outcome.createMany({
    data: [
      {
        quizId: quiz.id,
        minScore: 0,
        maxScore: 33,
        title: "Early days",
        description: "You have lots of headroom — automating two or three core flows would make a noticeable dent.",
      },
      {
        quizId: quiz.id,
        minScore: 34,
        maxScore: 66,
        title: "On your way",
        description: "You've started — focus next on connecting tools so data flows end-to-end.",
      },
      {
        quizId: quiz.id,
        minScore: 67,
        maxScore: 100,
        title: "Ready to scale",
        description: "You're in strong shape. The next bet is proactive automation — triggers on data changes, not schedules.",
      },
    ],
  });

  console.log(`Seeded ${email} / password123 — quiz slug: ${quiz.slug}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
