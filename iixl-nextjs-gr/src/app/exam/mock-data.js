export const EXAM_CATEGORIES = [
  {
    id: "ssc",
    name: "SSC Exams",
    description: "CGL, CHSL, MTS and other staff selection commission exams.",
    icon: "🏛️",
    color: "from-blue-500 to-indigo-600",
    testCount: 45,
    participants: "1.2M+"
  },
  {
    id: "navodaya",
    name: "Navodaya Entrance",
    description: "Jawahar Navodaya Vidyalaya Selection Test (JNVST).",
    icon: "🎓",
    color: "from-emerald-500 to-teal-600",
    testCount: 28,
    participants: "450K+"
  },
  {
    id: "sainik",
    name: "Sainik School",
    description: "All India Sainik Schools Entrance Examination (AISSEE).",
    icon: "🎖️",
    color: "from-rose-500 to-orange-600",
    testCount: 32,
    participants: "300K+"
  }
];

export const TEST_SERIES = {
  ssc: [
    { id: "ssc-cgl-1", name: "SSC CGL Mock Test #1", duration: 60, questions: 100, difficulty: "Moderate" },
    { id: "ssc-cgl-2", name: "SSC CGL Mock Test #2", duration: 60, questions: 100, difficulty: "Hard" },
    { id: "ssc-chsl-1", name: "SSC CHSL Full Practice", duration: 60, questions: 100, difficulty: "Moderate" }
  ],
  navodaya: [
    { id: "jnvst-cl6-1", name: "JNVST Class 6 Practice Set 1", duration: 120, questions: 80, difficulty: "Easy" },
    { id: "jnvst-cl6-2", name: "JNVST Class 6 Practice Set 2", duration: 120, questions: 80, difficulty: "Moderate" }
  ],
  sainik: [
    { id: "aissee-cl6-1", name: "Sainik School Class 6 Mock 1", duration: 150, questions: 125, difficulty: "Moderate" },
    { id: "aissee-cl9-1", name: "Sainik School Class 9 Full Mock", duration: 180, questions: 150, difficulty: "Hard" }
  ]
};
