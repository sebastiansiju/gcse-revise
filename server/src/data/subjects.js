// Subject catalogue. `bank: true` means the question bank has practice questions for it.
export const SUBJECTS = {
  'maths': { name: 'Maths', bank: true },
  'english-language': { name: 'English Language', bank: true },
  'english-literature': { name: 'English Literature', bank: true },
  'science': { name: 'Combined Science', bank: true },
  'history': { name: 'History', bank: false },
  'geography': { name: 'Geography', bank: false },
  'religious-studies': { name: 'Religious Studies', bank: false },
  'computer-science': { name: 'Computer Science', bank: false },
  'french': { name: 'French', bank: false },
  'spanish': { name: 'Spanish', bank: false },
  'business': { name: 'Business', bank: false },
  'art': { name: 'Art & Design', bank: false },
};

// Default exam dates are ESTIMATES — students should replace them with their school's timetable in Settings.
export const TRACKS = {
  resit: {
    label: 'Resitting English & Maths (November series)',
    subjects: [
      { subject: 'maths', target: 5, current: 4, exam_date: '2026-11-05' },
      { subject: 'english-language', target: 5, current: 4, exam_date: '2026-11-04' },
    ],
  },
  year11: {
    label: 'Year 11 (Summer 2027 exams)',
    subjects: [
      { subject: 'maths', target: 6, current: null, exam_date: '2027-05-20' },
      { subject: 'english-language', target: 6, current: null, exam_date: '2027-05-24' },
      { subject: 'english-literature', target: 6, current: null, exam_date: '2027-05-12' },
      { subject: 'science', target: 6, current: null, exam_date: '2027-05-14' },
    ],
  },
};
