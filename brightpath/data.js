// BrightPath learning content.
// Each course has units; each unit has lessons; each lesson has exercises.
// Exercise types:
//   choice    -> { type: 'choice', prompt, image?, options: [{label, emoji?, correct?}] }
//   match     -> { type: 'match', prompt, pairs: [{left, right}] }   // word <-> emoji
//   count     -> { type: 'count', emoji, answer, options: [n,...] }
//   sequence  -> { type: 'sequence', prompt, items: [steps in correct order] }
//   truefalse -> { type: 'truefalse', prompt, image?, answer: boolean }
//   sayit     -> { type: 'sayit', prompt, target }   // celebrate, no validation

const LETTERS = [
  { letter: 'A', sound: 'ay', words: [['Apple','🍎'], ['Ant','🐜'], ['Airplane','✈️']] },
  { letter: 'B', sound: 'buh', words: [['Ball','⚽'], ['Bee','🐝'], ['Banana','🍌']] },
  { letter: 'C', sound: 'kuh', words: [['Cat','🐱'], ['Cow','🐮'], ['Cake','🍰']] },
  { letter: 'D', sound: 'duh', words: [['Dog','🐶'], ['Duck','🦆'], ['Drum','🥁']] },
  { letter: 'E', sound: 'eh', words: [['Egg','🥚'], ['Elephant','🐘'], ['Eye','👁️']] },
  { letter: 'F', sound: 'fuh', words: [['Fish','🐟'], ['Frog','🐸'], ['Fox','🦊']] },
  { letter: 'G', sound: 'guh', words: [['Goat','🐐'], ['Grapes','🍇'], ['Gift','🎁']] },
  { letter: 'H', sound: 'huh', words: [['Hat','🎩'], ['Horse','🐴'], ['House','🏠']] },
  { letter: 'I', sound: 'ih', words: [['Ice','🧊'], ['Igloo','🏚️'], ['Ink','🖋️']] },
  { letter: 'J', sound: 'juh', words: [['Jam','🍓'], ['Juice','🧃'], ['Jet','🛩️']] },
];

function pickWrong(correctEmoji, pool, n=2) {
  const out = [];
  const seen = new Set([correctEmoji]);
  for (const e of pool) {
    if (out.length >= n) break;
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

function buildLetterLesson(letterIdx) {
  const L = LETTERS[letterIdx];
  const otherEmojis = LETTERS.flatMap((x, i) => i === letterIdx ? [] : x.words.map(w => w[1]));
  const exercises = [];

  // 1) Recognize letter
  exercises.push({
    type: 'choice',
    prompt: `Tap the letter ${L.letter}.`,
    options: shuffle([
      { label: L.letter, correct: true },
      { label: pickOtherLetter(L.letter) },
      { label: pickOtherLetter(L.letter, [L.letter]) },
      { label: pickOtherLetter(L.letter, [L.letter]) },
    ]),
  });

  // 2) Pick a word starting with letter (image options)
  const w0 = L.words[0];
  exercises.push({
    type: 'choice',
    prompt: `Which one starts with ${L.letter}?`,
    options: shuffle([
      { label: w0[0], emoji: w0[1], correct: true },
      ...pickWrong(w0[1], shuffle(otherEmojis)).map(e => ({ label: '', emoji: e })),
    ]),
  });

  // 3) Match the word to its picture
  exercises.push({
    type: 'match',
    prompt: `Match the word to the picture.`,
    pairs: L.words.map(([w, e]) => ({ left: w, right: e })),
  });

  // 4) True/False — does this start with the letter?
  const w1 = L.words[1];
  exercises.push({
    type: 'truefalse',
    prompt: `${w1[0]} ${w1[1]} starts with ${L.letter}.`,
    answer: true,
  });
  const fakeWord = otherWordStart(letterIdx);
  exercises.push({
    type: 'truefalse',
    prompt: `${fakeWord[0]} ${fakeWord[1]} starts with ${L.letter}.`,
    answer: false,
  });

  // 5) Say the sound
  exercises.push({
    type: 'sayit',
    prompt: `Say the sound of ${L.letter}.`,
    target: `“${L.sound}”`,
  });

  return {
    id: `letter-${L.letter}`,
    title: `Letter ${L.letter}`,
    emoji: L.words[0][1],
    exercises,
  };
}

function pickOtherLetter(letter, exclude=[]) {
  const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const ex = new Set([letter, ...exclude]);
  const choices = all.filter(c => !ex.has(c));
  return choices[Math.floor(Math.random() * choices.length)];
}

function otherWordStart(letterIdx) {
  const others = LETTERS.filter((_, i) => i !== letterIdx);
  const o = others[Math.floor(Math.random() * others.length)];
  return o.words[0];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- NUMBERS ---

function buildNumberLesson(n) {
  const emoji = '🍎';
  const exercises = [];

  exercises.push({
    type: 'count',
    prompt: `How many apples?`,
    emoji,
    answer: n,
    options: shuffle([n, Math.max(1, n-1), n+1, Math.min(10, n+2)].filter((v, i, a) => a.indexOf(v) === i)).slice(0, 4),
  });

  exercises.push({
    type: 'choice',
    prompt: `Tap the number ${n}.`,
    options: shuffle([
      { label: String(n), correct: true },
      { label: String(Math.max(0, n-1)) },
      { label: String(n+1) },
      { label: String(Math.min(20, n+3)) },
    ].filter((v,i,a) => a.findIndex(x => x.label === v.label) === i)),
  });

  if (n >= 2) {
    exercises.push({
      type: 'choice',
      prompt: `${n-1} + 1 = ?`,
      options: shuffle([
        { label: String(n), correct: true },
        { label: String(n-1) },
        { label: String(n+1) },
        { label: String(Math.max(0, n-2)) },
      ]),
    });
  }

  exercises.push({
    type: 'count',
    prompt: `Tap how many balloons.`,
    emoji: '🎈',
    answer: n,
    options: shuffle([n, Math.max(0, n-1), n+1].filter((v, i, a) => a.indexOf(v) === i)),
  });

  exercises.push({
    type: 'truefalse',
    prompt: `🌟🌟🌟 — that is ${n} stars.`,
    answer: n === 3,
  });

  exercises.push({
    type: 'sayit',
    prompt: `Say the number out loud.`,
    target: String(n),
  });

  return {
    id: `num-${n}`,
    title: `Number ${n}`,
    emoji: ['','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][n] || '🔢',
    exercises,
  };
}

// --- FEELINGS (autism-supportive social/emotional) ---

const FEELINGS_LESSONS = [
  {
    id: 'feel-happy',
    title: 'Happy',
    emoji: '😊',
    exercises: [
      { type: 'choice', prompt: 'Which face looks happy?', options: shuffle([
        { label: 'Happy', emoji: '😊', correct: true },
        { label: 'Sad', emoji: '😢' },
        { label: 'Angry', emoji: '😠' },
        { label: 'Tired', emoji: '😴' },
      ])},
      { type: 'choice', prompt: 'Which one makes most people feel happy?', options: shuffle([
        { label: 'Playing with a friend', emoji: '🧑‍🤝‍🧑', correct: true },
        { label: 'Dropping ice cream', emoji: '🍦' },
        { label: 'Loud noise', emoji: '🔊' },
      ])},
      { type: 'truefalse', prompt: 'A smile 😊 is one way to show I am happy.', answer: true },
      { type: 'choice', prompt: 'When I am happy, I can…', options: shuffle([
        { label: 'Smile and say thanks', emoji: '🙂', correct: true },
        { label: 'Throw something', emoji: '💥' },
      ])},
      { type: 'sayit', prompt: 'Say it: I feel happy when…', target: '“…”' },
    ],
  },
  {
    id: 'feel-sad',
    title: 'Sad',
    emoji: '😢',
    exercises: [
      { type: 'choice', prompt: 'Which face looks sad?', options: shuffle([
        { label: 'Sad', emoji: '😢', correct: true },
        { label: 'Happy', emoji: '😊' },
        { label: 'Surprised', emoji: '😮' },
      ])},
      { type: 'truefalse', prompt: 'It is okay to feel sad sometimes.', answer: true },
      { type: 'choice', prompt: 'When I feel sad, I can ask for…', options: shuffle([
        { label: 'A hug', emoji: '🤗', correct: true },
        { label: 'Loud music', emoji: '🔊' },
        { label: 'Nothing', emoji: '🚫' },
      ])},
      { type: 'sequence', prompt: 'Put the steps in order when I feel sad.', items: [
        'Notice my body feels heavy',
        'Say: I feel sad',
        'Ask a grown-up for help',
        'Take a slow breath',
      ]},
      { type: 'sayit', prompt: 'Practice: “I feel sad. Can you help me?”', target: '“I feel sad.”' },
    ],
  },
  {
    id: 'feel-angry',
    title: 'Angry',
    emoji: '😠',
    exercises: [
      { type: 'choice', prompt: 'Which face looks angry?', options: shuffle([
        { label: 'Angry', emoji: '😠', correct: true },
        { label: 'Calm', emoji: '😌' },
        { label: 'Silly', emoji: '🤪' },
      ])},
      { type: 'truefalse', prompt: 'When I am angry, hitting is OK.', answer: false },
      { type: 'choice', prompt: 'A safe way to calm down…', options: shuffle([
        { label: 'Take 3 deep breaths', emoji: '🫁', correct: true },
        { label: 'Yell at someone', emoji: '😤' },
        { label: 'Throw a toy', emoji: '🧸' },
      ])},
      { type: 'sequence', prompt: 'Calm-down plan in order.', items: [
        'Stop',
        'Breathe in… and out',
        'Count to 5',
        'Tell a grown-up how I feel',
      ]},
      { type: 'sayit', prompt: 'Say it: “I need a break.”', target: '“I need a break.”' },
    ],
  },
  {
    id: 'feel-overwhelmed',
    title: 'Too Much',
    emoji: '🌪️',
    exercises: [
      { type: 'choice', prompt: 'Which one might feel like too much?', options: shuffle([
        { label: 'A loud crowd', emoji: '🔊', correct: true },
        { label: 'Quiet reading', emoji: '📖' },
        { label: 'A nap', emoji: '😴' },
      ])},
      { type: 'truefalse', prompt: 'It is okay to ask for a quiet space.', answer: true },
      { type: 'choice', prompt: 'When things feel too loud or busy, I can…', options: shuffle([
        { label: 'Use my quiet signal', emoji: '🤫', correct: true },
        { label: 'Try to ignore it', emoji: '🙉' },
        { label: 'Make more noise', emoji: '🔔' },
      ])},
      { type: 'sequence', prompt: 'Reset plan when it is too much.', items: [
        'Notice: my body feels buzzy',
        'Tell someone: “I need a break.”',
        'Go to a calm spot',
        'Take slow breaths until I feel ready',
      ]},
      { type: 'sayit', prompt: 'Practice: “I need a quiet break, please.”', target: '“Quiet break, please.”' },
    ],
  },
  {
    id: 'feel-help',
    title: 'Asking for Help',
    emoji: '🙋',
    exercises: [
      { type: 'choice', prompt: 'Who is safe to ask for help?', options: shuffle([
        { label: 'A trusted grown-up', emoji: '🧑‍🏫', correct: true },
        { label: 'Nobody', emoji: '🚫' },
      ])},
      { type: 'truefalse', prompt: 'Asking for help is brave.', answer: true },
      { type: 'choice', prompt: 'A good way to ask for help…', options: shuffle([
        { label: '“Excuse me, can you help?”', emoji: '🙋', correct: true },
        { label: 'Stay quiet and worry', emoji: '😟' },
      ])},
      { type: 'sequence', prompt: 'How to ask for help.', items: [
        'Walk over (or wave)',
        'Say their name',
        'Say: “Can you help me, please?”',
        'Wait and listen',
      ]},
      { type: 'sayit', prompt: 'Practice: “Can you help me, please?”', target: '“Can you help me, please?”' },
    ],
  },
];

// --- MY DAY (life skills) ---

const DAY_LESSONS = [
  {
    id: 'day-morning',
    title: 'Morning',
    emoji: '🌅',
    exercises: [
      { type: 'sequence', prompt: 'Put my morning in order.', items: [
        'Wake up',
        'Use the bathroom',
        'Brush teeth',
        'Get dressed',
        'Eat breakfast',
      ]},
      { type: 'choice', prompt: 'What do I do first when I wake up?', options: shuffle([
        { label: 'Use the bathroom', emoji: '🚻', correct: true },
        { label: 'Watch TV', emoji: '📺' },
      ])},
      { type: 'truefalse', prompt: 'I brush my teeth in the morning.', answer: true },
      { type: 'choice', prompt: 'A healthy breakfast?', options: shuffle([
        { label: 'Toast and fruit', emoji: '🍞', correct: true },
        { label: 'Cake', emoji: '🍰' },
      ])},
      { type: 'sayit', prompt: 'Say: “Good morning!”', target: '“Good morning!”' },
    ],
  },
  {
    id: 'day-meals',
    title: 'Mealtime',
    emoji: '🍽️',
    exercises: [
      { type: 'choice', prompt: 'Where do we eat?', options: shuffle([
        { label: 'At the table', emoji: '🍽️', correct: true },
        { label: 'On the bed', emoji: '🛏️' },
      ])},
      { type: 'sequence', prompt: 'Mealtime steps.', items: [
        'Wash hands',
        'Sit at the table',
        'Take small bites',
        'Say thank you',
      ]},
      { type: 'truefalse', prompt: 'I wash my hands before I eat.', answer: true },
      { type: 'choice', prompt: 'If I do not like a food, I can…', options: shuffle([
        { label: 'Say “No thank you”', emoji: '🙂', correct: true },
        { label: 'Throw it', emoji: '💥' },
      ])},
      { type: 'sayit', prompt: 'Practice: “Please.” and “Thank you.”', target: '“Please.” “Thank you.”' },
    ],
  },
  {
    id: 'day-school',
    title: 'School Time',
    emoji: '🎒',
    exercises: [
      { type: 'sequence', prompt: 'Getting ready for school.', items: [
        'Put on shoes',
        'Pack my bag',
        'Say goodbye',
        'Walk or ride to school',
      ]},
      { type: 'choice', prompt: 'What do I bring to school?', options: shuffle([
        { label: 'My backpack', emoji: '🎒', correct: true },
        { label: 'A pet', emoji: '🐶' },
      ])},
      { type: 'truefalse', prompt: 'It is okay to ask my teacher for help.', answer: true },
      { type: 'choice', prompt: 'When I need a break at school, I can…', options: shuffle([
        { label: 'Use my break card', emoji: '🪪', correct: true },
        { label: 'Run away', emoji: '🏃' },
      ])},
      { type: 'sayit', prompt: 'Say: “I need a break, please.”', target: '“I need a break, please.”' },
    ],
  },
  {
    id: 'day-play',
    title: 'Play & Friends',
    emoji: '🧩',
    exercises: [
      { type: 'choice', prompt: 'A kind way to join a game…', options: shuffle([
        { label: '“Can I play, please?”', emoji: '🙂', correct: true },
        { label: 'Take their toy', emoji: '😠' },
      ])},
      { type: 'truefalse', prompt: 'Taking turns is fair.', answer: true },
      { type: 'choice', prompt: 'If a friend says “stop,” I should…', options: shuffle([
        { label: 'Stop right away', emoji: '🛑', correct: true },
        { label: 'Keep going', emoji: '➡️' },
      ])},
      { type: 'sequence', prompt: 'Sharing a turn.', items: [
        'Wait for my turn',
        'Take my turn',
        'Pass to the next player',
        'Say good game',
      ]},
      { type: 'sayit', prompt: 'Say: “Good game!”', target: '“Good game!”' },
    ],
  },
  {
    id: 'day-bed',
    title: 'Bedtime',
    emoji: '🌙',
    exercises: [
      { type: 'sequence', prompt: 'Bedtime steps.', items: [
        'Put on pajamas',
        'Brush teeth',
        'Read a story',
        'Lights off',
        'Sleep',
      ]},
      { type: 'truefalse', prompt: 'Sleep helps my body and brain.', answer: true },
      { type: 'choice', prompt: 'A calm bedtime activity?', options: shuffle([
        { label: 'Read a book', emoji: '📖', correct: true },
        { label: 'Play loud games', emoji: '🥁' },
      ])},
      { type: 'choice', prompt: 'What do I say at bedtime?', options: shuffle([
        { label: '“Good night.”', emoji: '🌙', correct: true },
        { label: '“Wake up!”', emoji: '☀️' },
      ])},
      { type: 'sayit', prompt: 'Say: “Good night, I love you.”', target: '“Good night.”' },
    ],
  },
];

// --- COURSES ---

const COURSES = [
  {
    id: 'letters',
    title: 'Letters',
    emoji: '🔤',
    color: '#58CC02',     // Duolingo green
    description: 'Learn the alphabet, sounds, and first words.',
    units: [
      {
        id: 'letters-1',
        title: 'A to E',
        description: 'First letters',
        lessons: [0,1,2,3,4].map(buildLetterLesson),
      },
      {
        id: 'letters-2',
        title: 'F to J',
        description: 'More letters',
        lessons: [5,6,7,8,9].map(buildLetterLesson),
      },
    ],
  },
  {
    id: 'numbers',
    title: 'Numbers',
    emoji: '🔢',
    color: '#1CB0F6',     // Duolingo blue
    description: 'Count, compare, and add small numbers.',
    units: [
      {
        id: 'numbers-1',
        title: '1 to 5',
        description: 'Counting starts here',
        lessons: [1,2,3,4,5].map(buildNumberLesson),
      },
      {
        id: 'numbers-2',
        title: '6 to 10',
        description: 'Bigger numbers',
        lessons: [6,7,8,9,10].map(buildNumberLesson),
      },
    ],
  },
  {
    id: 'feelings',
    title: 'Feelings',
    emoji: '💛',
    color: '#FF9600',     // Duolingo orange
    description: 'Name feelings, calm down, and ask for help.',
    units: [
      {
        id: 'feelings-1',
        title: 'My Feelings',
        description: 'Inside my body',
        lessons: FEELINGS_LESSONS,
      },
    ],
  },
  {
    id: 'day',
    title: 'My Day',
    emoji: '🗓️',
    color: '#CE82FF',     // Duolingo purple
    description: 'Routines from morning to bedtime.',
    units: [
      {
        id: 'day-1',
        title: 'Routines',
        description: 'My daily steps',
        lessons: DAY_LESSONS,
      },
    ],
  },
];

window.BP_DATA = { COURSES };
