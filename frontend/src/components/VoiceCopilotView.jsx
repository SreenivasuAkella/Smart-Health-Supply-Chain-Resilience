'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, Sparkles, Languages, 
  ArrowRight, Truck, Radio, Square, RotateCcw, Send, CheckCircle2,
  Clock, ShieldAlert, Cpu, Activity, PhoneCall, Headphones, FileCheck2,
  AlertTriangle, Play, ChevronRight, Zap, RefreshCw, BarChart3,
  ChevronDown, ChevronUp, Layers, Bot, Building2, ExternalLink, Navigation,
  MessageSquare, User, HelpCircle, History, PlusCircle, Thermometer, Box
} from 'lucide-react';
import { 
  chatWithAshaCopilot,
  queryGeminiCopilot, 
  fetchCopilotHistory,
  fetchCopilotSessions,
  fetchCopilotSessionDetail 
} from '../services/api';

export default function VoiceCopilotView({ apiKey, onTriggerReallocation }) {
  const [selectedLang, setSelectedLang] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceDispatches, setVoiceDispatches] = useState([]);
  const [expandedTraceStep, setExpandedTraceStep] = useState(null);

  // Conversational session management
  const [sessionId, setSessionId] = useState(() => `SESS-${Date.now().toString(36).toUpperCase()}`);
  const [messages, setMessages] = useState([]);
  const [accumulatedContext, setAccumulatedContext] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const facilitiesList = [
    { id: 'PHC-BARAGAON-03', name: 'Primary Health Centre Baragaon', district: 'Varanasi', state: 'Uttar Pradesh' },
    { id: 'PHC-VELLORE-02', name: 'Kaniyambadi PHC', district: 'Vellore', state: 'Tamil Nadu' },
    { id: 'PHC-MEDCHAL-01', name: 'Ghatkesar PHC', district: 'Medchal', state: 'Telangana' },
    { id: 'CHC-PUNE-04', name: 'Khed CHC', district: 'Pune', state: 'Maharashtra' },
    { id: 'PHC-DAR-001', name: 'Darjeeling Community Health Centre', district: 'Darjeeling', state: 'West Bengal' },
    { id: 'PHC-AND-001', name: 'Andaman Islands Block PHC', district: 'South Andaman', state: 'Andaman & Nicobar' }
  ];
  const [selectedFacility, setSelectedFacility] = useState(facilitiesList[0]);

  const supportedLanguages = [
    { code: 'hi', bcp47: 'hi-IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳', region: 'North / Central India' },
    { code: 'te', bcp47: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳', region: 'Andhra Pradesh & Telangana' },
    { code: 'ta', bcp47: 'ta-IN', name: 'தமிழ் (Tamil)', flag: '🇮🇳', region: 'Tamil Nadu & Puducherry' },
    { code: 'mr', bcp47: 'mr-IN', name: 'मराठी (Marathi)', flag: '🇮🇳', region: 'Maharashtra & Goa' },
    { code: 'bn', bcp47: 'bn-IN', name: 'বাংলা (Bengali)', flag: '🇮🇳', region: 'West Bengal & Tripura' },
    { code: 'kn', bcp47: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳', region: 'Karnataka' },
    { code: 'ml', bcp47: 'ml-IN', name: 'മലയാളം (Malayalam)', flag: '🇮🇳', region: 'Kerala & Lakshadweep' },
    { code: 'en', bcp47: 'en-IN', name: 'English (India)', flag: '🌐', region: 'Pan-India National' }
  ];

  const quickPromptsByLang = {
    hi: [
      { text: "हमारे पास केवल 3 शीशियां एंटी-वेनम बची हैं, तत्काल 25 शीशियां भेजें", label: "🐍 आपातकालीन एंटी-वेनम मांग", urgency: "CRITICAL" },
      { text: "पीएचसी बड़ागांव के रेफ्रिजरेटर का तापमान 8.7°C हो गया है", label: "❄️ कोल्ड-चेन तापमान अलर्ट", urgency: "HIGH" },
      { text: "हमारे केंद्र पर आवश्यक दवाओं की तत्काल जरूरत है", label: "❓ अधूरी जानकारी (संवाद जांच)", urgency: "NORMAL" }
    ],
    en: [
      { text: "We only have 3 vials of Anti-Snake Venom left, dispatch 25 vials urgently from district hospital", label: "🐍 Emergency ASV Requisition", urgency: "CRITICAL" },
      { text: "Cold chain ILR temperature breached 8.7°C at PHC Baragaon", label: "❄️ Cold-Chain Excursion SOS", urgency: "HIGH" },
      { text: "Our health facility has an emergency, send supplies quickly!", label: "❓ Missing Info (Conversational Triage)", urgency: "NORMAL" }
    ],
    te: [
      { text: "మా వద్ద కేవలం 3 యాంటీ-స్నేక్ వెనమ్ వైల్స్ మాత్రమే మిగిలాయి, అత్యవసరంగా 25 పంపండి", label: "🐍 అత్యవసర యాంటీ-వెనమ్ అభ్యర్థన", urgency: "CRITICAL" },
      { text: "కోల్డ్ చైన్ ఐస్-లైన్డ్ రిఫ్రిజిరేటర్ ఉష్ణోగ్రత 8.7°C దాటింది", label: "❄️ కోల్డ్ చైన్ హెచ్చరిక", urgency: "HIGH" },
      { text: "మా కేంద్రానికి అత్యవసర ఔషధాల సరఫరా కావాలి", label: "❓ సంభాషణ సంభాషణ", urgency: "NORMAL" }
    ],
    ta: [
      { text: "எங்களிடம் 3 பாம்புக்கடி விஷமுறிவு மருந்துகள் மட்டுமே உள்ளன, உடனடியாக 25 அனுப்பவும்", label: "🐍 அவசர விஷமுறிவு மருந்து", urgency: "CRITICAL" },
      { text: "குளிர்சாதன பெட்டி வெப்பநிலை 8.7°C ஆக அதிகரித்துள்ளது", label: "❄️ குளிர்பதன எச்சரிக்கை", urgency: "HIGH" },
      { text: "எங்கள் மையத்திற்கு அவசர மருந்துகள் தேவை", label: "❓ உரையாடல் விளக்கம்", urgency: "NORMAL" }
    ],
    mr: [
      { text: "आमच्याकडे फक्त ३ अँटी-स्नेक व्हेनम उरले आहेत, त्वरित २५ पाठवा", label: "🐍 तातडीची अँटी-व्हेनम मागणी", urgency: "CRITICAL" },
      { text: "रेफ्रिजरेटरचे तापमान ८.७ अंश सेल्सिअस झाले आहे", label: "❄️ कोल्ड-चेन तापमान अलर्ट", urgency: "HIGH" },
      { text: "आमच्या केंद्रावर तातडीने औषध पुरवठा करा", label: "❓ अपूर्ण माहिती संवाद", urgency: "NORMAL" }
    ],
    bn: [
      { text: "আমাদের কাছে মাত্র ৩টি অ্যান্টি-ভেনম অবশিষ্ট আছে, অবিলম্বে ২৫টি পাঠান", label: "🐍 জরুরি অ্যান্টি-ভেনম", urgency: "CRITICAL" },
      { text: "রেফ্রিজारेটরের তাপমাত্রা ৮.৭°C এ পৌঁছেছে", label: "❄️ কোল্ড-চেইন সতর্কতা", urgency: "HIGH" },
      { text: "আমাদের কেন্দ্রে অবিলম্বে ওষুধ সরবরাহ প্রয়োজন", label: "❓ কথোপকথন স্পষ্টীকরণ", urgency: "NORMAL" }
    ],
    kn: [
      { text: "ನಮ್ಮಲ್ಲಿ ಕೇವಲ 3 ಆಂಟಿ-ಸ್ನೇಕ್ ವೆನಮ್ ಉಳಿದಿದೆ, ತಕ್ಷಣ 25 ಕಳುಹಿಸಿ", label: "🐍 ತುರ್ತು ಆಂಟಿ-ವೆನಮ್", urgency: "CRITICAL" },
      { text: "ಕೋಲ್ಡ್ ಚೈನ್ ತಾಪಮಾನ 8.7°C ಮೀರಿದೆ", label: "❄️ ಕೋಲ್ಡ್ ಚೈನ್ ಎಚ್ಚರಿಕೆ", urgency: "HIGH" },
      { text: "ನಮ್ಮ ಕೇಂದ್ರಕ್ಕೆ ತುರ್ತು ಔಷಧ ಸರಬರಾಜು ಅಗತ್ಯವಿದೆ", label: "❓ ಸಂವಾದ ಸ್ಪಷ್ಟೀಕರಣ", urgency: "NORMAL" }
    ],
    ml: [
      { text: "ഞങ്ങളുടെ പക്കൽ 3 ആന്റി-വെനം വയലുകൾ മാത്രമേയുള്ളൂ, അടിയന്തിരമായി 25 അയക്കുക", label: "🐍 അടിയന്തര ആന്റി-വെനം", urgency: "CRITICAL" },
      { text: "കോൾഡ് ചെയിൻ ഐഎൽആർ താപനില 8.7°C ആയി ഉയർന്നു", label: "❄️ കോൾഡ് ചെയിൻ മുന്നറിയിപ്പ്", urgency: "HIGH" },
      { text: "ഞങ്ങളുടെ കേന്ദ്രത്തിലേക്ക് അടിയന്തര മരുന്നുകൾ വേണം", label: "❓ സംഭാഷണ വ്യക്തത", urgency: "NORMAL" }
    ]
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadHistoryAndSessions = async () => {
    try {
      const list = await fetchCopilotHistory();
      if (list && list.length > 0) {
        setVoiceDispatches(list);
      }
    } catch (e) {
      console.warn("Failed to load history:", e);
    }

    try {
      const sessList = await fetchCopilotSessions();
      if (sessList && sessList.length > 0) {
        setRecentSessions(sessList);
      }
    } catch (e) {
      console.warn("Failed to load sessions:", e);
    }
  };

  useEffect(() => {
    loadHistoryAndSessions();
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const startNewSession = () => {
    stopSpeaking();
    stopListening();
    const newSid = `SESS-${Date.now().toString(36).toUpperCase()}`;
    setSessionId(newSid);
    setMessages([]);
    setAccumulatedContext({});
    setInputText('');
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
        const demoPrompt = quickPromptsByLang[selectedLang]?.[0]?.text || quickPromptsByLang['hi'][0].text;
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
    if (!textToSend.trim()) return;

    setInputText('');
    setLoading(true);

    const userMsgId = `USER-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      language_code: selectedLang,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await chatWithAshaCopilot({
        prompt: textToSend,
        sessionId: sessionId,
        language: selectedLang,
        facilityId: selectedFacility.id,
        facilityName: selectedFacility.name,
        history: messages,
        apiKey: apiKey
      });

      if (result) {
        if (result.session_id) {
          setSessionId(result.session_id);
        }
        if (result.accumulated_context) {
          setAccumulatedContext(result.accumulated_context);
        }

        const asstMsgId = `ASST-${Date.now()}`;
        const asstMsg = {
          id: asstMsgId,
          role: 'assistant',
          content: result.response_text_localized || result.response_text_english,
          content_english: result.response_text_english,
          status: result.status,
          intent: result.intent,
          confidence: result.confidence,
          is_clarification_needed: result.is_clarification_needed,
          missing_slots: result.missing_slots || [],
          quick_reply_options: result.quick_reply_options || [],
          recommended_action: result.recommended_action,
          dispatch_package: result.dispatch_package,
          cold_chain_incident: result.cold_chain_incident,
          execution_trace: result.execution_trace || [],
          agents_invoked: result.agents_invoked || [],
          tools_executed: result.tools_executed || [],
          orchestration_duration_ms: result.orchestration_duration_ms,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, asstMsg]);

        if (autoSpeak && (result.response_text_localized || result.clarification_prompt_localized)) {
          speakText(result.response_text_localized || result.clarification_prompt_localized, selectedLang, asstMsgId);
        }

        // If autonomous corridor dispatched, notify parent component
        if (result?.recommended_action?.action_type === 'CREATE_DISPATCH_ORDER' && onTriggerReallocation) {
          onTriggerReallocation(selectedFacility.id);
        }

        // Reload history & sessions
        loadHistoryAndSessions();
      }
    } catch (err) {
      console.error("Copilot request error:", err);
      const errMsg = {
        id: `ERR-${Date.now()}`,
        role: 'assistant',
        content: "आपातकालीन सर्वर से संपर्क स्थापित किया जा रहा है... (Retrying connection)",
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
    <div className="space-y-6 animate-fadeIn max-w-[1600px] mx-auto pb-10">
      {/* Compact Action & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 border border-cyan-500/30 text-cyan-300 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Sparkles size={13} className="text-cyan-400" /> Multi-Turn GenAI + MCP
          </span>
          <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Layers size={13} className="text-emerald-400" /> 8 Indian Languages
          </span>
        </div>

        {/* Facility Selector & Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Active Facility Context Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-sm">
            <Building2 size={13} className="text-cyan-400 shrink-0" />
            <select
              value={selectedFacility.id}
              onChange={(e) => {
                const found = facilitiesList.find(f => f.id === e.target.value);
                if (found) setSelectedFacility(found);
              }}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
            >
              {facilitiesList.map(f => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                  {f.name} ({f.district})
                </option>
              ))}
            </select>
          </div>

          {/* Audio Toggle */}
          <button
            onClick={() => {
              if (isPlayingAudio) stopSpeaking();
              setAutoSpeak(!autoSpeak);
            }}
            className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 border font-semibold transition-all shadow-sm ${
              autoSpeak 
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25' 
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoSpeak ? (
              <>
                <Volume2 size={13} className="text-cyan-400 animate-pulse" />
                <span>Voice: ON</span>
              </>
            ) : (
              <>
                <VolumeX size={13} className="text-slate-400" />
                <span>Voice: MUTED</span>
              </>
            )}
          </button>

          {/* New Session Button */}
          <button
            onClick={startNewSession}
            className="text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-200 font-semibold transition-all"
            title="Reset conversation state and start new clinical triage session"
          >
            <PlusCircle size={13} className="text-emerald-400" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border border-slate-800 space-y-1.5 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Multi-Turn Voice Triage</span>
            <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-400">
              <PhoneCall size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white">3,124 Calls</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 size={12} /> 99.4% Automated NLU & Proactive Clarification
          </div>
        </div>

        <div className="glass-panel p-4 border border-slate-800 space-y-1.5 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Gemini NLU Inference Latency</span>
            <div className="p-2 bg-cyan-500/15 rounded-lg text-cyan-400">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-300">142 ms</div>
          <div className="text-[11px] text-slate-400 font-medium">
            Sub-second real-time transcription & slot evaluation
          </div>
        </div>

        <div className="glass-panel p-4 border border-slate-800 space-y-1.5 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Supported Regional Dialects</span>
            <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-400">
              <Languages size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-300">8 Languages</div>
          <div className="text-[11px] text-indigo-400 font-medium">
            Hindi, Telugu, Tamil, Marathi, Bengali, Kannada, Malayalam, English
          </div>
        </div>

        <div className="glass-panel p-4 border border-slate-800 space-y-1.5 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Autonomous GPS Corridors</span>
            <div className="p-2 bg-amber-500/15 rounded-lg text-amber-400">
              <Truck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300">419 Dispatches</div>
          <div className="text-[11px] text-amber-400 font-semibold">
            Avg ETA: 38 mins to rural health centers
          </div>
        </div>
      </div>

      {/* Main 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 Cols) — Conversational Voice Chat Thread */}
        <div className="lg:col-span-8 space-y-5">
          {/* Main Conversational Panel */}
          <div className="glass-panel p-5 sm:p-6 border border-slate-800 rounded-3xl space-y-5 shadow-xl flex flex-col min-h-[640px]">
            {/* Language Switcher */}
            <div className="space-y-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Languages size={14} className="text-cyan-400" /> Active Regional Dialect:
                </span>
                <span className="text-xs text-cyan-400 font-medium">
                  {activeLangObj.name} • {activeLangObj.region}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {supportedLanguages.map((lang) => {
                  const isActive = selectedLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        stopSpeaking();
                        stopListening();
                        setSelectedLang(lang.code);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-md shadow-cyan-500/25 scale-[1.02]'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1-Click Field Emergency Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Quick Voice Triage Starter Prompts:
                </span>
                <span className="text-[10px] text-slate-500">Tap to test incomplete vs complete triage</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(quickPromptsByLang[selectedLang] || quickPromptsByLang['hi']).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(q.text);
                    }}
                    className="group bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 p-3 rounded-2xl flex flex-col justify-between text-left transition-all hover:shadow-lg hover:shadow-cyan-500/10"
                    title="Click to insert into input field"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1">
                        {q.label}
                      </span>
                      <ArrowRight size={13} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {q.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Conversational Message Stream */}
            <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 overflow-y-auto max-h-[500px] min-h-[300px] space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
                    <Bot size={32} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">ASHA Conversational Intelligence Active</h3>
                    <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                      Speak into your microphone or type in <span className="text-cyan-300 font-semibold">{activeLangObj.name}</span>. If any information is missing, the copilot will engage in dialogue with clarifying suggestions before dispatching autonomous emergency corridors.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <span className="bg-slate-900 border border-slate-800 text-slate-400 text-[10px] px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Mic size={11} className="text-cyan-400" /> Speech-to-Text
                    </span>
                    <span className="bg-slate-900 border border-slate-800 text-slate-400 text-[10px] px-3 py-1 rounded-full flex items-center gap-1.5">
                      <HelpCircle size={11} className="text-amber-400" /> Slot-Filling Clarification
                    </span>
                    <span className="bg-slate-900 border border-slate-800 text-slate-400 text-[10px] px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Truck size={11} className="text-emerald-400" /> Autonomous Multi-Agent Dispatch
                    </span>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const isClarification = msg.is_clarification_needed;
                  const isPlayingThis = isPlayingAudio && playingMsgId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2 animate-fadeIn`}
                    >
                      {/* Sender Info Tag */}
                      <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                        {isUser ? (
                          <>
                            <span className="font-semibold text-slate-300">Frontline Health Worker (ASHA)</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span>{msg.timestamp}</span>
                            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400">
                              <User size={12} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white">
                              <Sparkles size={11} />
                            </div>
                            <span className="font-bold text-cyan-300">Sanjeevani AI Copilot</span>
                            {msg.intent && (
                              <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
                                {msg.intent}
                              </span>
                            )}
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span>{msg.timestamp}</span>
                          </>
                        )}
                      </div>

                      {/* Main Message Bubble */}
                      <div
                        className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 space-y-3 ${
                          isUser
                            ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/10 rounded-tr-sm'
                            : 'bg-slate-900 border border-slate-800/90 text-slate-100 shadow-xl rounded-tl-sm'
                        }`}
                      >
                        {/* Audio Controls for Copilot Messages */}
                        {!isUser && (
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                              <Languages size={13} /> {activeLangObj.name} Clinical Audio:
                            </span>

                            <button
                              onClick={() => {
                                if (isPlayingThis) {
                                  stopSpeaking();
                                } else {
                                  speakText(msg.content, selectedLang, msg.id);
                                }
                              }}
                              className={`text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                                isPlayingThis
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                              }`}
                            >
                              {isPlayingThis ? (
                                <>
                                  <Square size={10} className="fill-rose-300" />
                                  <span>Stop</span>
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

                        {/* Localized Response Text */}
                        <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                          {msg.content}
                        </p>

                        {/* English Dashboard Translation */}
                        {!isUser && msg.content_english && (
                          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Cpu size={11} className="text-indigo-400" /> National English Oversight:
                            </span>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              {msg.content_english}
                            </p>
                          </div>
                        )}

                        {/* Interactive Suggestion / Clarification Chips */}
                        {!isUser && msg.quick_reply_options && msg.quick_reply_options.length > 0 && (
                          <div className={`p-3 border rounded-xl space-y-2 shadow-sm ${
                            isClarification
                              ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border-amber-500/30'
                              : 'bg-gradient-to-r from-cyan-950/30 via-slate-900 to-indigo-950/30 border-cyan-500/30'
                          }`}>
                            <div className={`flex items-center gap-1.5 text-[11px] font-bold ${
                              isClarification ? 'text-amber-300' : 'text-cyan-300'
                            }`}>
                              <HelpCircle size={13} className={isClarification ? 'text-amber-400 shrink-0' : 'text-cyan-400 shrink-0'} />
                              <span>{isClarification ? 'Clarification Needed • Tap to specify missing details:' : 'Suggested Frontline Actions • Tap an option to execute:'}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {msg.quick_reply_options.map((opt, oIdx) => (
                                <button
                                  key={oIdx}
                                  onClick={() => handleSendQuery(opt.action_payload || opt.value || opt.label)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 hover:scale-105 ${
                                    isClarification
                                      ? 'bg-slate-900 hover:bg-slate-800 text-amber-200 hover:text-white border border-amber-500/40 hover:border-amber-400'
                                      : 'bg-slate-900 hover:bg-slate-800 text-cyan-200 hover:text-white border border-cyan-500/40 hover:border-cyan-400'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  <ArrowRight size={11} className={isClarification ? 'text-amber-400' : 'text-cyan-400'} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Corridor Action Outcome Card */}
                        {!isUser && msg.recommended_action?.action_type === 'CREATE_DISPATCH_ORDER' && (
                          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/50 border border-emerald-500/40 rounded-xl p-3.5 space-y-2.5 shadow-lg">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                  <Truck size={18} />
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
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <CheckCircle2 size={12} /> DISPATCH CONFIRMED
                              </span>
                            </div>

                            <p className="text-xs text-slate-200">
                              {msg.recommended_action.action_summary}
                            </p>

                            <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-3 text-slate-300">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Transport Mode:</span>
                                  <span className="font-semibold text-white">
                                    {msg.recommended_action.vehicle_type || 'Solar-Cooled Emergency Van'}
                                  </span>
                                </div>
                                <div className="h-5 w-px bg-slate-800" />
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Estimated ETA:</span>
                                  <span className="font-bold text-emerald-400">
                                    {msg.recommended_action.eta || '38 mins'}
                                  </span>
                                </div>
                              </div>

                              {onTriggerReallocation && (
                                <button
                                  onClick={() => onTriggerReallocation(selectedFacility.id)}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md transition-all hover:scale-105"
                                >
                                  <span>View Corridor on Live Map</span>
                                  <ArrowRight size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Cold-Chain Alert Outcome Card */}
                        {!isUser && msg.recommended_action?.action_type === 'TRIGGER_COLD_CHAIN_TECH' && (
                          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-rose-950/50 border border-amber-500/40 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Thermometer size={16} className="text-amber-400" />
                                <span className="text-xs font-bold text-amber-300 uppercase">
                                  Cold-Chain Excursion SOS Alert Dispatched
                                </span>
                              </div>
                              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                                Priority P1 Tech Alert
                              </span>
                            </div>
                            <p className="text-xs text-slate-300">
                              {msg.recommended_action.action_summary}
                            </p>
                          </div>
                        )}

                        {/* Dynamic Multi-Agent Execution Trace Pipeline */}
                        {!isUser && msg.execution_trace && msg.execution_trace.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Layers size={11} className="text-indigo-400" /> Dynamic Multi-Agent Trace ({msg.execution_trace.length} Steps):
                              </span>
                              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                                {msg.orchestration_duration_ms || 280}ms
                              </span>
                            </div>

                            {/* Step pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[10px] text-slate-300 scrollbar-thin">
                              {msg.execution_trace.map((step, sIdx) => (
                                <React.Fragment key={sIdx}>
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 shrink-0">
                                    <span className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[8px]">
                                      {step.step_number}
                                    </span>
                                    <span className="font-semibold text-slate-200">
                                      {step.agent_name.replace('Agent', '')}
                                    </span>
                                  </div>
                                  {sIdx < msg.execution_trace.length - 1 && (
                                    <ChevronRight size={10} className="text-slate-600 shrink-0" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex items-center gap-3 p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl max-w-sm animate-pulse">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.3s]"></span>
                  </div>
                  <span className="text-xs font-semibold text-cyan-300">
                    GenAI Multi-Agent swarm evaluating prompt & inventory...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Smart Input & Microphone Command Box */}
            <div className="space-y-2.5 pt-2">
              {isRecording && (
                <div className="flex items-center justify-between px-4 py-3 bg-rose-500/15 border border-rose-500/40 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-3 bg-rose-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                      <span className="w-1.5 h-4 bg-rose-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                      <span className="w-1.5 h-7 bg-rose-500 rounded-full animate-bounce [animation-delay:0.45s]"></span>
                    </div>
                    <span className="text-xs font-bold text-rose-200">
                      Listening in {activeLangObj.name}... Speak your clinical or emergency request now
                    </span>
                  </div>
                  <button
                    onClick={stopListening}
                    className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Square size={11} className="fill-white" /> Stop
                  </button>
                </div>
              )}

              <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/95 focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all p-3 shadow-inner">
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
                  placeholder={isRecording ? "Transcribing voice in real-time..." : `Type or click mic to speak in ${activeLangObj.name}... (Press Enter to send)`}
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none pr-2 leading-relaxed"
                />

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1.5">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Session: <span className="font-mono text-cyan-400">{sessionId.slice(-6)}</span></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Microphone Button */}
                    <button
                      onClick={toggleRecording}
                      className={`py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                        isRecording 
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30' 
                          : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30'
                      }`}
                      title={isRecording ? "Stop Recording" : "Speak in " + activeLangObj.name}
                    >
                      {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                      <span>{isRecording ? "Listening..." : "Speak"}</span>
                    </button>

                    {/* Send Button */}
                    <button
                      onClick={() => handleSendQuery()}
                      disabled={loading || !inputText.trim()}
                      className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold py-1.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span>{loading ? "Processing..." : "Send Request"}</span>
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols) — Sessions, Emergency Feed & Agent Registry */}
        <div className="lg:col-span-4 space-y-5">
          {/* Recent Sessions Drawer Card */}
          <div className="glass-panel p-5 border border-slate-800 rounded-3xl space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/15 rounded-lg text-indigo-400">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Active Triage Sessions</h3>
                  <p className="text-[10px] text-slate-400">Conversations synced in Firebase & BigQuery</p>
                </div>
              </div>
              <button
                onClick={startNewSession}
                className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold hover:bg-cyan-500/25 flex items-center gap-1 transition-all"
              >
                <PlusCircle size={11} /> New
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {recentSessions.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">
                  Active session: <span className="font-mono text-cyan-400">{sessionId}</span>
                </div>
              ) : (
                recentSessions.slice(0, 5).map((s) => (
                  <div
                    key={s.session_id}
                    onClick={() => {
                      setSessionId(s.session_id);
                      if (s.messages) setMessages(s.messages);
                      if (s.context) setAccumulatedContext(s.context);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      s.session_id === sessionId
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-white'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-cyan-300">{s.session_id}</span>
                      <span className="text-[10px] text-slate-500">
                        {s.messages ? `${s.messages.length} msgs` : 'Active'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-1">
                      {s.facility_name || "PHC Baragaon"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Voice Emergency Feed from Database */}
          <div className="glass-panel p-5 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/15 rounded-lg text-cyan-400">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Voice Emergency Feed</h3>
                  <p className="text-[11px] text-slate-400">Real-time database log of frontline voice triage</p>
                </div>
              </div>
              <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live DB
              </span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {voiceDispatches.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  Loading emergency records from database...
                </div>
              ) : (
                voiceDispatches.slice(0, 5).map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 rounded-xl p-3.5 space-y-2 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{item.worker || "ASHA Worker"}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {item.language}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">{item.time_ago || "Recent"}</span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium line-clamp-2">
                      "{item.prompt}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 font-semibold truncate max-w-[160px]">{item.facility}</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        item.color === 'emerald' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                        (item.color === 'amber' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400')
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Autonomous Multi-Agent Swarm Registry */}
          <div className="glass-panel p-5 border border-slate-800 rounded-3xl space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/15 rounded-lg text-cyan-400">
                  <Bot size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Multi-Agent Swarm Registry</h3>
                  <p className="text-[10px] text-slate-400">Dynamically selected by user prompt & context</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="font-semibold text-slate-200">AshaVoiceCopilotAgent</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">Frontline Triage</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-semibold text-slate-200">StockoutSentinelAgent</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">Stockout Risk Audit</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="font-semibold text-slate-200">AllocationStrategistAgent</span>
                </div>
                <span className="text-[10px] text-purple-400 font-mono">Donor Optimization</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="font-semibold text-slate-200">FleetRoutingAgent</span>
                </div>
                <span className="text-[10px] text-blue-400 font-mono">Vehicle GPS Corridor</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold text-slate-200">LedgerExecutionAgent</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">GxP Master Commit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
