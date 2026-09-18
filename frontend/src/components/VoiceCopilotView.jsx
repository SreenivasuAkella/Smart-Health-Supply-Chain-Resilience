'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, Sparkles, Languages, 
  ArrowRight, Truck, Radio, Square, RotateCcw, Send, CheckCircle2,
  Clock, ShieldAlert, Cpu, Activity, PhoneCall, Headphones, FileCheck2,
  AlertTriangle, Play, ChevronRight, Zap, RefreshCw, BarChart3,
  ChevronDown, ChevronUp, Layers, Bot, Building2, ExternalLink, Navigation,
  MessageSquare, User, HelpCircle, History, PlusCircle, Thermometer, Box,
  Camera, UploadCloud, FileText, AlertOctagon, Image as ImageIcon, X,
  Search, Check, Pill, MapPin, Gauge, ShieldCheck
} from 'lucide-react';
import { 
  chatWithAshaCopilot,
  fetchCopilotSessions,
  fetchCopilotSessionDetail,
  fetchFacilities 
} from '../services/api';
import { mapBackendName, formatCopilotTime } from '../utils/formatters';
import OpenFDAClinicalCard from './OpenFDAClinicalCard';

const AGENT_CONFIG = {
  AshaVoiceCopilotAgent: {
    label: 'Frontline Copilot',
    icon: '🎙️',
    role: 'Triage & Natural Dialogue',
    badgeClass: 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40'
  },
  FacilityDirectoryAgent: {
    label: 'Facility Directory',
    icon: '🏥',
    role: 'GIS Node Resolution',
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
  },
  ContextSynchronizationAgent: {
    label: 'Context Sync',
    icon: '🔄',
    role: 'Multi-Turn Session State',
    badgeClass: 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40'
  },
  ClinicalClarificationAgent: {
    label: 'Clinical Clarifier',
    icon: '💬',
    role: 'Protocol Slot Filling',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-500/40'
  },
  StockoutSentinelAgent: {
    label: 'Stockout Sentinel',
    icon: '🔍',
    role: 'e-Aushadhi Ledger Audit',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-500/40'
  },
  SupplyChainSupervisorAgent: {
    label: 'Crisis Supervisor',
    icon: '⚡',
    role: 'Autonomous Override Logic',
    badgeClass: 'bg-purple-950/70 text-purple-300 border-purple-500/40'
  },
  AllocationStrategistAgent: {
    label: 'Allocation Strategist',
    icon: '🧠',
    role: 'Optimal Donor Pairing',
    badgeClass: 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40'
  },
  FleetRoutingAgent: {
    label: 'Fleet & Routing',
    icon: '🚚',
    role: 'Drone / EV Dispatch corridor',
    badgeClass: 'bg-blue-950/70 text-blue-300 border-blue-500/40'
  },
  LedgerExecutionAgent: {
    label: 'Ledger Audit & Commit',
    icon: '📝',
    role: 'GxP Immutable Ledger Record',
    badgeClass: 'bg-teal-950/70 text-teal-300 border-teal-500/40'
  },
  ColdChainGuardianAgent: {
    label: 'Cold-Chain Guardian',
    icon: '❄️',
    role: 'IoT Thermal Excursion Watchdog',
    badgeClass: 'bg-rose-950/70 text-rose-300 border-rose-500/40'
  },
  TechnicianDispatchAgent: {
    label: 'Technician Dispatch',
    icon: '🛠️',
    role: 'Biomedical Field SOS',
    badgeClass: 'bg-orange-950/70 text-orange-300 border-orange-500/40'
  },
  FacilityReadinessAgent: {
    label: 'Facility Readiness',
    icon: '🛏️',
    role: 'ICU & Bed Surge Triage',
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
  },
  EpidemicSurveillanceAgent: {
    label: 'Epidemic Surveillance',
    icon: '📈',
    role: 'IDSP Morbidity Clustering',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-500/40'
  }
};

const getAgentInfo = (agentName) => {
  if (!agentName) return { label: 'Autonomous Agent', icon: '🤖', role: 'Clinical AI Node', badgeClass: 'bg-slate-900 text-slate-300 border-slate-700' };
  const cleanName = agentName.endsWith('Agent') ? agentName : `${agentName}Agent`;
  return AGENT_CONFIG[cleanName] || AGENT_CONFIG[agentName] || {
    label: agentName.replace('Agent', ''),
    icon: '🤖',
    role: 'Specialized Agent',
    badgeClass: 'bg-slate-900 text-slate-300 border-slate-700'
  };
};

export default function VoiceCopilotView({ apiKey, onTriggerReallocation }) {
  const [selectedLang, setSelectedLang] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  const [mounted, setMounted] = useState(false);

  // Conversational session management
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [accumulatedContext, setAccumulatedContext] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);

  // Multimodal Gemini Vision State
  const [attachedImageBase64, setAttachedImageBase64] = useState(null);
  const [attachedImageName, setAttachedImageName] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedFacility, setSelectedFacility] = useState(null);

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearAttachedImage = () => {
    setAttachedImageBase64(null);
    setAttachedImageName(null);
  };

  useEffect(() => {
    try {
      if (sessionId) {
        localStorage.setItem('asha_copilot_active_session_id', sessionId);
      }
    } catch (_) {}
  }, [sessionId]);

  useEffect(() => {
    try {
      if (selectedFacility) {
        localStorage.setItem('asha_copilot_active_facility', JSON.stringify(selectedFacility));
      } else {
        localStorage.removeItem('asha_copilot_active_facility');
      }
    } catch (_) {}
  }, [selectedFacility]);

  const supportedLanguages = [
    { code: 'hi', bcp47: 'hi-IN', name: 'हिन्दी', fullName: 'हिन्दी (Hindi)', flag: '🇮🇳', region: 'North / Central India' },
    { code: 'te', bcp47: 'te-IN', name: 'తెలుగు', fullName: 'తెలుగు (Telugu)', flag: '🇮🇳', region: 'Andhra Pradesh & Telangana' },
    { code: 'ta', bcp47: 'ta-IN', name: 'தமிழ்', fullName: 'தமிழ் (Tamil)', flag: '🇮🇳', region: 'Tamil Nadu & Puducherry' },
    { code: 'mr', bcp47: 'mr-IN', name: 'मराठी', fullName: 'मराठी (Marathi)', flag: '🇮🇳', region: 'Maharashtra & Goa' },
    { code: 'bn', bcp47: 'bn-IN', name: 'বাংলা', fullName: 'বাংলা (Bengali)', flag: '🇮🇳', region: 'West Bengal & Tripura' },
    { code: 'kn', bcp47: 'kn-IN', name: 'ಕನ್ನಡ', fullName: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳', region: 'Karnataka' },
    { code: 'ml', bcp47: 'ml-IN', name: 'മലയാളം', fullName: 'മലയാളം (Malayalam)', flag: '🇮🇳', region: 'Kerala & Lakshadweep' },
    { code: 'en', bcp47: 'en-IN', name: 'English', fullName: 'English (India)', flag: '🌐', region: 'Pan-India National' }
  ];

  const starterPromptCategories = [
    {
      id: 'snakebite',
      title: 'Snakebite ASV Emergency',
      tag: 'Critical Clinical Protocol',
      icon: '🐍',
      accent: 'rose',
      borderClass: 'hover:border-rose-500/50 hover:bg-rose-950/20',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      prompt: {
        hi: "हमारे पास केवल 3 शीशियां एंटी-वेनम बची हैं, तत्काल 25 शीशियां निकटतम अधिशेष अस्पताल से भेजें",
        en: "We only have 3 vials of Anti-Snake Venom left, dispatch 25 vials immediately from the nearest surplus hospital",
        te: "మా వద్ద 3 యాంటీ-స్నేక్ వెనమ్ మాత్రమే ఉన్నాయి, సమీప మిగులు ఆసుపత్రి నుండి 25 అత్యవసరంగా పంపండి",
        ta: "எங்களிடம் 3 பாம்புக்கடி விஷமுறிவு மருந்துகள் மட்டுமே உள்ளன, உடனடியாக 25 அனுப்பவும்",
        mr: "आमच्याकडे फक्त ३ अँटी-स्नेक व्हेनम उरले आहेत, त्वरित २५ पाठवा",
        bn: "আমাদের কাছে মাত্র ৩টি অ্যান্টি-ভেনম অবশিষ্ট আছে, অবিলম্বে ২৫টি পাঠান",
        kn: "ನಮ್ಮಲ್ಲಿ ಕೇವಲ 3 ಆಂಟಿ-ಸ್ನೇಕ್ ವೆನಮ್ ಉಳಿದಿದೆ, ತಕ್ಷಣ 25 ಕಳುಹಿಸಿ",
        ml: "ഞങ്ങളുടെ പക്കൽ 3 ആന്റി-വെനം വയലുകൾ മാത്രമേയുള്ളൂ, അടിയന്തിരമായി 25 അയക്കുക"
      }
    },
    {
      id: 'transfer',
      title: 'Inter-Hospital Stock Transfer',
      tag: 'Autonomous Corridor',
      icon: '🏥',
      accent: 'cyan',
      borderClass: 'hover:border-cyan-500/50 hover:bg-cyan-950/20',
      badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      prompt: {
        hi: "निकोबार जिला अस्पताल से अंडमान जिला अस्पताल में 20 एंटी-वेनम शीशियां पुनःआवंटित करें",
        en: "Reallocate 20 vials of Anti-Snake Venom from Nicobar Islands DH to Andaman Islands DH",
        te: "నికోబార్ జిల్లా ఆసుపత్రి నుండి అండమాన్ జిల్లా ఆసుపత్రికి 20 యాంటీ-స్నేక్ వెనమ్ బదిలీ చేయండి",
        ta: "நிகோபார் மாவட்ட மருத்துவமனையிலிருந்து அந்தமான் மருத்துவமனைக்கு 20 மருந்துகளை மாற்றவும்",
        mr: "निकोबार जिल्हा रुग्णालयातून अंदमान जिल्हा रुग्णालयात २० अँटी-व्हेनम ट्रान्सफर करा",
        bn: "নিকোবর জেলা হাসপাতাল থেকে আন্দামান জেলা হাসপাতালে ২০টি অ্যান্টি-ভেনম স্থানান্তর করুন",
        kn: "ನಿಕೋಬಾರ್ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಯಿಂದ ಅಂಡಮಾನ್ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಗೆ 20 ಆಂಟಿ-ವೆನಮ್ ವರ್ಗಾಯಿಸಿ",
        ml: "നിക്കോബാർ ജില്ലാ ആശുപത്രിയിൽ നിന്ന് ആന്റമാൻ ജില്ലാ ആശുപത്രിയിലേക്ക് 20 ആന്റി-വെനം മാറ്റുക"
      }
    },
    {
      id: 'coldchain',
      title: 'Cold-Chain Thermal Breach',
      tag: 'IoT Telemetry SOS',
      icon: '❄️',
      accent: 'amber',
      borderClass: 'hover:border-amber-500/50 hover:bg-amber-950/20',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      prompt: {
        hi: "हमारे केंद्र के आईएलआर रेफ्रिजरेटर का तापमान 8.9°C हो गया है, तत्काल तकनीशियन भेजें",
        en: "Our facility ILR refrigerator temperature breached 8.9°C, dispatch a cold-chain biomedical technician immediately",
        te: "మా కేంద్రం ఐఎల్ఆర్ రిఫ్రిజిరేటర్ ఉష్ణోగ్రత 8.9°C దాటింది, వెంటనే టెక్నీషియన్‌ను పంపండి",
        ta: "எங்கள் குளிர்சாதன பெட்டி வெப்பநிலை 8.9°C ஆக அதிகரித்துள்ளது, தொழில்நுட்ப வல்லுநரை அனுப்பவும்",
        mr: "आमच्या केंद्राचे आयएलआर रेफ्रिजरेटर तापमान ८.९ अंश झाले आहे, त्वरित तंत्रज्ञ पाठवा",
        bn: "আমাদের কেন্দ্রের রেফ্রিজারেটরের তাপমাত্রা ৮.৯°C এ পৌঁছেছে, অবিলম্বে টেকনিশিয়ান পাঠান",
        kn: "ನಮ್ಮ ಕೇಂದ್ರದ ಐಎಲ್‌ಆರ್ ತಾಪಮಾನ 8.9°C ಮೀರಿದೆ, ತಕ್ಷಣ ತಂತ್ರಜ್ಞರನ್ನು ಕಳುಹಿಸಿ",
        ml: "ഞങ്ങളുടെ കേന്ദ്രത്തിലെ റഫ്രിಜറേറ്റർ താപനില 8.9°C ആയി ഉയർന്നു, സാങ്കേതിക വിദഗ്ദ്ധനെ അയക്കുക"
      }
    },
    {
      id: 'dialogue',
      title: 'Incomplete Dialogue Triage',
      tag: 'Multi-Turn Slot Filling',
      icon: '💬',
      accent: 'indigo',
      borderClass: 'hover:border-indigo-500/50 hover:bg-indigo-950/20',
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      prompt: {
        hi: "हमारे केंद्र पर आवश्यक दवाओं की आपातकालीन स्थिति जांचें और कमी होने पर मंगाएं",
        en: "Audit our facility's emergency medicine levels and arrange replenishment for stockouts",
        te: "మా కేంద్రంలో అత్యవసర మందుల నిల్వలను తనిఖీ చేసి కొరత ఉంటే సరఫరా చేయండి",
        ta: "எங்கள் மையத்தில் அவசர மருந்து இருப்பை சரிபார்த்து பற்றாக்குறையை நிரப்பவும்",
        mr: "आमच्या केंद्रावरील औषधांची तपासणी करा आणि तुटवडा असल्यास मागवा",
        bn: "আমাদের কেন্দ্রে জরুরি ওষুধের স্তর অডিট করুন এবং ঘাটতি থাকলে সরবরাহ করুন",
        kn: "ನಮ್ಮ ಕೇಂದ್ರದಲ್ಲಿ ತುರ್ತು ಔಷಧಿಗಳ ಸಂಗ್ರಹ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಕೊರತೆಯನ್ನು ಪೂರೈಸಿ",
        ml: "ഞങ്ങളുടെ കേന്ദ്രത്തിലെ അടിയന്തര മരുന്നുകൾ പരിശോധിച്ച് ലഭ്യത ഉറപ്പാക്കുക"
      }
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadHistoryAndSessions = async () => {
    try {
      const sessList = await fetchCopilotSessions();
      if (sessList && sessList.length > 0) {
        setRecentSessions(sessList);
      }
    } catch (e) {
      console.warn("Failed to load sessions:", e);
    }

    try {
      const savedSid = localStorage.getItem('asha_copilot_active_session_id');
      if (savedSid) {
        const fullSess = await fetchCopilotSessionDetail(savedSid);
        if (fullSess && fullSess.messages && fullSess.messages.length > 0) {
          setMessages(fullSess.messages);
          if (fullSess.context) setAccumulatedContext(fullSess.context);
          if (fullSess.facility_name || fullSess.facility_id) {
            setSelectedFacility({
              id: fullSess.facility_id,
              name: fullSess.facility_name,
              district: fullSess.district || '',
              state: fullSess.state || ''
            });
          }
          if (fullSess.language_code) {
            setSelectedLang(fullSess.language_code);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to restore saved session:", e);
    }
  };

  useEffect(() => {
    setMounted(true);
    try {
      const savedSid = localStorage.getItem('asha_copilot_active_session_id');
      if (savedSid) {
        setSessionId(savedSid);
      } else {
        const newSid = `SESS-${Date.now().toString(36).toUpperCase()}`;
        setSessionId(newSid);
        localStorage.setItem('asha_copilot_active_session_id', newSid);
      }

      const savedFac = localStorage.getItem('asha_copilot_active_facility');
      if (savedFac) {
        setSelectedFacility(JSON.parse(savedFac));
      }
    } catch (_) {
      setSessionId(`SESS-${Date.now().toString(36).toUpperCase()}`);
    }

    loadHistoryAndSessions();

    const handleSync = () => {
      loadHistoryAndSessions();
    };
    window.addEventListener('asha_copilot_session_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      stopSpeaking();
      stopListening();
      window.removeEventListener('asha_copilot_session_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const startNewSession = () => {
    stopSpeaking();
    stopListening();
    const newSid = `SESS-${Date.now().toString(36).toUpperCase()}`;
    setSessionId(newSid);
    setMessages([]);
    setAccumulatedContext({});
    setSelectedFacility(null);
    setInputText('');
    clearAttachedImage();
    try {
      localStorage.setItem('asha_copilot_active_session_id', newSid);
      localStorage.removeItem('asha_copilot_active_facility');
      window.dispatchEvent(new CustomEvent('asha_copilot_session_updated', { detail: { sessionId: newSid } }));
    } catch (_) {}
  };

  const handleRestoreSession = async (s) => {
    stopSpeaking();
    stopListening();
    setSessionId(s.session_id);
    setShowHistoryDrawer(false);
    try {
      localStorage.setItem('asha_copilot_active_session_id', s.session_id);
      window.dispatchEvent(new CustomEvent('asha_copilot_session_updated', { detail: { sessionId: s.session_id } }));
      const fullDetail = await fetchCopilotSessionDetail(s.session_id);
      if (fullDetail && Array.isArray(fullDetail.messages) && fullDetail.messages.length > 0) {
        setMessages(fullDetail.messages);
        if (fullDetail.context) setAccumulatedContext(fullDetail.context);
        if (fullDetail.facility_id || fullDetail.facility_name) {
          setSelectedFacility({
            id: fullDetail.facility_id,
            name: fullDetail.facility_name,
            district: fullDetail.district || '',
            state: fullDetail.state || ''
          });
        }
        if (fullDetail.language_code) {
          setSelectedLang(fullDetail.language_code);
        }
      } else if (s.messages) {
        setMessages(s.messages);
        if (s.facility_id || s.facility_name) {
          setSelectedFacility({
            id: s.facility_id,
            name: s.facility_name,
            district: '',
            state: ''
          });
        }
      }
    } catch (err) {
      console.warn("Failed to restore full session detail:", err);
      if (s.messages) setMessages(s.messages);
    }
  };

  const getLangBcp47 = (code) => {
    const found = supportedLanguages.find(l => l.code === code);
    return found ? found.bcp47 : 'hi-IN';
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setPlayingMsgId(null);
    }
  };

  const speakText = (text, langCode, msgId = null) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (!text) return;
      stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);
      const bcp47 = getLangBcp47(langCode);
      utterance.lang = bcp47;
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang === bcp47 || v.lang.startsWith(langCode));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setPlayingMsgId(msgId);
      };
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setPlayingMsgId(null);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setPlayingMsgId(null);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    stopSpeaking();
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        const demoPrompt = starterPromptCategories[0].prompt[selectedLang] || starterPromptCategories[0].prompt['hi'];
        setInputText(demoPrompt);
      }, 1500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = getLangBcp47(selectedLang);
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setInputText(currentTranscript);
        }
      };

      recognition.onerror = (err) => {
        console.warn("Speech recognition notice:", err.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Failed to initialize SpeechRecognition:", err);
      setIsRecording(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSendQuery = async (queryText = null) => {
    stopListening();
    stopSpeaking();

    const textToSend = queryText || inputText;
    const currentImage = attachedImageBase64;
    const currentImageName = attachedImageName;

    if (!textToSend.trim() && !currentImage) return;

    setInputText('');
    clearAttachedImage();
    setLoading(true);

    const userMsgId = `USER-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: textToSend || (currentImageName ? `Uploaded health asset: ${currentImageName}` : "Inspection request"),
      language_code: selectedLang,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      has_image: Boolean(currentImage),
      image_base64: currentImage,
      image_name: currentImageName
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await chatWithAshaCopilot({
        prompt: textToSend || (currentImageName ? `Please analyze this clinical asset: ${currentImageName}` : "Clinical inspection request"),
        sessionId: sessionId,
        language: selectedLang,
        facilityId: selectedFacility?.id || null,
        facilityName: selectedFacility?.name || null,
        sourceFacilityId: null,
        sourceFacilityName: null,
        history: messages,
        apiKey: apiKey,
        imageBase64: currentImage
      });

      if (result) {
        if (result.session_id) {
          setSessionId(result.session_id);
          try {
            localStorage.setItem('asha_copilot_active_session_id', result.session_id);
            window.dispatchEvent(new CustomEvent('asha_copilot_session_updated', { detail: { sessionId: result.session_id } }));
          } catch (_) {}
        }
        if (result.accumulated_context) {
          setAccumulatedContext(result.accumulated_context);
        }

        if (result.facility_id || result.facility_name) {
          setSelectedFacility({
            id: result.facility_id,
            name: result.facility_name,
            district: result.extracted_entities?.district_name || selectedFacility?.district || '',
            state: result.extracted_entities?.state_name || selectedFacility?.state || ''
          });
        }

        const asstMsgId = `ASST-${Date.now()}`;
        const asstMsg = {
          id: asstMsgId,
          role: 'assistant',
          content: result.response_text_localized || result.response_text_english || result.clarification_prompt_localized || result.clarification_prompt_english,
          content_english: result.response_text_english || result.clarification_prompt_english,
          status: result.status,
          intent: result.intent,
          confidence: result.confidence,
          is_clarification_needed: result.is_clarification_needed,
          missing_slots: result.missing_slots || [],
          quick_reply_options: result.quick_reply_options || [],
          recommended_action: result.recommended_action,
          dispatch_package: result.dispatch_package,
          cold_chain_incident: result.cold_chain_incident,
          target_facility_name: result.target_facility_name || selectedFacility?.name,
          target_facility_id: result.target_facility_id || selectedFacility?.id,
          source_facility_name: result.source_facility_name || (result.recommended_action?.suggested_source_facility),
          source_facility_id: result.source_facility_id,
          nearest_surplus_donor: result.nearest_surplus_donor,
          is_user_specified_donor: result.is_user_specified_donor,
          execution_trace: result.execution_trace || [],
          agents_invoked: result.agents_invoked || [],
          tools_executed: result.tools_executed || [],
          medicine_id: result.medicine_id || result.extracted_entities?.medicine_id || result.recommended_action?.medicine_id,
          quantity: result.requested_quantity || result.extracted_entities?.requested_quantity || result.recommended_action?.quantity || 20,
          vision_analysis: result.vision_analysis,
          clinical_protocol_card: result.clinical_protocol_card,
          orchestration_duration_ms: result.orchestration_duration_ms,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, asstMsg]);

        if (autoSpeak && (result.response_text_localized || result.clarification_prompt_localized)) {
          speakText(result.response_text_localized || result.clarification_prompt_localized, selectedLang, asstMsgId);
        }

        if (result?.recommended_action?.action_type === 'CREATE_DISPATCH_ORDER' && onTriggerReallocation) {
          const plan = result.dispatch_package || result.recommended_action?.dispatch_package || result.recommended_action?.dispatch_plan;
          const targetId = result.target_facility_id || result.facility_id || result.recommended_action?.target_facility_id || selectedFacility?.id;
          const medId = result.extracted_entities?.medicine_id || result.recommended_action?.medicine_id || 'PUB-MED-001';
          const qty = result.extracted_entities?.requested_quantity || result.recommended_action?.quantity || 20;
          onTriggerReallocation(plan || targetId, medId, qty);
        }

        loadHistoryAndSessions();
      }
    } catch (err) {
      console.error("Copilot request error:", err);
      const errMsg = {
        id: `ERR-${Date.now()}`,
        role: 'assistant',
        content: "आपातकालीन सर्वर से संपर्क स्थापित किया जा रहा है... (Connecting to clinical mesh)",
        content_english: "Connecting to emergency clinical multi-agent engine...",
        status: "ERROR",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const activeLangObj = supportedLanguages.find(l => l.code === selectedLang) || supportedLanguages[0];

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-6 relative">

      {/* FULL-WIDTH CONVERSATIONAL STUDIO (CLEAN, IMMERSIVE, NO COLUMNS) */}
      <div className="flex flex-col h-[calc(100vh-130px)] min-h-[580px] glass-panel border border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl bg-slate-950/70 backdrop-blur-2xl">
        
        {/* COMPACT STUDIO HEADER STRIP */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Left: Engine & Session Status Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Clinical Swarm Active</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">&bull;</span>
            <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Sparkles size={11} /> Gemini 2.5 Flash Native
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 hidden md:inline" suppressHydrationWarning>
              Session: <strong className="text-cyan-400" suppressHydrationWarning>{mounted && sessionId ? sessionId.slice(-6) : 'LIVE'}</strong>
            </span>
          </div>

          {/* Right: Language Selector, History, Auto-Audio & New Session */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Regional Dialect Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 px-2.5 py-1 rounded-xl shadow-inner">
              <span className="text-sm">{activeLangObj.flag}</span>
              <select
                value={selectedLang}
                onChange={(e) => {
                  stopSpeaking();
                  stopListening();
                  setSelectedLang(e.target.value);
                }}
                aria-label="Select regional language"
                className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer pr-1"
              >
                {supportedLanguages.map(l => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                    {l.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Sessions History Drawer Trigger */}
            <button
              onClick={() => setShowHistoryDrawer(true)}
              className="text-xs px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition-all"
              title="View consultation history"
            >
              <History size={13} className="text-cyan-400" />
              <span>History</span>
              {recentSessions.length > 0 && (
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono px-1.5 rounded-full">
                  {recentSessions.length}
                </span>
              )}
            </button>

            {/* Auto-Speech Toggle Switch */}
            <button
              onClick={() => {
                if (isPlayingAudio) stopSpeaking();
                setAutoSpeak(prev => !prev);
              }}
              className={`p-1.5 px-2.5 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 ${
                autoSpeak
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
              title={autoSpeak ? "Voice Auto-Read Active" : "Voice Auto-Read Muted"}
            >
              {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span className="hidden sm:inline text-[11px]">{autoSpeak ? "Voice On" : "Muted"}</span>
            </button>

            {/* Start New Triage Session Button */}
            <button
              onClick={startNewSession}
              className="btn-secondary text-xs py-1 px-3 rounded-xl border border-slate-800 hover:border-slate-700 flex items-center gap-1.5"
              title="Start a new consultation"
            >
              <PlusCircle size={13} className="text-cyan-400" />
              <span>New Triage</span>
            </button>
          </div>

        </div>

        {/* CONVERSATIONAL MESSAGES VIEWPORT (FULL WIDTH, SINGLE SMOOTH SCROLL, ZERO CLIPPING) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700/80 scrollbar-track-transparent flex flex-col">
          
          {/* ULTRA-COMPACT ZERO-SCROLL EMPTY STATE */}
          {messages.length === 0 ? (
            <div className="w-full max-w-5xl mx-auto pt-1 pb-2 space-y-2.5 animate-fadeIn">
              

              {/* Scenarios in 2-Column Grid (2 cards per row) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Sparkles size={11} /> Quick 1-Click Triage Scenarios:
                  </span>
                  <span className="text-slate-500 font-normal">Auto-localized in {activeLangObj.name}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {starterPromptCategories.map((item) => {
                    const promptText = item.prompt[selectedLang] || item.prompt['hi'];
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSendQuery(promptText)}
                        className={`p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/90 transition-all text-left group flex flex-col justify-between shadow-md hover:scale-[1.01] ${item.borderClass}`}
                      >
                        <div className="flex items-center justify-between gap-2 w-full mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base shrink-0">{item.icon}</span>
                            <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                              {item.title}
                            </span>
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${item.badgeClass}`}>
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 group-hover:text-slate-300 line-clamp-2 leading-relaxed">
                          "{promptText}"
                        </p>
                        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-bold text-cyan-400">
                          <span>Execute Requisition</span>
                          <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            /* ACTIVE MESSAGE STREAM */
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isClarification = msg.is_clarification_needed;
              const isPlayingThis = isPlayingAudio && playingMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-fadeIn`}
                >
                  {/* SENDER BADGE & TIMESTAMP */}
                  <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                    {isUser ? (
                      <>
                        <span className="font-semibold text-slate-300">Frontline Health Worker (ASHA)</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span>{formatCopilotTime(msg.timestamp)}</span>
                        <div className="w-5 h-5 rounded-full bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                          <User size={11} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                          <Sparkles size={11} />
                        </div>
                        <span className="font-bold text-cyan-300">Sanjeevani AI Copilot</span>
                        {msg.intent && (
                          <span className="bg-slate-800 text-cyan-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-slate-700/80">
                            {mapBackendName(msg.intent)}
                          </span>
                        )}
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span>{formatCopilotTime(msg.timestamp)}</span>
                      </>
                    )}
                  </div>

                  {/* MESSAGE BUBBLE CONTAINER */}
                  <div
                    className={`max-w-[94%] sm:max-w-[85%] rounded-2xl p-4 sm:p-5 space-y-3.5 ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/10 rounded-tr-sm'
                        : 'bg-slate-900/90 border border-slate-800/90 text-slate-100 shadow-xl rounded-tl-sm backdrop-blur-md'
                    }`}
                  >
                    {/* User Attached Image Thumbnail */}
                    {isUser && msg.image_base64 && (
                      <div className="rounded-xl overflow-hidden border border-white/20 max-w-[260px] bg-slate-950/70 p-1">
                        <img src={msg.image_base64} alt="Clinical Attachment" className="w-full h-auto object-cover max-h-44 rounded-lg" />
                        <div className="px-1.5 py-1 flex items-center justify-between text-[10px] text-cyan-100">
                          <span className="flex items-center gap-1 font-semibold"><Camera size={11} /> Visual Inspection</span>
                          <span className="opacity-75 truncate max-w-[120px]">{msg.image_name || "asset.jpg"}</span>
                        </div>
                      </div>
                    )}

                    {/* Copilot Audio Controls & Dialect Indicator */}
                    {!isUser && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                            <Languages size={13} /> {activeLangObj.name} Voice Output:
                          </span>
                          {isPlayingThis && (
                            <div className="flex items-center gap-0.5">
                              <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce"></span>
                              <span className="w-1 h-4 bg-cyan-300 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                              <span className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (isPlayingThis) {
                              stopSpeaking();
                            } else {
                              speakText(msg.content, selectedLang, msg.id);
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                            isPlayingThis
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                          }`}
                        >
                          {isPlayingThis ? (
                            <>
                              <Square size={10} className="fill-rose-300" />
                              <span>Stop Audio</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={12} className="text-cyan-400" />
                              <span>Play Audio</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Primary Localized Response Text */}
                    <p className="text-xs sm:text-sm font-medium leading-relaxed">
                      {msg.content}
                    </p>

                    {/* Multimodal Gemini Vision Inspection Card */}
                    {!isUser && msg.vision_analysis && (
                      <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3.5 space-y-2.5 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                              <Camera size={15} />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide block">
                                {msg.vision_analysis.summary_title || "Multimodal Vision Inspection"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {msg.vision_analysis.category} &bull; {msg.vision_analysis.ai_engine_used || 'Gemini Vision'}
                              </span>
                            </div>
                          </div>
                          <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Visual Audit Verified
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {msg.vision_analysis.findings_summary}
                        </p>

                        {/* Medicine Packaging OCR & Authenticity Card */}
                        {(msg.vision_analysis.category === 'MEDICINE_PACK' || msg.vision_analysis.medicine_details?.brand_name || msg.vision_analysis.brand_name) && (
                          <div className="bg-slate-900/90 rounded-xl border border-slate-800/80 p-3 space-y-2 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">Brand Name</span>
                                <span className="font-bold text-cyan-300 truncate block">
                                  {msg.vision_analysis.medicine_details?.brand_name || msg.vision_analysis.brand_name || "Identified Asset"}
                                </span>
                              </div>
                              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">Generic / Composition</span>
                                <span className="font-semibold text-slate-200 truncate block">
                                  {msg.vision_analysis.medicine_details?.generic_name || msg.vision_analysis.generic_name || "Clinical Formulation"}
                                </span>
                              </div>
                              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">Batch No.</span>
                                <span className="font-mono text-emerald-300 font-semibold truncate block">
                                  {msg.vision_analysis.medicine_details?.batch_number || msg.vision_analysis.batch_number || "Verified"}
                                </span>
                              </div>
                              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">Expiry Date</span>
                                <span className="font-medium text-amber-300 truncate block">
                                  {msg.vision_analysis.medicine_details?.expiry_date || msg.vision_analysis.expiry_date || "Valid"}
                                </span>
                              </div>
                              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">Packaging Seal</span>
                                <span className="font-medium text-emerald-400 flex items-center gap-1">
                                  <ShieldCheck size={12} /> {msg.vision_analysis.medicine_details?.packaging_status || msg.vision_analysis.packaging_status || "Intact"}
                                </span>
                              </div>
                              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">Counterfeit Risk</span>
                                <span className="font-bold text-emerald-400">
                                  {msg.vision_analysis.medicine_details?.counterfeit_risk_score ?? msg.vision_analysis.counterfeit_risk_score ?? 3.5}% (Genuine)
                                </span>
                              </div>
                            </div>
                            {msg.vision_analysis.medicine_details?.dosage_form && (
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                                <span>Pack: <strong className="text-slate-300">{msg.vision_analysis.medicine_details.dosage_form}</strong></span>
                                {msg.vision_analysis.medicine_details?.manufacturer && (
                                  <>
                                    <span>&bull;</span>
                                    <span>Mfg: <strong className="text-slate-300">{msg.vision_analysis.medicine_details.manufacturer}</strong></span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* OpenFDA Drug Labeling & Gemini Clinical Insights */}
                        {(msg.openfda_clinical_insights || msg.vision_analysis?.openfda_clinical_insights || msg.vision_analysis?.medicine_details?.openfda_clinical_insights) && (
                          <OpenFDAClinicalCard 
                            insights={msg.openfda_clinical_insights || msg.vision_analysis?.openfda_clinical_insights || msg.vision_analysis?.medicine_details?.openfda_clinical_insights} 
                          />
                        )}

                        {/* Stock Register Rows */}
                        {msg.vision_analysis.category === 'STOCK_REGISTER' && msg.vision_analysis.stock_register_details?.detected_rows?.length > 0 && (
                          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2.5 space-y-1.5">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                              📋 Detected Inventory Logbook Rows:
                            </span>
                            <div className="space-y-1">
                              {msg.vision_analysis.stock_register_details.detected_rows.map((row, rIdx) => (
                                <div key={rIdx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-950 border border-slate-800/80">
                                  <span className="font-semibold text-slate-200">{row.item_name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-400">Stock: <strong className={row.stock_available === 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>{row.stock_available}</strong> / Min: {row.minimum_required}</span>
                                    {row.is_stockout && (
                                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                        STOCKOUT
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ILR Thermometer Excursion */}
                        {msg.vision_analysis.category === 'ILR_THERMOMETER' && msg.vision_analysis.temperature_details && (
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            msg.vision_analysis.temperature_details.excursion_detected 
                              ? 'bg-rose-950/30 border-rose-500/30 text-rose-200' 
                              : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Thermometer size={16} className={msg.vision_analysis.temperature_details.excursion_detected ? "text-rose-400 animate-pulse" : "text-emerald-400"} />
                              <div>
                                <span className="text-xs font-bold block">
                                  Observed ILR Temperature: {msg.vision_analysis.temperature_details.recorded_temperature_celsius}°C
                                </span>
                                <span className="text-[10px] opacity-80">Safe Cold-Chain Target: 2.0°C – 8.0°C</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              msg.vision_analysis.temperature_details.excursion_detected
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {msg.vision_analysis.temperature_details.excursion_detected ? 'EXCURSION BREACH' : 'NORMAL RANGE'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Emergency Clinical Protocol Card */}
                    {!isUser && msg.clinical_protocol_card && (
                      <div className="bg-rose-950/20 border border-rose-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                              <AlertOctagon size={16} />
                            </div>
                            <div>
                              <span className="text-xs font-black text-rose-300 uppercase tracking-wide block">
                                {msg.clinical_protocol_card.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {msg.clinical_protocol_card.authority_guideline}
                              </span>
                            </div>
                          </div>
                          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-lg animate-pulse">
                            {msg.clinical_protocol_card.urgency} PROTOCOL
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-rose-500/20 space-y-1">
                            <span className="text-[10px] font-bold text-rose-400 uppercase flex items-center gap-1">
                              <FileText size={11} /> First-Line Mandatory Test:
                            </span>
                            <div className="font-bold text-slate-100">{msg.clinical_protocol_card.first_line_test}</div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{msg.clinical_protocol_card.test_procedure}</p>
                          </div>

                          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-rose-500/20 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                              <Box size={11} /> Recommended Loading Dose:
                            </span>
                            <div className="font-bold text-emerald-300">{msg.clinical_protocol_card.recommended_dosage}</div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{msg.clinical_protocol_card.reconstitution_instructions}</p>
                          </div>
                        </div>

                        <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2 text-slate-300">
                          <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                            <ShieldAlert size={12} /> Standby: {msg.clinical_protocol_card.emergency_antidote_on_standby}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ❄️ Storage: {msg.clinical_protocol_card.cold_chain_warning}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Autonomous Corridor Reallocation Outcome Card */}
                    {!isUser && msg.recommended_action?.action_type === 'CREATE_DISPATCH_ORDER' && (
                      <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                              <Truck size={16} />
                            </div>
                            <div>
                              <span className="text-xs font-black text-emerald-300 tracking-wide uppercase block">
                                Autonomous Reallocation Corridor Active
                              </span>
                              {msg.recommended_action.dispatch_id && (
                                <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  {msg.recommended_action.dispatch_id}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                            <CheckCircle2 size={12} /> DISPATCH CONFIRMED
                          </span>
                        </div>

                        <p className="text-xs text-slate-300">
                          {msg.recommended_action.action_summary}
                        </p>

                        {/* Route Visualization Nodes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-emerald-500/20 text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                              <Building2 size={11} className="text-cyan-400" /> Recipient Facility:
                            </span>
                            <span className="font-bold text-slate-100 block truncate">
                              {msg.target_facility_name || selectedFacility?.name || "Target Health Facility"}
                            </span>
                          </div>
                          <div className="space-y-0.5 sm:border-l sm:border-slate-800 sm:pl-2.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                              <Truck size={11} className="text-emerald-400" /> Supplying Donor Node:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-emerald-300 truncate">
                                {msg.source_facility_name || msg.recommended_action?.suggested_source_facility || 'District Surplus Hospital'}
                              </span>
                              {msg.is_user_specified_donor ? (
                                <span className="text-[9px] bg-blue-500/20 text-blue-300 font-semibold px-1.5 py-0.5 rounded border border-blue-500/40">User Specified</span>
                              ) : (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.5 rounded border border-emerald-500/40">Nearest Surplus</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3 text-slate-300">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Transport:</span>
                              <span className="font-semibold text-white">
                                {msg.recommended_action.vehicle_type || 'Solar-Cooled Van'}
                              </span>
                            </div>
                            <div className="h-4 w-px bg-slate-800" />
                            <div>
                              <span className="text-[10px] text-slate-400 block">ETA:</span>
                              <span className="font-bold text-emerald-400">
                                {msg.recommended_action.eta || '38 mins'}
                              </span>
                            </div>
                          </div>

                          {onTriggerReallocation && (
                            <button
                              onClick={() => {
                                const plan = msg.dispatch_package || msg.recommended_action?.dispatch_package || msg.recommended_action?.dispatch_plan;
                                const targetId = msg.target_facility_id || msg.recommended_action?.target_facility_id || selectedFacility?.id;
                                const medId = msg.medicine_id || msg.recommended_action?.medicine_id || 'PUB-MED-001';
                                const qty = msg.quantity || msg.recommended_action?.quantity || 20;
                                onTriggerReallocation(plan || targetId, medId, qty);
                              }}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md transition-all hover:scale-105"
                            >
                              <span>View Corridor on Live Map</span>
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Interactive Clarification & Quick-Reply Chips */}
                    {!isUser && msg.quick_reply_options && msg.quick_reply_options.length > 0 && (
                      <div className={`p-3 border rounded-xl space-y-2 ${
                        isClarification
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-cyan-950/20 border-cyan-500/30'
                      }`}>
                        <div className={`flex items-center gap-1.5 text-[11px] font-bold ${
                          isClarification ? 'text-amber-300' : 'text-cyan-300'
                        }`}>
                          <HelpCircle size={13} className={isClarification ? 'text-amber-400' : 'text-cyan-400'} />
                          <span>{isClarification ? 'Missing Details &bull; Tap an option to clarify:' : 'Suggested Next Steps:'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {msg.quick_reply_options.map((opt, oIdx) => {
                            const optLabel = typeof opt === 'object' && opt !== null ? (opt.label || opt.name || opt.value) : String(opt);
                            const optPayload = typeof opt === 'object' && opt !== null ? (opt.action_payload || opt.value || opt.label) : String(opt);
                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleSendQuery(optPayload)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover:scale-105 shadow-sm ${
                                  isClarification
                                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-200 border border-amber-500/40'
                                    : 'bg-slate-900 hover:bg-slate-800 text-cyan-200 border border-cyan-500/40'
                                }`}
                              >
                                <span>{optLabel}</span>
                                <ArrowRight size={11} className={isClarification ? 'text-amber-400' : 'text-cyan-400'} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Coordinated Multi-Agent Swarm Execution Flow */}
                    {!isUser && ((msg.agents_invoked && msg.agents_invoked.length > 0) || (msg.execution_trace && msg.execution_trace.length > 0)) && (() => {
                      const flowAgents = (msg.agents_invoked && msg.agents_invoked.length > 0)
                        ? msg.agents_invoked
                        : Array.from(new Set((msg.execution_trace || []).map(s => s.agent_name)));
                      return (
                        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles size={11} className="text-cyan-400" /> Multi-Agent Swarm ({flowAgents.length} Agents):
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                              {msg.orchestration_duration_ms || 280}ms
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] text-slate-300 scrollbar-thin">
                            {flowAgents.map((agName, aIdx) => {
                              const agInfo = getAgentInfo(agName);
                              return (
                                <React.Fragment key={aIdx}>
                                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm shrink-0 font-medium ${agInfo.badgeClass}`}>
                                    <span className="text-xs">{agInfo.icon}</span>
                                    <span className="font-semibold tracking-tight">{agInfo.label}</span>
                                  </div>
                                  {aIdx < flowAgents.length - 1 && (
                                    <ChevronRight size={11} className="text-slate-600 shrink-0" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>

                          {/* Collapsible Execution Reasoning Steps */}
                          {msg.execution_trace && msg.execution_trace.length > 0 && (
                            <details className="group mt-1 text-[11px] text-slate-400">
                              <summary className="cursor-pointer text-[10px] font-medium text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 select-none">
                                <Layers size={11} className="text-slate-500 group-hover:text-cyan-400" />
                                <span>Inspect Reasoning Steps ({msg.execution_trace.length})</span>
                                <ChevronDown size={11} className="transition-transform group-open:rotate-180 ml-0.5" />
                              </summary>
                              <div className="mt-2 space-y-1.5 pl-2.5 border-l-2 border-cyan-500/30 bg-slate-950/60 p-2.5 rounded-r-xl">
                                {msg.execution_trace.map((step, sIdx) => {
                                  const agInfo = getAgentInfo(step.agent_name);
                                  return (
                                    <div key={sIdx} className="text-[11px] leading-relaxed">
                                      <div className="flex items-baseline gap-1.5 font-semibold text-slate-200">
                                        <span>{agInfo.icon}</span>
                                        <span className="text-cyan-300 shrink-0">{agInfo.label}:</span>
                                        <span className="font-normal text-slate-300">{step.action_summary}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-sm animate-pulse shadow-lg">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.3s]"></span>
              </div>
              <span className="text-xs font-semibold text-cyan-300">
                GenAI Multi-Agent Swarm orchestrating triage...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* BOTTOM COMMAND DECK & DOCKED INPUT BAR */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-xl space-y-2 shrink-0">
          
          {/* Live Recording Pulsing Bar */}
          {isRecording && (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-rose-500/15 border border-rose-500/40 rounded-2xl animate-pulse">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-3 bg-rose-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-1.5 h-4 bg-rose-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                  <span className="w-1.5 h-7 bg-rose-500 rounded-full animate-bounce [animation-delay:0.45s]"></span>
                </div>
                <span className="text-xs font-bold text-rose-200">
                  Listening in {activeLangObj.fullName}... Speak your medical request now
                </span>
              </div>
              <button
                onClick={stopListening}
                className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm transition-all"
              >
                <Square size={10} className="fill-white" /> Stop
              </button>
            </div>
          )}

          {/* Input Form Box */}
          <div className="relative rounded-2xl border border-slate-700/80 bg-slate-950/80 focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all p-3 shadow-inner">
            
            {/* Hidden File Input for Multimodal Vision */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Attached Image Preview Chip */}
            {attachedImageBase64 && (
              <div className="mb-2 p-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan-400/40 shrink-0 bg-slate-950">
                    <img src={attachedImageBase64} alt="Attached Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                      <Camera size={12} /> Image Attached
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[220px]">
                      {attachedImageName || "health_asset.jpg"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAttachedImage}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 transition-colors"
                  title="Remove attached image"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuery();
                }
              }}
              placeholder={
                isRecording 
                  ? "Transcribing voice in real-time..." 
                  : attachedImageBase64
                    ? `Image attached. Add notes or hit Send to trigger Gemini Vision agent...`
                    : `Speak or type in ${activeLangObj.fullName}. Mention your clinic and emergency request for instant multi-agent triage...`
              }
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            />

            {/* Bottom Control Strip */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono" suppressHydrationWarning>
                <span suppressHydrationWarning>Session: <strong className="text-cyan-400" suppressHydrationWarning>{mounted && sessionId ? sessionId.slice(-6) : 'LIVE'}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {/* Multimodal Vision Camera Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`py-1.5 px-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                    attachedImageBase64
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                  title="Upload photo of medicine pack, stock register, or thermometer dial"
                >
                  <Camera size={14} />
                  <span className="hidden sm:inline">{attachedImageBase64 ? "Image Added" : "Add Image"}</span>
                </button>

                {/* Microphone STT Button */}
                <button
                  onClick={toggleRecording}
                  className={`py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                    isRecording 
                      ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' 
                      : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30'
                  }`}
                  title={isRecording ? "Stop Recording" : "Speak in " + activeLangObj.fullName}
                >
                  {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                  <span>{isRecording ? "Listening..." : "Speak"}</span>
                </button>

                {/* Send Request Button */}
                <button
                  onClick={() => handleSendQuery()}
                  disabled={loading || (!inputText.trim() && !attachedImageBase64)}
                  className="btn-primary text-xs py-1.5 px-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <span>{loading ? "Processing..." : "Send"}</span>
                  <Send size={12} />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* SLIDE-OVER CONSULTATION HISTORY DRAWER */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowHistoryDrawer(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-5 shadow-2xl z-10 flex flex-col space-y-4 animate-slideLeft">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/15 rounded-lg text-cyan-400">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Consultation History</h3>
                  <p className="text-[10px] text-slate-400">Saved sessions in BigQuery & Firebase</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Action Bar inside Drawer */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {recentSessions.length} Total Sessions
              </span>
              <button
                onClick={() => {
                  startNewSession();
                  setShowHistoryDrawer(false);
                }}
                className="text-xs px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold hover:bg-cyan-500/25 flex items-center gap-1 transition-all"
              >
                <PlusCircle size={12} /> New Consultation
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recentSessions.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center" suppressHydrationWarning>
                  Active session: <span className="font-mono text-cyan-400" suppressHydrationWarning>{mounted && sessionId ? sessionId : 'LIVE'}</span>
                </div>
              ) : (
                recentSessions.map((s) => (
                  <div
                    key={s.session_id}
                    onClick={() => handleRestoreSession(s)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                      s.session_id === sessionId
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-300">{s.session_id}</span>
                      <span className="text-[10px] text-slate-500">
                        {s.messages ? `${s.messages.length} msgs` : 'Active'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium truncate mt-1">
                      {s.facility_name || "Emergency Medical Requisition"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      <span>{s.created_at ? formatCopilotTime(s.created_at) : 'Recent'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 text-center text-[11px] text-slate-500">
              Click any session to switch threads
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
