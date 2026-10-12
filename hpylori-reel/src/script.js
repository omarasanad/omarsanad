// Single source of truth for narration timing, subtitles and editable placeholders.
// Times are seconds on the video timeline. After recording the real voiceover,
// adjust these to the recording and re-render (see README).

export const CONFIG = {
  // Leave empty to show a clearly marked placeholder plate in the final scene.
  doctorName: 'د. أبوبكر احمد سند',
  doctorTitle: 'أخصائي الباطنة والجهاز الهضمي والكبد والمناظير',
  doctorHandle: 'Dr. Abobakr Sanad', // Facebook page name
  // Image slots (relative to src/). Missing files fall back to a neutral placeholder.
  doctorStylized: '../assets/doctor_stylized.png',
  doctorCutout: '../assets/doctor_cutout.png', // optional transparent PNG for layered compositing
};

export const DURATION = 50;

export const SCENES = [
  { id: 1, name: 'Hook',        start: 0,    end: 6.5 },
  { id: 2, name: 'Explanation', start: 6.5,  end: 13.5 },
  { id: 3, name: 'Symptoms',    start: 13.5, end: 22.5 },
  { id: 4, name: 'Diagnosis',   start: 22.5, end: 30.5 },
  { id: 5, name: 'Treatment',   start: 30.5, end: 38.5 },
  { id: 6, name: 'Closing',     start: 38.5, end: 50 },
];

// Narration split into short caption phrases (exact wording of the approved script).
export const CAPTIONS = [
  [0.3, 1.9, 'عمرك حسيت بحرقان أو وجع'],
  [1.9, 3.3, 'في معدتك بيتكرر كتير؟'],
  [3.5, 4.9, 'طب تعرف إن ممكن تكون'],
  [4.9, 6.4, 'جرثومة المعدة هي السبب؟'],

  [6.6, 8.6, 'جرثومة المعدة دي نوع من البكتيريا'],
  [8.6, 10.3, 'بتعيش في بطانة المعدة،'],
  [10.4, 12.2, 'وممكن تسبب التهاب أو قرحة'],
  [12.2, 13.4, 'عند بعض الناس.'],

  [13.6, 15.6, 'أعراضها ممكن تكون وجع أو حرقان'],
  [15.6, 16.7, 'في أعلى البطن،'],
  [16.8, 18.3, 'وانتفاخ أو غثيان،'],
  [18.5, 20.4, 'وفي ناس بيكون عندها الجرثومة'],
  [20.4, 22.3, 'من غير أي أعراض خالص.'],

  [22.6, 24.4, 'طيب نعرف إزاي إنها موجودة؟'],
  [24.7, 26.2, 'عن طريق تحليل البراز'],
  [26.2, 27.4, 'أو اختبار النفس،'],
  [27.5, 30.2, 'حسب ما الدكتور يحدد لحالتك.'],

  [30.6, 32.1, 'ولو التحليل أكد وجودها،'],
  [32.1, 34.0, 'الدكتور بيحددلك العلاج المناسب،'],
  [34.1, 36.0, 'واللي ممكن يشمل مضادات حيوية'],
  [36.0, 38.3, 'وأدوية لتقليل حموضة المعدة.'],

  [38.6, 39.6, 'بس مهم جدًا:'],
  [39.6, 41.2, 'متاخدش علاج من نفسك،'],
  [41.3, 43.2, 'واتأكد من الشفاء بالمتابعة'],
  [43.2, 45.2, 'والتحليل اللي الدكتور يحدده.'],
  [45.6, 46.9, 'تابعنا علشان تعرف'],
  [46.9, 48.8, 'معلومات طبية أكتر تهم صحتك.'],
];
