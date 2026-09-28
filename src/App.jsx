import React, { useState, useEffect } from 'react';
import {
  Volume2, ArrowLeft, GraduationCap, Play, Plus, Trash2, Sun, Moon,
  ChevronRight, LogOut, User, Menu, X, Home, MessageSquare, Shield,
  Activity, Loader2, Hash, Briefcase, Bus, BookOpen, CheckCircle2, XCircle,
  Trophy, Users, Percent, Clock, RotateCcw, Megaphone, ClipboardList, Send
} from 'lucide-react';
import { categories as initialCategories } from './data';
import ChatAssistant from './ChatAssistant';
import { pekerjaanData } from './data/Pekerjaan';
import { transportasiData } from "./data/transportasi";
import { rumahData } from "./data/rumah";
import { jurusanVocab } from "./data/jurusan";

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */
const ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberToWords(n) {
  if (n === 0) return "zero";
  if (n === 100) return "one hundred";
  let str = "";
  if (n >= 20) {
    str += tens[Math.floor(n / 10)];
    if (n % 10 > 0) str += "-" + ones[n % 10];
  } else {
    str += ones[n];
  }
  return str.trim();
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

const nowText = () => new Date().toLocaleTimeString() + ' - ' + new Date().toLocaleDateString();

const readStore = (key) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Kirim data ke API Railway (log, laporan, pengumuman, soal guru)
const postToApi = async (payload) => {
  try {
    await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Gagal mengirim data:", err);
  }
};

const categoryIconMap = { pekerjaan: Briefcase, transportasi: Bus, rumah: Home };

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState(() => localStorage.getItem('kosakata_user') || null);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('kosakata_is_admin') === 'true');
  const [isTeacher, setIsTeacher] = useState(() => localStorage.getItem('kosakata_is_teacher') === 'true');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const [loginInput, setLoginInput] = useState('');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [teacherPinInput, setTeacherPinInput] = useState('');
  const [showTeacherLoginModal, setShowTeacherLoginModal] = useState(false);

  const [activityLogs, setActivityLogs] = useState(() => readStore('kosakata_logs'));
  const [studentReports, setStudentReports] = useState(() => readStore('kosakata_reports'));
  const [announcements, setAnnouncements] = useState(() => readStore('kosakata_announcements'));
  const [customQuizzes, setCustomQuizzes] = useState(() => readStore('kosakata_custom_quizzes'));

  const [screen, setScreen] = useState(() => {
    const staff = localStorage.getItem('kosakata_is_admin') === 'true' || localStorage.getItem('kosakata_is_teacher') === 'true';
    return staff ? 'admin_dashboard' : 'home';
  });

  const [activeCategoryKey, setActiveCategoryKey] = useState(null);

  const [categories, setCategories] = useState(() => {
    let baseCategories = { ...initialCategories };
    if (pekerjaanData) baseCategories.pekerjaan = pekerjaanData;
    if (transportasiData) baseCategories.transportasi = transportasiData;
    if (rumahData) baseCategories.rumah = rumahData;
    return baseCategories;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [newEnWord, setNewEnWord] = useState('');
  const [newIdWord, setNewIdWord] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);

  // Form guru: pengumuman
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');

  // Form guru: buat soal
  const [quizTitleInput, setQuizTitleInput] = useState('');
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [qText, setQText] = useState('');
  const [qOpts, setQOpts] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);

  const [quizState, setQuizState] = useState({
    title: '',
    questions: [],
    allOptionsPool: [],
    idx: 0,
    score: 0,
    answered: false,
    selectedOption: null,
    currentOptions: [],
    results: []
  });

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.newValue) return;
      if (e.key === 'kosakata_logs') setActivityLogs(JSON.parse(e.newValue));
      if (e.key === 'kosakata_reports') setStudentReports(JSON.parse(e.newValue));
      if (e.key === 'kosakata_announcements') setAnnouncements(JSON.parse(e.newValue));
      if (e.key === 'kosakata_custom_quizzes') setCustomQuizzes(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /* ---------------- Logika ---------------- */
  const staffName = isAdmin ? 'Administrator' : 'Guru';

  const logActivity = (actionText, customUser = null) => {
    const currentUser = customUser || user || localStorage.getItem('kosakata_user') || 'Tamu';
    const newLog = { id: Date.now() + Math.random(), user: currentUser, action: actionText, time: nowText() };
    setActivityLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('kosakata_logs', JSON.stringify(updated));
      return updated;
    });
    postToApi({ type: 'log', username: currentUser, action: actionText });
  };

  const saveQuizReport = (finalScore, totalQ, resultsArr, quizTitle) => {
    const currentUser = user || localStorage.getItem('kosakata_user') || 'Siswa';
    const reportItem = {
      id: Date.now(),
      user: currentUser,
      title: quizTitle,
      score: finalScore,
      total: totalQ,
      percentage: Math.round((finalScore / totalQ) * 100),
      details: resultsArr,
      time: nowText()
    };
    setStudentReports(prev => {
      const updated = [reportItem, ...prev];
      localStorage.setItem('kosakata_reports', JSON.stringify(updated));
      return updated;
    });
    postToApi({ type: 'report', ...reportItem });
    logActivity(`Menyelesaikan ${quizTitle} dengan skor ${finalScore}/${totalQ}`, currentUser);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    const username = loginInput.trim();
    localStorage.setItem('kosakata_user', username);
    setUser(username);
    setLoginInput('');
    setScreen('home');
    logActivity(`Login ke aplikasi`, username);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPinInput === '1234') {
      setIsAdmin(true);
      localStorage.setItem('kosakata_is_admin', 'true');
      setShowAdminLoginModal(false);
      setAdminPinInput('');
      setScreen('admin_dashboard');
      logActivity(`Admin masuk ke Panel Dashboard`, 'Administrator');
    } else {
      alert('PIN Admin Salah! (Gunakan: 1234)');
    }
  };

  const handleTeacherLogin = (e) => {
    e.preventDefault();
    if (teacherPinInput === '5678') {
      setIsTeacher(true);
      localStorage.setItem('kosakata_is_teacher', 'true');
      setShowTeacherLoginModal(false);
      setTeacherPinInput('');
      setScreen('admin_dashboard');
      logActivity(`Guru masuk ke Panel Dashboard`, 'Guru');
    } else {
      alert('PIN Guru Salah! (Gunakan: 5678)');
    }
  };

  const handleLogout = () => {
    logActivity(`Keluar dari akun`, isTeacher ? 'Guru' : (user || 'Siswa'));
    localStorage.removeItem('kosakata_user');
    localStorage.removeItem('kosakata_is_admin');
    localStorage.removeItem('kosakata_is_teacher');
    setUser(null);
    setIsAdmin(false);
    setIsTeacher(false);
    setScreen('home');
    setIsSidebarOpen(false);
  };

  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.split('/')[0].trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Soal buatan guru membawa pilihan jawabannya sendiri
  const generateOptionsForQuestion = (currentQ, pool) => {
    if (currentQ.options) return shuffle(currentQ.options);
    const wrongOptions = shuffle(pool.filter(a => a !== currentQ.answer)).slice(0, 3);
    return shuffle([...wrongOptions, currentQ.answer]);
  };

  const getActiveWordsAndDetails = () => {
    if (activeCategoryKey?.startsWith('jurusan_')) {
      const subKey = activeCategoryKey.replace('jurusan_', '');
      const subData = jurusanVocab?.categories?.[subKey];
      return { name: subData?.name || "Kosakata Jurusan", emoji: subData?.emoji || "🎓", words: subData?.words || [], Icon: null };
    }
    const cat = categories[activeCategoryKey];
    return { name: cat?.name || "", emoji: cat?.emoji || "📁", words: cat?.words || [], Icon: categoryIconMap[activeCategoryKey] || null };
  };

  const beginQuiz = (title, questions, allOptionsPool) => {
    setQuizState({
      title,
      questions,
      allOptionsPool,
      idx: 0,
      score: 0,
      answered: false,
      selectedOption: null,
      currentOptions: generateOptionsForQuestion(questions[0], allOptionsPool),
      results: []
    });
    setScreen('quiz');
  };

  const startCategoryQuiz = (catKey) => {
    let wordsList = [];
    let titleName = "";

    if (catKey.startsWith('jurusan_')) {
      const subKey = catKey.replace('jurusan_', '');
      const subData = jurusanVocab?.categories?.[subKey];
      wordsList = subData?.words || [];
      titleName = subData?.name || "Jurusan";
    } else {
      wordsList = categories[catKey]?.words || [];
      titleName = categories[catKey]?.name || "Kategori";
    }

    if (wordsList.length < 2) {
      alert('Kosakata belum cukup untuk membuat kuis (minimal 2 kata).');
      return;
    }

    const questions = shuffle(wordsList.map(w => ({ question: w[0], answer: w[1] }))).slice(0, 10);
    beginQuiz(`Tes Kategori ${titleName}`, questions, wordsList.map(w => w[1]));
    logActivity(`Memulai kuis kategori: ${titleName}`);
  };

  const startNumberQuiz = () => {
    let questions = [];
    while (questions.length < 10) {
      let n = Math.floor(Math.random() * 100) + 1;
      if (!questions.some(q => q.question === String(n))) {
        questions.push({ question: String(n), answer: numberToWords(n) });
      }
    }
    beginQuiz('Tes Angka 1-100', questions, Array.from({ length: 100 }, (_, i) => numberToWords(i + 1)));
    logActivity(`Memulai kuis Angka 1-100`);
  };

  const startCustomQuiz = (quiz) => {
    const questions = shuffle(quiz.questions).map(q => ({ question: q.question, answer: q.answer, options: q.options }));
    beginQuiz(`Soal Guru: ${quiz.title}`, questions, []);
    logActivity(`Memulai soal dari guru: ${quiz.title}`);
  };

  const handleAnswer = (option) => {
    if (quizState.answered) return;
    const currentQ = quizState.questions[quizState.idx];
    const isCorrect = option === currentQ.answer;

    const updatedResults = [
      ...quizState.results,
      { question: currentQ.question, chosen: option, correct: currentQ.answer, isCorrect }
    ];
    const newScore = isCorrect ? quizState.score + 1 : quizState.score;

    setQuizState(prev => ({ ...prev, answered: true, selectedOption: option, score: newScore, results: updatedResults }));

    if (quizState.idx + 1 >= quizState.questions.length) {
      saveQuizReport(newScore, quizState.questions.length, updatedResults, quizState.title);
    }
  };

  const nextQuestion = () => {
    const nextIdx = quizState.idx + 1;
    if (nextIdx < quizState.questions.length) {
      const nextQ = quizState.questions[nextIdx];
      setQuizState(prev => ({
        ...prev,
        idx: nextIdx,
        answered: false,
        selectedOption: null,
        currentOptions: generateOptionsForQuestion(nextQ, prev.allOptionsPool)
      }));
    } else {
      setQuizState(prev => ({ ...prev, idx: nextIdx }));
    }
  };

  const handleAddWord = (e) => {
    e.preventDefault();
    if (!newEnWord.trim() || !newIdWord.trim() || !activeCategoryKey) return;

    if (activeCategoryKey.startsWith('jurusan_')) {
      const subKey = activeCategoryKey.replace('jurusan_', '');
      if (jurusanVocab?.categories?.[subKey]) {
        jurusanVocab.categories[subKey].words.push([newEnWord.trim().toLowerCase(), newIdWord.trim().toLowerCase()]);
      }
    } else {
      const updatedWords = [...categories[activeCategoryKey].words, [newEnWord.trim().toLowerCase(), newIdWord.trim().toLowerCase()]];
      setCategories(prev => ({ ...prev, [activeCategoryKey]: { ...prev[activeCategoryKey], words: updatedWords } }));
    }

    logActivity(`Menambahkan kosakata baru: '${newEnWord}'`);
    setNewEnWord('');
    setNewIdWord('');
  };

  const handleDeleteWord = (indexToDelete) => {
    if (!activeCategoryKey) return;
    if (activeCategoryKey.startsWith('jurusan_')) {
      const subKey = activeCategoryKey.replace('jurusan_', '');
      if (jurusanVocab?.categories?.[subKey]) {
        jurusanVocab.categories[subKey].words = jurusanVocab.categories[subKey].words.filter((_, idx) => idx !== indexToDelete);
      }
    } else {
      const updatedWords = categories[activeCategoryKey].words.filter((_, idx) => idx !== indexToDelete);
      setCategories(prev => ({ ...prev, [activeCategoryKey]: { ...prev[activeCategoryKey], words: updatedWords } }));
    }
    logActivity(`Menghapus kosakata`);
    setActiveCategoryKey(prev => prev);
  };

  /* ---------- Pengumuman (guru) ---------- */
  const handlePostAnnouncement = (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    const item = { id: Date.now(), title: annTitle.trim(), body: annBody.trim(), author: staffName, time: nowText() };
    setAnnouncements(prev => {
      const updated = [item, ...prev];
      localStorage.setItem('kosakata_announcements', JSON.stringify(updated));
      return updated;
    });
    postToApi({ type: 'announcement', ...item });
    logActivity(`Membuat pengumuman: ${item.title}`, staffName);
    setAnnTitle('');
    setAnnBody('');
  };

  const handleDeleteAnnouncement = (id) => {
    setAnnouncements(prev => {
      const updated = prev.filter(a => a.id !== id);
      localStorage.setItem('kosakata_announcements', JSON.stringify(updated));
      return updated;
    });
    logActivity(`Menghapus pengumuman`, staffName);
  };

  /* ---------- Buat soal (guru) ---------- */
  const handleAddDraftQuestion = (e) => {
    e.preventDefault();
    const opts = qOpts.map(o => o.trim());
    const filled = opts.filter(Boolean);
    if (!qText.trim()) return alert('Tulis pertanyaannya dulu.');
    if (filled.length < 2) return alert('Isi minimal 2 pilihan jawaban.');
    if (!opts[qCorrect]) return alert('Pilih jawaban benar dari pilihan yang sudah terisi.');
    setDraftQuestions(prev => [...prev, { question: qText.trim(), options: filled, answer: opts[qCorrect] }]);
    setQText('');
    setQOpts(['', '', '', '']);
    setQCorrect(0);
  };

  const handleSaveQuiz = () => {
    if (!quizTitleInput.trim()) return alert('Beri judul untuk kumpulan soal ini.');
    if (draftQuestions.length === 0) return alert('Tambahkan minimal 1 soal.');
    const item = { id: Date.now(), title: quizTitleInput.trim(), author: staffName, time: nowText(), questions: draftQuestions };
    setCustomQuizzes(prev => {
      const updated = [item, ...prev];
      localStorage.setItem('kosakata_custom_quizzes', JSON.stringify(updated));
      return updated;
    });
    postToApi({ type: 'quiz', ...item });
    logActivity(`Membuat soal: ${item.title} (${item.questions.length} soal)`, staffName);
    setQuizTitleInput('');
    setDraftQuestions([]);
  };

  const handleDeleteQuiz = (id) => {
    setCustomQuizzes(prev => {
      const updated = prev.filter(q => q.id !== id);
      localStorage.setItem('kosakata_custom_quizzes', JSON.stringify(updated));
      return updated;
    });
    logActivity(`Menghapus kumpulan soal`, staffName);
  };

  /* ---------------- Tema: abu-abu hijau lembut (nyaman di mata) ---------------- */
  const d = isDarkMode;
  const theme = d ? {
    bg: 'bg-[#15181a] text-[#d9dfdb]',
    headerBg: 'bg-[#15181a]/85 border-[#2a3033]',
    card: 'bg-[#1d2123] border-[#2a3033] hover:border-[#4a5a53]',
    cardStatic: 'bg-[#1d2123] border-[#2a3033]',
    soft: 'bg-[#15181a]',
    subText: 'text-[#8a9691]',
    titleText: 'text-[#eef2ef]',
    accentText: 'text-[#9fc2b2]',
    inputBg: 'bg-[#15181a] border-[#2a3033] text-[#eef2ef] placeholder:text-[#5f6b66] focus:border-[#6f8f82]',
    btnSecondary: 'bg-[#1d2123] hover:bg-[#252a2d] text-[#cfd6d2] border-[#2a3033]',
    btnPrimary: 'bg-[#8fb3a3] hover:bg-[#a0c2b3] text-[#14201b]',
    sidebarBg: 'bg-[#1a1e20] border-[#2a3033]',
    divider: 'divide-[#2a3033]',
    line: 'border-[#2a3033]',
    hoverRow: 'hover:bg-[#23282a]',
    navActive: 'bg-[#26312d] text-[#b5d1c5]',
    navIdle: 'text-[#8a9691] hover:bg-[#23282a] hover:text-[#eef2ef]',
    chip: 'bg-[#26312d] text-[#b5d1c5]',
    good: 'text-[#9fc2b2]',
    bad: 'text-[#d9a49d]',
    badBox: 'bg-[#3a2726] text-[#d9a49d] border-[#54332f]',
    track: 'bg-[#2a3033]',
    bar: 'bg-[#8fb3a3]',
  } : {
    bg: 'bg-[#eef1ef] text-[#2b3330]',
    headerBg: 'bg-[#eef1ef]/85 border-[#dde2de]',
    card: 'bg-[#f9faf9] border-[#dde2de] hover:border-[#9fb3a9] shadow-[0_1px_2px_rgba(40,60,50,0.05)]',
    cardStatic: 'bg-[#f9faf9] border-[#dde2de] shadow-[0_1px_2px_rgba(40,60,50,0.05)]',
    soft: 'bg-[#f0f3f1]',
    subText: 'text-[#6c7772]',
    titleText: 'text-[#1f2724]',
    accentText: 'text-[#3f6255]',
    inputBg: 'bg-[#f0f3f1] border-[#dde2de] text-[#1f2724] placeholder:text-[#9aa5a0] focus:border-[#6f8f82]',
    btnSecondary: 'bg-[#f9faf9] hover:bg-[#eef1ef] text-[#3a4540] border-[#dde2de]',
    btnPrimary: 'bg-[#4a6b5f] hover:bg-[#3f5e53] text-[#f6f9f7]',
    sidebarBg: 'bg-[#f9faf9] border-[#dde2de]',
    divider: 'divide-[#e3e8e4]',
    line: 'border-[#e3e8e4]',
    hoverRow: 'hover:bg-[#f0f3f1]',
    navActive: 'bg-[#e1e9e4] text-[#2f4a41]',
    navIdle: 'text-[#6c7772] hover:bg-[#eef1ef] hover:text-[#1f2724]',
    chip: 'bg-[#e6ece8] text-[#3f5e53]',
    good: 'text-[#3f6255]',
    bad: 'text-[#9a5a52]',
    badBox: 'bg-[#f3e4e1] text-[#8a4b43] border-[#e6cfca]',
    track: 'bg-[#dde2de]',
    bar: 'bg-[#4a6b5f]',
  };

  const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8f82]/50';
  const isStaff = isAdmin || isTeacher;

  // Ikon polos: bulat, garis tipis
  const IconTile = ({ Icon, emoji, size = 'md' }) => {
    const box = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
    const ico = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <div className={`${box} rounded-full flex items-center justify-center shrink-0 ${theme.chip}`}>
        {Icon ? <Icon className={ico} strokeWidth={1.5} /> : <span className={size === 'lg' ? 'text-2xl' : 'text-lg'}>{emoji}</span>}
      </div>
    );
  };

  const Logo = ({ size = 'md' }) => (
    <div className={`${size === 'lg' ? 'w-14 h-14' : 'w-10 h-10'} rounded-full flex items-center justify-center shrink-0 ${theme.btnPrimary}`}>
      <BookOpen className={size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'} strokeWidth={1.5} />
    </div>
  );

  const EmptyText = ({ children }) => (
    <div className="p-8 text-center"><p className={`text-sm ${theme.subText}`}>{children}</p></div>
  );

  const avgScore = studentReports.length
    ? Math.round(studentReports.reduce((a, r) => a + r.percentage, 0) / studentReports.length)
    : 0;
  const uniqueStudents = new Set(studentReports.map(r => r.user)).size;

  const pageTitleMap = {
    admin_dashboard: isAdmin ? 'Dashboard Administrator' : 'Dashboard Guru',
    staff_soal: 'Buat Soal',
    staff_pengumuman: 'Pengumuman',
    home: 'Beranda',
    jurusan_menu: 'Pilih Jurusan SMK',
    category_detail: 'Daftar Kosakata',
    numbers: 'Modul Angka',
    quiz: 'Kuis',
  };

  const fieldCls = `w-full px-4 py-3 border rounded-xl text-sm ${focusRing} ${theme.inputBg}`;

  /* ================================================================ */
  /*  LOGIN                                                            */
  /* ================================================================ */
  if (!user && !isAdmin && !isTeacher) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${theme.bg} font-sans flex items-center justify-center p-4 relative`}>
        {isLoading && (
          <div className={`absolute top-5 ${theme.btnPrimary} px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg z-50`}>
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat aplikasi
          </div>
        )}

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`absolute top-5 right-5 p-2.5 rounded-full border ${theme.btnSecondary} ${focusRing}`}
          aria-label="Ganti tema"
        >
          {isDarkMode ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
        </button>

        <div className={`max-w-md w-full ${theme.cardStatic} border p-8 sm:p-10 rounded-3xl space-y-8`}>
          <div className="flex flex-col items-center text-center gap-4">
            <Logo size="lg" />
            <div>
              <h1 className={`text-2xl font-semibold tracking-tight ${theme.titleText}`}>Kosakata Yuk</h1>
              <p className={`text-sm ${theme.subText} mt-1.5`}>Masukkan nama untuk mulai belajar</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium ${theme.subText} mb-2`}>Nama siswa</label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${theme.subText}`}>
                  <User className="w-4 h-4" strokeWidth={1.5} />
                </span>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className={`${fieldCls} pl-11`}
                  required
                />
              </div>
            </div>
            <button type="submit" className={`w-full py-3 ${theme.btnPrimary} font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition ${focusRing}`}>
              Mulai belajar <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className={`flex-1 border-t ${theme.line}`} />
            <span className={`text-xs ${theme.subText}`}>atau masuk sebagai</span>
            <div className={`flex-1 border-t ${theme.line}`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowAdminLoginModal(true)} className={`py-3 border rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 ${theme.btnSecondary} ${focusRing}`}>
              <Shield className="w-4 h-4" strokeWidth={1.5} /> Admin
            </button>
            <button onClick={() => setShowTeacherLoginModal(true)} className={`py-3 border rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 ${theme.btnSecondary} ${focusRing}`}>
              <GraduationCap className="w-4 h-4" strokeWidth={1.5} /> Guru
            </button>
          </div>
        </div>

        {showAdminLoginModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`${theme.cardStatic} border max-w-sm w-full p-6 rounded-2xl space-y-5 shadow-2xl`}>
              <div className="flex justify-between items-center">
                <h3 className={`font-semibold text-sm ${theme.titleText} flex items-center gap-2.5`}>
                  <IconTile Icon={Shield} size="sm" /> Login Admin
                </h3>
                <button onClick={() => setShowAdminLoginModal(false)} className={`p-1.5 rounded-lg ${theme.subText} ${focusRing}`} aria-label="Tutup">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium ${theme.subText} mb-1.5`}>PIN Admin (default: 1234)</label>
                  <input type="password" placeholder="Masukkan PIN" value={adminPinInput} onChange={(e) => setAdminPinInput(e.target.value)} className={fieldCls} required />
                </div>
                <button type="submit" className={`w-full py-3 ${theme.btnPrimary} font-medium rounded-xl text-sm transition ${focusRing}`}>Masuk sebagai Admin</button>
              </form>
            </div>
          </div>
        )}

        {showTeacherLoginModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`${theme.cardStatic} border max-w-sm w-full p-6 rounded-2xl space-y-5 shadow-2xl`}>
              <div className="flex justify-between items-center">
                <h3 className={`font-semibold text-sm ${theme.titleText} flex items-center gap-2.5`}>
                  <IconTile Icon={GraduationCap} size="sm" /> Login Guru
                </h3>
                <button onClick={() => setShowTeacherLoginModal(false)} className={`p-1.5 rounded-lg ${theme.subText} ${focusRing}`} aria-label="Tutup">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <form onSubmit={handleTeacherLogin} className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium ${theme.subText} mb-1.5`}>PIN Guru (default: 5678)</label>
                  <input type="password" placeholder="Masukkan PIN" value={teacherPinInput} onChange={(e) => setTeacherPinInput(e.target.value)} className={fieldCls} required />
                </div>
                <button type="submit" className={`w-full py-3 ${theme.btnPrimary} font-medium rounded-xl text-sm transition ${focusRing}`}>Masuk sebagai Guru</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================================================================ */
  /*  APLIKASI UTAMA                                                   */
  /* ================================================================ */
  const navBtn = (active) =>
    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${focusRing} ${active ? theme.navActive : theme.navIdle}`;
  const goto = (s) => { setScreen(s); setIsSidebarOpen(false); };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme.bg} font-sans pb-12 flex relative overflow-x-hidden`}>

      {isLoading && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 ${theme.btnPrimary} px-5 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-xl z-[100]`}>
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat sesi aplikasi
        </div>
      )}

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm md:hidden" />}

      {/* ---------- Sidebar ---------- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r ${theme.sidebarBg} transition-transform duration-300 flex flex-col justify-between ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className={`p-5 border-b ${theme.line} shrink-0`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => goto(isStaff ? 'admin_dashboard' : 'home')}>
              <Logo />
              <h1 className={`text-lg font-semibold tracking-tight ${theme.titleText}`}>Kosakata Yuk</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className={`p-1.5 md:hidden ${theme.subText}`} aria-label="Tutup menu">
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          <div className={`p-3 rounded-2xl border ${theme.line} ${theme.soft} flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${theme.chip}`}>
              {isAdmin ? <Shield className="w-4 h-4" strokeWidth={1.5} /> : isTeacher ? <GraduationCap className="w-4 h-4" strokeWidth={1.5} /> : user?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className={`text-xs ${theme.subText} block`}>{isStaff ? 'Status' : 'Siswa aktif'}</span>
              <span className={`text-sm font-semibold ${theme.titleText} truncate block`}>{isAdmin ? 'Administrator' : isTeacher ? 'Guru' : user}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-1">
            <span className={`px-3 text-xs font-medium ${theme.subText} block mb-2`}>Menu utama</span>
            {isStaff ? (
              <>
                <button onClick={() => goto('admin_dashboard')} className={navBtn(screen === 'admin_dashboard')}>
                  <Activity className="w-4 h-4" strokeWidth={1.5} /> Pantau siswa
                </button>
                <button onClick={() => goto('staff_soal')} className={navBtn(screen === 'staff_soal')}>
                  <ClipboardList className="w-4 h-4" strokeWidth={1.5} /> Buat soal
                </button>
                <button onClick={() => goto('staff_pengumuman')} className={navBtn(screen === 'staff_pengumuman')}>
                  <Megaphone className="w-4 h-4" strokeWidth={1.5} /> Pengumuman
                </button>
              </>
            ) : (
              <>
                <button onClick={() => goto('home')} className={navBtn(screen === 'home')}>
                  <Home className="w-4 h-4" strokeWidth={1.5} /> Beranda
                </button>
                <button onClick={() => { setIsChatOpen(true); setIsSidebarOpen(false); }} className={navBtn(false)}>
                  <MessageSquare className="w-4 h-4" strokeWidth={1.5} /> Asisten AI
                </button>
              </>
            )}
          </div>

          {!isStaff && (
            <div className="space-y-1">
              <span className={`px-3 text-xs font-medium ${theme.subText} block mb-2`}>Modul belajar</span>
              <button onClick={() => { setActiveCategoryKey(null); goto('numbers'); }} className={navBtn(screen === 'numbers')}>
                <Hash className="w-4 h-4" strokeWidth={1.5} /> Angka 1-100
              </button>
              <button onClick={() => goto('jurusan_menu')} className={navBtn(screen === 'jurusan_menu')}>
                <GraduationCap className="w-4 h-4" strokeWidth={1.5} /> Kosakata jurusan SMK
              </button>
            </div>
          )}

          <div className="space-y-1">
            <span className={`px-3 text-xs font-medium ${theme.subText} block mb-2`}>Tampilan</span>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`${navBtn(false)} justify-between`}>
              <div className="flex items-center gap-3">
                {isDarkMode ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
                <span>Mode gelap</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-md ${theme.chip}`}>{isDarkMode ? 'Aktif' : 'Mati'}</span>
            </button>
          </div>
        </div>

        <div className={`p-4 border-t ${theme.line} shrink-0`}>
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition ${theme.btnSecondary} ${focusRing}`}>
            <LogOut className="w-4 h-4" strokeWidth={1.5} /> Keluar
          </button>
        </div>
      </aside>

      {/* ---------- Konten ---------- */}
      <div className="flex-1 md:pl-72 flex flex-col min-h-screen">
        <header className={`sticky top-0 z-30 backdrop-blur-md border-b ${theme.headerBg} transition-colors px-4 sm:px-8 py-3.5 mb-8 flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className={`p-2.5 rounded-full border md:hidden ${theme.btnSecondary}`} aria-label="Buka menu">
              <Menu className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <span className={`text-sm font-semibold ${theme.titleText}`}>{pageTitleMap[screen]}</span>
          </div>

          <div className="flex items-center gap-2">
            {!isStaff && (
              <button onClick={() => setIsChatOpen(true)} className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2.5 rounded-full transition ${theme.btnPrimary} ${focusRing}`}>
                <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} /> Asisten AI
              </button>
            )}
            {screen !== 'home' && !isStaff && (
              <button onClick={() => setScreen('home')} className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2.5 rounded-full border transition ${theme.btnSecondary} ${focusRing}`}>
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} /> Beranda
              </button>
            )}
          </div>
        </header>

        <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 flex-1">

          {/* ===== STAFF: PANTAU ===== */}
          {isStaff && screen === 'admin_dashboard' && (
            <div className="space-y-6">
              <div className={`${theme.cardStatic} p-6 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <div className="flex items-start gap-4">
                  <IconTile Icon={isTeacher ? GraduationCap : Shield} size="lg" />
                  <div>
                    <h2 className={`text-xl font-semibold tracking-tight ${theme.titleText}`}>Pantau nilai dan aktivitas siswa</h2>
                    <p className={`text-sm ${theme.subText} mt-1 max-w-lg`}>Login, latihan, dan detail benar salah kuis siswa terekam otomatis di sini.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('kosakata_logs');
                    localStorage.removeItem('kosakata_reports');
                    setActivityLogs([]);
                    setStudentReports([]);
                  }}
                  className={`px-4 py-2.5 border rounded-full text-xs font-medium flex items-center gap-2 transition shrink-0 ${theme.btnSecondary} ${focusRing}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} /> Reset data
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { Icon: Users, label: 'Siswa aktif', value: uniqueStudents },
                  { Icon: ClipboardList, label: 'Kuis selesai', value: studentReports.length },
                  { Icon: Percent, label: 'Rata-rata nilai', value: `${avgScore}%` },
                ].map(({ Icon, label, value }) => (
                  <div key={label} className={`${theme.cardStatic} border rounded-2xl p-5 flex items-center gap-4`}>
                    <IconTile Icon={Icon} />
                    <div>
                      <p className={`text-xs ${theme.subText}`}>{label}</p>
                      <p className={`text-2xl font-semibold tracking-tight ${theme.titleText}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`${theme.cardStatic} border rounded-2xl overflow-hidden`}>
                <div className={`p-4 border-b ${theme.line} flex justify-between items-center`}>
                  <h3 className={`font-semibold text-sm ${theme.titleText} flex items-center gap-2.5`}>
                    <Trophy className="w-4 h-4" strokeWidth={1.5} /> Hasil tes dan kuis siswa
                  </h3>
                  <span className={`text-xs ${theme.subText}`}>{studentReports.length} laporan</span>
                </div>

                <div className={`divide-y ${theme.divider} max-h-[420px] overflow-y-auto`}>
                  {studentReports.length === 0 ? (
                    <EmptyText>Belum ada siswa yang menyelesaikan kuis.</EmptyText>
                  ) : (
                    studentReports.map((report) => (
                      <div key={report.id} className={`p-4 space-y-3 transition ${theme.hoverRow}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${theme.btnPrimary}`}>
                              {report.user?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className={`text-sm font-semibold ${theme.titleText}`}>{report.user} · {report.title}</h4>
                              <span className={`text-xs ${theme.subText} flex items-center gap-1`}><Clock className="w-3 h-3" strokeWidth={1.5} /> {report.time}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${theme.chip}`}>{report.score}/{report.total}</span>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${theme.btnPrimary}`}>{report.percentage}%</span>
                          </div>
                        </div>

                        <div className={`pl-3 border-l-2 ${theme.line} pt-1`}>
                          <span className={`text-xs font-medium ${theme.subText} block mb-2`}>Analisis per soal</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {report.details.map((item, idx) => (
                              <div key={idx} className={`p-2.5 rounded-xl text-xs border flex items-center justify-between gap-2 ${theme.line} ${theme.soft}`}>
                                <span className={`font-medium capitalize ${theme.titleText}`}>{item.question}</span>
                                <div className="text-right">
                                  <span className={`flex items-center justify-end gap-1 font-medium ${item.isCorrect ? theme.good : theme.bad}`}>
                                    {item.isCorrect ? <><CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Benar</> : <><XCircle className="w-3.5 h-3.5" strokeWidth={1.75} /> Salah ({item.chosen})</>}
                                  </span>
                                  {!item.isCorrect && <span className={`text-[11px] ${theme.subText}`}>Kunci: {item.correct}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={`${theme.cardStatic} border rounded-2xl overflow-hidden`}>
                <div className={`p-4 border-b ${theme.line} flex justify-between items-center`}>
                  <h3 className={`font-semibold text-sm ${theme.titleText} flex items-center gap-2.5`}>
                    <Activity className="w-4 h-4" strokeWidth={1.5} /> Log aktivitas
                  </h3>
                  <span className={`text-xs ${theme.subText}`}>{activityLogs.length} aktivitas</span>
                </div>
                <div className={`divide-y ${theme.divider} max-h-[320px] overflow-y-auto`}>
                  {activityLogs.length === 0 ? (
                    <EmptyText>Belum ada aktivitas terekam.</EmptyText>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className={`p-3.5 flex items-center justify-between gap-3 text-sm ${theme.hoverRow}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`px-2 py-0.5 rounded-md font-medium text-xs shrink-0 ${theme.chip}`}>{log.user}</span>
                          <span className={`${theme.titleText} truncate`}>{log.action}</span>
                        </div>
                        <span className={`text-xs ${theme.subText} shrink-0 hidden sm:block`}>{log.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== STAFF: BUAT SOAL ===== */}
          {isStaff && screen === 'staff_soal' && (
            <div className="space-y-6">
              <div className={`${theme.cardStatic} p-6 border rounded-2xl flex items-start gap-4`}>
                <IconTile Icon={ClipboardList} size="lg" />
                <div>
                  <h2 className={`text-xl font-semibold tracking-tight ${theme.titleText}`}>Buat soal untuk siswa</h2>
                  <p className={`text-sm ${theme.subText} mt-1`}>Susun soal pilihan ganda. Setelah disimpan, soal langsung muncul di beranda siswa dan nilainya masuk ke panel pantau.</p>
                </div>
              </div>

              <div className={`${theme.cardStatic} border rounded-2xl p-5 space-y-5`}>
                <div>
                  <label className={`block text-xs font-medium ${theme.subText} mb-2`}>Judul kumpulan soal</label>
                  <input type="text" placeholder="Contoh: Ulangan Harian Bab 1" value={quizTitleInput} onChange={(e) => setQuizTitleInput(e.target.value)} className={fieldCls} />
                </div>

                <form onSubmit={handleAddDraftQuestion} className={`p-4 rounded-2xl border ${theme.line} ${theme.soft} space-y-3`}>
                  <label className={`block text-xs font-medium ${theme.subText}`}>Pertanyaan</label>
                  <textarea rows={2} placeholder="Contoh: Apa bahasa Inggris dari 'kucing'?" value={qText} onChange={(e) => setQText(e.target.value)} className={`${fieldCls} resize-none`} />

                  <label className={`block text-xs font-medium ${theme.subText} pt-1`}>Pilihan jawaban (pilih bulatan untuk jawaban benar)</label>
                  <div className="space-y-2">
                    {qOpts.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <input type="radio" name="correct" checked={qCorrect === i} onChange={() => setQCorrect(i)} className="w-4 h-4 accent-[#4a6b5f] shrink-0" aria-label={`Jawaban benar ${i + 1}`} />
                        <input
                          type="text"
                          placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                          value={opt}
                          onChange={(e) => setQOpts(prev => prev.map((o, idx) => idx === i ? e.target.value : o))}
                          className={fieldCls}
                        />
                      </div>
                    ))}
                  </div>
                  <button type="submit" className={`px-4 py-2.5 border rounded-full text-xs font-medium flex items-center gap-2 transition ${theme.btnSecondary} ${focusRing}`}>
                    <Plus className="w-4 h-4" strokeWidth={1.75} /> Tambah soal ke daftar
                  </button>
                </form>

                <div>
                  <p className={`text-xs font-medium ${theme.subText} mb-2`}>Daftar soal ({draftQuestions.length})</p>
                  {draftQuestions.length === 0 ? (
                    <p className={`text-sm ${theme.subText}`}>Belum ada soal. Tambahkan lewat formulir di atas.</p>
                  ) : (
                    <div className={`divide-y ${theme.divider} border ${theme.line} rounded-xl overflow-hidden`}>
                      {draftQuestions.map((q, i) => (
                        <div key={i} className="p-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${theme.titleText}`}>{i + 1}. {q.question}</p>
                            <p className={`text-xs ${theme.subText} mt-0.5`}>Jawaban: <span className={theme.good}>{q.answer}</span> · {q.options.length} pilihan</p>
                          </div>
                          <button onClick={() => setDraftQuestions(prev => prev.filter((_, idx) => idx !== i))} className={`${theme.subText} p-1 shrink-0`} title="Hapus soal">
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={handleSaveQuiz} className={`w-full sm:w-auto px-6 py-3 ${theme.btnPrimary} font-medium rounded-full text-sm flex items-center justify-center gap-2 transition ${focusRing}`}>
                  <Send className="w-4 h-4" strokeWidth={1.75} /> Simpan dan bagikan ke siswa
                </button>
              </div>

              <div className={`${theme.cardStatic} border rounded-2xl overflow-hidden`}>
                <div className={`p-4 border-b ${theme.line} flex justify-between items-center`}>
                  <h3 className={`font-semibold text-sm ${theme.titleText}`}>Soal yang sudah dibagikan</h3>
                  <span className={`text-xs ${theme.subText}`}>{customQuizzes.length} kumpulan</span>
                </div>
                <div className={`divide-y ${theme.divider}`}>
                  {customQuizzes.length === 0 ? (
                    <EmptyText>Belum ada soal yang dibagikan.</EmptyText>
                  ) : (
                    customQuizzes.map((quiz) => (
                      <div key={quiz.id} className={`p-4 flex items-center justify-between gap-3 ${theme.hoverRow}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <IconTile Icon={ClipboardList} size="sm" />
                          <div className="min-w-0">
                            <h4 className={`text-sm font-semibold ${theme.titleText} truncate`}>{quiz.title}</h4>
                            <span className={`text-xs ${theme.subText}`}>{quiz.questions.length} soal · {quiz.author} · {quiz.time}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteQuiz(quiz.id)} className={`${theme.subText} p-1.5 shrink-0`} title="Hapus">
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== STAFF: PENGUMUMAN ===== */}
          {isStaff && screen === 'staff_pengumuman' && (
            <div className="space-y-6">
              <div className={`${theme.cardStatic} p-6 border rounded-2xl flex items-start gap-4`}>
                <IconTile Icon={Megaphone} size="lg" />
                <div>
                  <h2 className={`text-xl font-semibold tracking-tight ${theme.titleText}`}>Pengumuman untuk siswa</h2>
                  <p className={`text-sm ${theme.subText} mt-1`}>Pengumuman akan tampil di bagian atas beranda siswa.</p>
                </div>
              </div>

              <form onSubmit={handlePostAnnouncement} className={`${theme.cardStatic} border rounded-2xl p-5 space-y-3`}>
                <input type="text" placeholder="Judul pengumuman" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className={fieldCls} required />
                <textarea rows={4} placeholder="Isi pengumuman" value={annBody} onChange={(e) => setAnnBody(e.target.value)} className={`${fieldCls} resize-none`} required />
                <button type="submit" className={`px-6 py-3 ${theme.btnPrimary} font-medium rounded-full text-sm flex items-center gap-2 transition ${focusRing}`}>
                  <Send className="w-4 h-4" strokeWidth={1.75} /> Kirim pengumuman
                </button>
              </form>

              <div className={`${theme.cardStatic} border rounded-2xl overflow-hidden`}>
                <div className={`p-4 border-b ${theme.line} flex justify-between items-center`}>
                  <h3 className={`font-semibold text-sm ${theme.titleText}`}>Pengumuman aktif</h3>
                  <span className={`text-xs ${theme.subText}`}>{announcements.length} pengumuman</span>
                </div>
                <div className={`divide-y ${theme.divider}`}>
                  {announcements.length === 0 ? (
                    <EmptyText>Belum ada pengumuman.</EmptyText>
                  ) : (
                    announcements.map((a) => (
                      <div key={a.id} className={`p-4 flex items-start justify-between gap-3 ${theme.hoverRow}`}>
                        <div className="min-w-0">
                          <h4 className={`text-sm font-semibold ${theme.titleText}`}>{a.title}</h4>
                          <p className={`text-sm ${theme.subText} mt-1 whitespace-pre-line`}>{a.body}</p>
                          <span className={`text-xs ${theme.subText} mt-2 block`}>{a.author} · {a.time}</span>
                        </div>
                        <button onClick={() => handleDeleteAnnouncement(a.id)} className={`${theme.subText} p-1.5 shrink-0`} title="Hapus">
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== HOME SISWA ===== */}
          {screen === 'home' && !isStaff && (
            <div className="space-y-8">
              <div className={`${theme.cardStatic} border p-6 sm:p-8 rounded-3xl flex items-center gap-5`}>
                <Logo size="lg" />
                <div>
                  <h2 className={`text-2xl sm:text-3xl font-semibold tracking-tight ${theme.titleText} capitalize`}>Halo, {user}</h2>
                  <p className={`text-sm ${theme.subText} mt-1.5 max-w-md`}>Pilih kategori kosakata atau kerjakan kuis. Nilai dan aktivitas belajarmu tercatat otomatis untuk guru.</p>
                </div>
              </div>

              {announcements.length > 0 && (
                <div className="space-y-3">
                  <h2 className={`text-sm font-semibold ${theme.titleText} flex items-center gap-2`}>
                    <Megaphone className="w-4 h-4" strokeWidth={1.5} /> Pengumuman dari guru
                  </h2>
                  {announcements.slice(0, 3).map((a) => (
                    <div key={a.id} className={`${theme.cardStatic} border rounded-2xl p-5`}>
                      <h4 className={`text-sm font-semibold ${theme.titleText}`}>{a.title}</h4>
                      <p className={`text-sm ${theme.subText} mt-1 whitespace-pre-line`}>{a.body}</p>
                      <span className={`text-xs ${theme.subText} mt-3 block`}>{a.author} · {a.time}</span>
                    </div>
                  ))}
                </div>
              )}

              {customQuizzes.length > 0 && (
                <div className="space-y-3">
                  <h2 className={`text-sm font-semibold ${theme.titleText} flex items-center gap-2`}>
                    <ClipboardList className="w-4 h-4" strokeWidth={1.5} /> Soal dari guru
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customQuizzes.map((quiz) => (
                      <div key={quiz.id} className={`${theme.card} border p-5 rounded-2xl flex items-center justify-between gap-3 transition`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <IconTile Icon={ClipboardList} />
                          <div className="min-w-0">
                            <h4 className={`text-sm font-semibold ${theme.titleText} truncate`}>{quiz.title}</h4>
                            <p className={`text-xs ${theme.subText} mt-0.5`}>{quiz.questions.length} soal</p>
                          </div>
                        </div>
                        <button onClick={() => startCustomQuiz(quiz)} className={`px-4 py-2 ${theme.btnPrimary} rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 ${focusRing}`}>
                          <Play className="w-3 h-3 fill-current" /> Kerjakan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className={`text-sm font-semibold ${theme.titleText} mb-4`}>Modul pelajaran</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div onClick={() => { setScreen('jurusan_menu'); logActivity(`Membuka menu Kosakata Jurusan SMK`); }} className={`${theme.card} border p-5 rounded-2xl cursor-pointer transition flex flex-col justify-between gap-5 group`}>
                    <IconTile Icon={GraduationCap} />
                    <div>
                      <h4 className={`font-semibold ${theme.titleText} text-sm`}>Kosakata jurusan SMK</h4>
                      <p className={`text-xs ${theme.subText} mt-1`}>DKV, RPL, TP, Kuliner, dan lainnya</p>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${theme.accentText}`}>
                      <span>Pilih jurusan</span> <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={1.75} />
                    </div>
                  </div>

                  <div onClick={() => { setScreen('numbers'); logActivity(`Membuka modul Angka 1-100`); }} className={`${theme.card} border p-5 rounded-2xl cursor-pointer transition flex flex-col justify-between gap-5`}>
                    <IconTile Icon={Hash} />
                    <div>
                      <h4 className={`font-semibold ${theme.titleText} text-sm`}>Angka 1-100</h4>
                      <p className={`text-xs ${theme.subText} mt-1`}>Latihan angka bahasa Inggris</p>
                    </div>
                  </div>

                  {Object.entries(categories).map(([key, cat]) => (
                    <div key={key} onClick={() => { setActiveCategoryKey(key); setScreen('category_detail'); logActivity(`Membuka kategori ${cat.name}`); }} className={`${theme.card} border p-5 rounded-2xl cursor-pointer transition flex flex-col justify-between gap-5`}>
                      <IconTile Icon={categoryIconMap[key]} emoji={cat.emoji} />
                      <div>
                        <h4 className={`font-semibold ${theme.titleText} text-sm`}>{cat.name}</h4>
                        <p className={`text-xs ${theme.subText} mt-1`}>{cat.words.length} kosakata</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== JURUSAN MENU ===== */}
          {screen === 'jurusan_menu' && !isStaff && (
            <div className="space-y-6">
              <div className={`${theme.cardStatic} p-6 border rounded-2xl flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-4">
                  <IconTile Icon={GraduationCap} size="lg" />
                  <div>
                    <h2 className={`text-xl font-semibold tracking-tight ${theme.titleText}`}>Kosakata jurusan SMK</h2>
                    <p className={`text-sm ${theme.subText} mt-1`}>Pilih jurusan untuk mulai belajar kosakata kejuruan</p>
                  </div>
                </div>
                <button onClick={() => setScreen('home')} className={`px-4 py-2.5 rounded-full text-xs font-medium border ${theme.btnSecondary} ${focusRing}`}>Kembali</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {jurusanVocab?.categories && Object.entries(jurusanVocab.categories).map(([subKey, subData]) => (
                  <div key={subKey} onClick={() => { setActiveCategoryKey(`jurusan_${subKey}`); setScreen('category_detail'); logActivity(`Membuka Jurusan: ${subData.name}`); }} className={`${theme.card} border p-5 rounded-2xl cursor-pointer transition flex items-center justify-between group`}>
                    <div className="flex items-center gap-4">
                      <IconTile emoji={subData.emoji} />
                      <div>
                        <h4 className={`font-semibold ${theme.titleText} text-sm`}>{subData.name}</h4>
                        <p className={`text-xs ${theme.subText} mt-0.5`}>{subData.words.length} kosakata</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${theme.subText} group-hover:translate-x-1 transition-transform`} strokeWidth={1.5} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== CATEGORY DETAIL ===== */}
          {screen === 'category_detail' && activeCategoryKey && !isStaff && (
            <div className="space-y-6">
              {(() => {
                const activeData = getActiveWordsAndDetails();
                return (
                  <>
                    <div className={`${theme.cardStatic} p-6 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                      <div className="flex items-center gap-4">
                        <IconTile Icon={activeData.Icon} emoji={activeData.emoji} size="lg" />
                        <div>
                          <h2 className={`text-xl font-semibold tracking-tight ${theme.titleText}`}>{activeData.name}</h2>
                          <p className={`text-sm ${theme.subText} mt-0.5`}>{activeData.words.length} kosakata</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setScreen(activeCategoryKey.startsWith('jurusan_') ? 'jurusan_menu' : 'home')} className={`px-4 py-3 border rounded-full text-xs font-medium ${theme.btnSecondary} ${focusRing}`}>Kembali</button>
                        <button onClick={() => startCategoryQuiz(activeCategoryKey)} className={`px-5 py-3 ${theme.btnPrimary} font-medium rounded-full text-xs flex items-center gap-2 transition ${focusRing}`}>
                          <Play className="w-3.5 h-3.5 fill-current" /> Mulai kuis
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleAddWord} className={`${theme.cardStatic} p-3 border rounded-2xl flex flex-col sm:flex-row gap-2.5`}>
                      <input type="text" placeholder="Inggris (contoh: design)" value={newEnWord} onChange={(e) => setNewEnWord(e.target.value)} className={`flex-1 px-4 py-2.5 border rounded-xl text-sm ${focusRing} ${theme.inputBg}`} />
                      <input type="text" placeholder="Indonesia (contoh: desain)" value={newIdWord} onChange={(e) => setNewIdWord(e.target.value)} className={`flex-1 px-4 py-2.5 border rounded-xl text-sm ${focusRing} ${theme.inputBg}`} />
                      <button type="submit" className={`px-4 py-2.5 ${theme.btnPrimary} font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 ${focusRing}`}>
                        <Plus className="w-4 h-4" strokeWidth={1.75} /> Tambah kata
                      </button>
                    </form>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                      {activeData.words.map(([en, id], idx) => (
                        <div
                          key={idx}
                          onClick={() => { setSelectedWord({ en, id, emoji: activeData.emoji }); speakWord(en); logActivity(`Mempelajari kata: '${en}'`); }}
                          className={`${theme.card} border p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition`}
                        >
                          <div>
                            <span className={`text-base font-semibold ${theme.titleText} capitalize`}>{en}</span>
                            <p className={`text-xs ${theme.subText} mt-0.5 capitalize`}>{id}</p>
                          </div>
                          <div className={`flex justify-between items-center mt-4 pt-2.5 border-t ${theme.line}`} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleDeleteWord(idx)} className={`${theme.subText} p-1 rounded-md`} title="Hapus">
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                            <button onClick={() => speakWord(en)} className={`${theme.subText} p-1 rounded-md`} title="Suara">
                              <Volume2 className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ===== NUMBERS ===== */}
          {screen === 'numbers' && !isStaff && (
            <div className="space-y-6">
              <div className={`${theme.cardStatic} p-6 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <div className="flex items-center gap-4">
                  <IconTile Icon={Hash} size="lg" />
                  <div>
                    <h2 className={`text-xl font-semibold tracking-tight ${theme.titleText}`}>Modul angka 1-100</h2>
                    <p className={`text-sm ${theme.subText} mt-0.5`}>Dengarkan pelafalan angka dalam bahasa Inggris</p>
                  </div>
                </div>
                <button onClick={startNumberQuiz} className={`px-5 py-3 ${theme.btnPrimary} font-medium rounded-full text-xs flex items-center gap-2 transition ${focusRing}`}>
                  <Play className="w-3.5 h-3.5 fill-current" /> Tes angka
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-h-[560px] overflow-y-auto pr-1">
                {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
                  const textWord = numberToWords(n);
                  return (
                    <div key={n} onClick={() => { setSelectedWord({ en: textWord, id: String(n), emoji: '#' }); speakWord(textWord); }} className={`${theme.card} border p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition`}>
                      <span className={`text-2xl font-semibold tracking-tight ${theme.titleText}`}>{n}</span>
                      <div className="flex justify-between items-end mt-2" onClick={(e) => e.stopPropagation()}>
                        <span className={`text-xs font-medium ${theme.subText} capitalize`}>{textWord}</span>
                        <button onClick={() => speakWord(textWord)} className={`${theme.subText} p-1`}>
                          <Volume2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== QUIZ ===== */}
          {screen === 'quiz' && !isStaff && (
            <div className="max-w-2xl mx-auto">
              {quizState.idx >= quizState.questions.length ? (
                <div className={`${theme.cardStatic} border rounded-3xl p-8 sm:p-10 text-center space-y-6`}>
                  <div className="flex justify-center"><IconTile Icon={Trophy} size="lg" /></div>
                  <h2 className={`text-xl font-semibold tracking-tight ${theme.titleText}`}>{quizState.title} selesai</h2>
                  <div>
                    <div className={`text-6xl font-semibold tracking-tight ${theme.accentText}`}>
                      {Math.round((quizState.score / quizState.questions.length) * 100)}%
                    </div>
                    <p className={`text-sm ${theme.subText} mt-2`}>
                      <span className={`${theme.titleText} font-semibold`}>{quizState.score}</span> dari {quizState.questions.length} jawaban benar
                    </p>
                  </div>
                  <button onClick={() => setScreen('home')} className={`px-6 py-3 ${theme.btnPrimary} font-medium rounded-full text-sm ${focusRing}`}>Kembali ke beranda</button>
                </div>
              ) : (
                <div className={`${theme.cardStatic} border rounded-3xl p-6 sm:p-8 space-y-6`}>
                  <div className="space-y-3">
                    <div className={`flex justify-between items-center text-xs font-medium ${theme.subText}`}>
                      <span>Soal {quizState.idx + 1} dari {quizState.questions.length}</span>
                      <span>Skor {quizState.score}</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${theme.track}`}>
                      <div className={`h-full rounded-full transition-all duration-300 ${theme.bar}`} style={{ width: `${((quizState.idx + (quizState.answered ? 1 : 0)) / quizState.questions.length) * 100}%` }} />
                    </div>
                  </div>

                  <div className="text-center py-6">
                    <h3 className={`text-3xl font-semibold tracking-tight ${theme.titleText} capitalize`}>{quizState.questions[quizState.idx].question}</h3>
                    <p className={`text-sm ${theme.subText} mt-2`}>Pilih jawaban yang benar</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quizState.currentOptions.map((opt, i) => {
                      const correctAnswer = quizState.questions[quizState.idx].answer;
                      let btnStyle = theme.btnSecondary;
                      let Mark = null;
                      if (quizState.answered) {
                        if (opt === correctAnswer) {
                          btnStyle = `${theme.btnPrimary} border-transparent font-semibold`;
                          Mark = CheckCircle2;
                        } else if (opt === quizState.selectedOption) {
                          btnStyle = theme.badBox;
                          Mark = XCircle;
                        } else {
                          btnStyle = `${theme.btnSecondary} opacity-45`;
                        }
                      }
                      return (
                        <button key={i} onClick={() => handleAnswer(opt)} disabled={quizState.answered} className={`p-4 border rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 capitalize ${btnStyle} ${focusRing}`}>
                          {Mark && <Mark className="w-4 h-4 shrink-0" strokeWidth={1.75} />} {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quizState.answered && (
                    <div className="pt-2 flex justify-end">
                      <button onClick={nextQuestion} className={`px-6 py-3 ${theme.btnPrimary} font-medium rounded-full text-sm flex items-center gap-2 ${focusRing}`}>
                        {quizState.idx + 1 >= quizState.questions.length ? 'Lihat hasil' : 'Soal berikutnya'} <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      <ChatAssistant isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} isDarkMode={isDarkMode} />
    </div>
  );
}