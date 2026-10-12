// Single source of truth for narration timing, subtitles and editable placeholders.
// Times are seconds on the video timeline. After recording the real voiceover,
// adjust these to the recording and re-render (see README).

export const CONFIG = {
  // Leave empty to show a clearly marked placeholder plate in the final scene.
  doctorName: 'د. أبوبكر احمد سند',
  doctorTitle: 'أخصائي الباطنة والجهاز الهضمي والكبد والمناظير',
  doctorHandle: 'Dr. Abobakr Sanad', // Facebook page name
  logoName: 'د. أبوبكر سند',          // short name used in the on-screen watermark
  logoMark: '../assets/logo/logo_mark.svg',
  // Image slots (relative to src/). Missing files fall back to a neutral placeholder.
  doctorStylized: '../assets/doctor_stylized.png',
  doctorCutout: '../assets/doctor_cutout.png', // optional transparent PNG for layered compositing
};

export const DURATION = 50; // film time; video length comes from timeline.json

export const SCENES = [
  { id: 1, name: 'Hook',        start: 0,    end: 6.5 },
  { id: 2, name: 'Explanation', start: 6.5,  end: 13.5 },
  { id: 3, name: 'Symptoms',    start: 13.5, end: 22.5 },
  { id: 4, name: 'Diagnosis',   start: 22.5, end: 30.5 },
  { id: 5, name: 'Treatment',   start: 30.5, end: 38.5 },
  { id: 6, name: 'Closing',     start: 38.5, end: 50 },
];

// Narration split into short caption phrases (exact wording of the approved script).
// Caption phrases timed to the recorded voiceover (audio/voiceover.mp3), in video time.
export const CAPTIONS = [
  [0.02, 1.75, 'عمرك حسيت بحرقان أو وجع'],
  [1.75, 3.63, 'في معدتك بيتكرر كتير؟'],
  [3.83, 5.29, 'طب تعرف إن ممكن تكون'],
  [5.29, 7.26, 'جرثومة المعدة هي السبب؟'],
  [7.46, 9.71, 'جرثومة المعدة دي نوع من البكتيريا'],
  [9.71, 11.51, 'بتعيش في بطانة المعدة،'],
  [11.53, 13.50, 'وممكن تسبب التهاب أو قرحة'],
  [13.50, 14.90, 'عند بعض الناس.'],
  [14.93, 16.83, 'أعراضها ممكن تكون وجع أو حرقان'],
  [16.83, 18.01, 'في أعلى البطن،'],
  [18.16, 19.80, 'وانتفاخ أو غثيان،'],
  [19.85, 21.78, 'وفي ناس بيكون عندها الجرثومة'],
  [21.78, 23.53, 'من غير أي أعراض خالص.'],
  [23.58, 25.94, 'طيب نعرف إزاي إنها موجودة؟'],
  [26.00, 27.31, 'عن طريق تحليل البراز'],
  [27.31, 28.37, 'أو اختبار النفس،'],
  [28.37, 30.44, 'حسب ما الدكتور يحدد لحالتك.'],
  [30.79, 32.49, 'ولو التحليل أكد وجودها،'],
  [32.49, 34.76, 'الدكتور بيحددلك العلاج المناسب،'],
  [34.81, 36.87, 'واللي ممكن يشمل مضادات حيوية'],
  [36.87, 39.16, 'وأدوية لتقليل حموضة المعدة.'],
  [39.17, 40.56, 'بس مهم جدًا:'],
  [40.56, 42.18, 'متاخدش علاج من نفسك،'],
  [42.24, 43.95, 'واتأكد من الشفاء بالمتابعة'],
  [43.95, 46.09, 'والتحليل اللي الدكتور يحدده.'],
  [46.23, 47.61, 'تابعنا علشان تعرف'],
  [47.61, 50.09, 'معلومات طبية أكتر تهم صحتك.'],
];
