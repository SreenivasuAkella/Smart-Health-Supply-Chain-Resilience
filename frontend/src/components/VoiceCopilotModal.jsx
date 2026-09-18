'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mic, MicOff, Volume2, VolumeX, Sparkles, Languages,
  ArrowRight, Truck, Radio, Square, RotateCcw, Send, CheckCircle2,
  Clock, ShieldAlert, Cpu, Activity, Layers, ChevronDown, ChevronUp, ChevronRight,
  HelpCircle, Bot, User, RefreshCw, AlertTriangle, Building2
} from 'lucide-react';
import { chatWithAshaCopilot, fetchFacilities } from '../services/api';

const AGENT_CONFIG = {
  AshaVoiceCopilotAgent: {
    label: 'Frontline Copilot',
    icon: '🎙️',
    badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
  },
  FacilityDirectoryAgent: {
    label: 'Facility Directory',
    icon: '🏥',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
  },
  ContextSynchronizationAgent: {
    label: 'Context Sync',
    icon: '🔄',
    badgeClass: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40'
  },
  ClinicalClarificationAgent: {
    label: 'Clinical Clarifier',
    icon: '💬',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40'
  },
  StockoutSentinelAgent: {
    label: 'Stockout Sentinel',
    icon: '🔍',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40'
  },
  SupplyChainSupervisorAgent: {
    label: 'Crisis Supervisor',
    icon: '⚡',
    badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-500/40'
  },
  AllocationStrategistAgent: {
    label: 'Allocation Strategist',
    icon: '🧠',
    badgeClass: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40'
  },
  FleetRoutingAgent: {
    label: 'Fleet & Route Dispatch',
    icon: '🚚',
    badgeClass: 'bg-blue-950/60 text-blue-300 border-blue-500/40'
  },
  LedgerExecutionAgent: {
    label: 'Ledger Audit & Commit',
    icon: '📝',
    badgeClass: 'bg-teal-950/60 text-teal-300 border-teal-500/40'
  },
  ColdChainGuardianAgent: {
    label: 'Cold-Chain Guardian',
    icon: '❄️',
    badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-500/40'
  },
  TechnicianDispatchAgent: {
    label: 'Technician Dispatch',
    icon: '🛠️',
    badgeClass: 'bg-orange-950/60 text-orange-300 border-orange-500/40'
  },
  FacilityReadinessAgent: {
    label: 'Facility Readiness',
    icon: '🛏️',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
  },
  EpidemicSurveillanceAgent: {
    label: 'Epidemic Surveillance',
    icon: '📈',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40'
  }
};

const getAgentInfo = (agentName) => {
  if (!agentName) return { label: 'Autonomous Agent', icon: '🤖', badgeClass: 'bg-slate-900 text-slate-300 border-slate-700' };
  const cleanName = agentName.endsWith('Agent') ? agentName : `${agentName}Agent`;
  return AGENT_CONFIG[cleanName] || AGENT_CONFIG[agentName] || {
    label: agentName.replace('Agent', ''),
    icon: '🤖',
    badgeClass: 'bg-slate-900 text-slate-300 border-slate-700'
  };
};

export default function VoiceCopilotModal({ isOpen, onClose, apiKey, onTriggerReallocation }) {
  const [selectedLang, setSelectedLang] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => `ASHA-MODAL-${Date.now().toString(36).toUpperCase()}`);
  const [messages, setMessages] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [expandedTraceStep, setExpandedTraceStep] = useState(null);

  const [selectedFacility, setSelectedFacility] = useState(() => {
    try {
      const saved = localStorage.getItem('asha_copilot_active_facility');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    try {
      if (selectedFacility) {
        localStorage.setItem('asha_copilot_active_facility', JSON.stringify(selectedFacility));
      } else {
        localStorage.removeItem('asha_copilot_active_facility');
      }
    } catch (_) {}
  }, [selectedFacility]);

  const recognitionRef = useRef(null);
  const chatBottomRef = useRef(null);

  const supportedLanguages = [
    { code: 'hi', bcp47: 'hi-IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
    { code: 'te', bcp47: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'ta', bcp47: 'ta-IN', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'mr', bcp47: 'mr-IN', name: 'मराठी (Marathi)', flag: '🇮🇳' },
    { code: 'bn', bcp47: 'bn-IN', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
    { code: 'kn', bcp47: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
    { code: 'ml', bcp47: 'ml-IN', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
    { code: 'en', bcp47: 'en-IN', name: 'English (India)', flag: '🌐' }
  ];

  const quickPromptsByLang = {
    hi: [
      { text: "हमारे पास केवल 3 शीशियां एंटी-वेनम बची हैं, तत्काल 25 शीशियां भेजें", label: "🐍 आपातकालीन एंटी-वेनम मांग", category: "EMERGENCY" },
      { text: "पीएचसी बड़ागांव के रेफ्रिजरेटर का तापमान 8.7°C हो गया है", label: "❄️ कोल्ड-चेन तापमान अलर्ट", category: "COLD_CHAIN" },
      { text: "डेंगू और मलेरिया के लिए हमारी आवश्यक दवाइयों की स्थिति जांचें", label: "📊 स्टॉक ऑडिट जांच", category: "STOCK" }
    ],
    en: [
      { text: "We only have 3 vials of Anti-Snake Venom left, dispatch 25 vials urgently from district hospital", label: "🐍 Emergency ASV Requisition", category: "EMERGENCY" },
      { text: "Cold chain ILR temperature breached 8.7°C at PHC Baragaon", label: "❄️ Cold-Chain Excursion SOS", category: "COLD_CHAIN" },
      { text: "Audit current emergency stock for Dengue & Malaria epidemic surge", label: "📊 Outbreak Stock Audit", category: "STOCK" }
    ],
    te: [
      { text: "మా వద్ద కేవలం 3 యాంటీ-స్నేక్ వెనమ్ వైల్స్ మాత్రమే మిగిలాయి, అత్యవసరంగా 25 పంపండి", label: "🐍 అత్యవసర యాంటీ-వెనమ్ అభ్యర్థన", category: "EMERGENCY" },
      { text: "కోల్డ్ చైన్ ఐస్-లైన్డ్ రిಫ్రిజిరేటర్ ఉష్ణోగ్రత 8.7°C దాటింది", label: "❄️ కోల్డ్ చైన్ హెచ్చరిక", category: "COLD_CHAIN" },
      { text: "డెంగ్యూ మరియు మలేరియా మందుల స్టాక్ వివరాలు తనిఖీ చేయండి", label: "📊 స్టాక్ ఆడిట్ తనిఖీ", category: "STOCK" }
    ],
    ta: [
      { text: "எங்களிடம் 3 பாம்புக்கடி விஷமுறிவு மருந்துகள் மட்டுமே உள்ளன, உடனடியாக 25 அனுப்பவும்", label: "🐍 அவசர விஷமுறிவு மருந்து", category: "EMERGENCY" },
      { text: "குளிர்சாதன பெட்டி வெப்பநிலை 8.7°C ஆக அதிகரித்துள்ளது", label: "❄️ குளிர்பதன எச்சரிக்கை", category: "COLD_CHAIN" },
      { text: "அத்தியாவசிய மருந்துகளின் இருப்பு நிலையை சரிபார்க்கவும்", label: "📊 இருப்பு தணிக்கை", category: "STOCK" }
    ],
    mr: [
      { text: "आमच्याकडे फक्त ३ अँटी-स्नेक व्हेनम उरले आहेत, त्वरित २५ पाठवा", label: "🐍 तातडीची अँटी-व्हेनम मागणी", category: "EMERGENCY" },
      { text: "रेफ्रिजरेटरचे तापमान ८.७ अंश सेल्सिअस झाले आहे", label: "❄️ कोल्ड-चेन तापमान अलर्ट", category: "COLD_CHAIN" },
      { text: "डेंग्यू आणि मलेरिया औषधांचा साठा तपासा", label: "📊 स्टॉक ऑडिट", category: "STOCK" }
    ],
    bn: [
      { text: "আমাদের কাছে মাত্র ৩টি অ্যান্টি-ভেনম অবশিষ্ট আছে, অবিলম্বে ২৫টি পাঠান", label: "🐍 জরুরি অ্যান্টি-ভেনম", category: "EMERGENCY" },
      { text: "রেফ্রিজারেটরের তাপমাত্রা ৮.৭°C এ পৌঁছেছে", label: "❄️ কোল্ড-চেইন সতর্কতা", category: "COLD_CHAIN" },
      { text: "ডেঙ্গু ও ম্যালেরিয়া ওষুধের মজুদ পরীক্ষা করুন", label: "📊 স্টক অডিট", category: "STOCK" }
    ],
    kn: [
      { text: "ನಮ್ಮಲ್ಲಿ ಕೇವಲ 3 ಆಂಟಿ-ಸ್ನೇಕ್ ವೆನಮ್ ಉಳಿದಿದೆ, ತಕ್ಷಣ 25 ಕಳುಹಿಸಿ", label: "🐍 ತುರ್ತು ಆಂಟಿ-ವೆನಮ್", category: "EMERGENCY" },
      { text: "ಕೋಲ್ಡ್ ಚೈನ್ ತಾಪಮಾನ 8.7°C ಮೀರಿದೆ", label: "❄️ ಕೋಲ್ಡ್ ಚೈನ್ ಎಚ್ಚರಿಕೆ", category: "COLD_CHAIN" },
      { text: "ಡೆಂಗ್ಯೂ ಮತ್ತು ಮಲೇರಿಯಾ ಔಷಧಿಗಳ ದಾಸ್ತಾನು ಪರಿಶೀಲಿಸಿ", label: "📊 ದಾಸ್ತಾನು ಲೆಕ್ಕಪರಿಶೋಧನೆ", category: "STOCK" }
    ],
    ml: [
      { text: "ഞങ്ങളുടെ പക്കൽ 3 ആന്റി-വെനം വയലുകൾ മാത്രമേയുള്ളൂ, അടിയന്തിരമായി 25 അയക്കുക", label: "🐍 അടിയന്തര ആന്റി-വെനം", category: "EMERGENCY" },
      { text: "കോൾഡ് ചെയിൻ ഐഎൽആർ താപനില 8.7°C ആയി ഉയർന്നു", label: "❄️ കോൾഡ് ചെയിൻ മുന്നറിയിപ്പ്", category: "COLD_CHAIN" },
      { text: "ഡെങ്കിപ്പനി, മലേറിയ മരുന്നുകളുടെ സ്റ്റോക്ക് പരിശോധിക്കുക", label: "📊 സ്റ്റോക്ക് ഓഡിറ്റ്", category: "STOCK" }
    ]
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchFacilities(1, 1500)
      .then(liveFacs => {
        if (isMounted && liveFacs && Array.isArray(liveFacs) && liveFacs.length > 0) {
          setFacilities(liveFacs);
        }
      })
      .catch(err => console.warn('Failed to load facilities in modal:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const getLangBcp47 = (code) => {
    const found = supportedLanguages.find(l => l.code === code);
    return found ? found.bcp47 : 'hi-IN';
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  };

  const speakText = (text, langCode) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

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

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
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
      recognition.continuous = false;
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
      } catch (_) { }
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

  const handleStartNewSession = () => {
    stopSpeaking();
    stopListening();
    setSessionId(`ASHA-MODAL-${Date.now().toString(36).toUpperCase()}`);
    setMessages([]);
    setLatestResult(null);
    setInputText('');
  };

  const handleSendQuery = async (queryText = null) => {
    stopListening();
    stopSpeaking();

    const textToSend = (queryText || inputText).trim();
    if (!textToSend) return;

    const userMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const res = await chatWithAshaCopilot({
        prompt: textToSend,
        sessionId: sessionId,
        language: selectedLang,
        facilityId: selectedFacility?.id || null,
        facilityName: selectedFacility?.name || null,
        sourceFacilityId: null,
        sourceFacilityName: null
      });

      if (res?.success && res.data) {
        const copilotData = res.data;
        setLatestResult(copilotData);

        if (copilotData.facility_id || copilotData.facility_name) {
          setSelectedFacility({
            id: copilotData.facility_id,
            name: copilotData.facility_name,
            district: copilotData.extracted_entities?.district_name || '',
            state: copilotData.extracted_entities?.state_name || ''
          });
        }

        const assistantMessage = {
          role: 'assistant',
          content: copilotData.response_text_localized || copilotData.clarification_prompt_localized,
          contentEnglish: copilotData.response_text_english || copilotData.clarification_prompt_english,
          status: copilotData.status,
          intent: copilotData.intent,
          target_facility_name: copilotData.target_facility_name || selectedFacility?.name,
          source_facility_name: copilotData.source_facility_name,
          nearest_surplus_donor: copilotData.nearest_surplus_donor,
          is_user_specified_donor: copilotData.is_user_specified_donor,
          missingSlots: copilotData.missing_slots || [],
          quickReplyOptions: copilotData.quick_reply_options || [],
          recommendedAction: copilotData.recommended_action,
          coldChainIncident: copilotData.cold_chain_incident,
          executionTrace: copilotData.execution_trace || [],
          agentsInvoked: copilotData.agents_invoked || [],
          toolsExecuted: copilotData.tools_executed || [],
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (autoSpeak && assistantMessage.content) {
          speakText(assistantMessage.content, selectedLang);
        }
      }
    } catch (err) {
      console.error("Copilot request error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "त्रुटि: सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।",
          contentEnglish: "Error: Unable to contact ASHA multi-agent server. Please try again.",
          status: "ERROR",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeLangObj = supportedLanguages.find(l => l.code === selectedLang) || supportedLanguages[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel-glow w-full max-w-3xl max-h-[90vh] flex flex-col p-6 sm:p-7 relative rounded-3xl border border-slate-700/60 bg-slate-950/95 shadow-2xl shadow-cyan-950/40 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Sparkles size={22} className="text-cyan-400 animate-pulse" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-indigo-200">
                  ASHA Conversational Voice Copilot
                </h3>
                <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                  GenAI Multi-Agent
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {/* Dynamic Conversational Facility Status Badge */}
                {selectedFacility?.name ? (
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-cyan-500/40 rounded-lg px-2.5 py-1 text-xs">
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                    </span>
                    <Building2 size={12} className="text-cyan-400 shrink-0" />
                    <span className="font-semibold text-white truncate max-w-[170px]" title={selectedFacility.name}>
                      {selectedFacility.name}
                      {selectedFacility.district ? ` (${selectedFacility.district})` : ''}
                    </span>
                    <button
                      onClick={() => setSelectedFacility(null)}
                      className="text-[10px] text-slate-400 hover:text-rose-400 ml-1 font-bold"
                      title="Disconnect facility to mention a new one in conversation"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-900/80 border border-amber-500/30 rounded-lg px-2.5 py-1 text-[11px] text-amber-300">
                    <Building2 size={12} className="text-amber-400 shrink-0" />
                    <span className="text-slate-300">Facility: mention name or state/district</span>
                  </div>
                )}

                <span className="text-[10px] font-mono text-cyan-400/80 hidden sm:inline">
                  {sessionId.slice(0, 12)}...
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`p-2 rounded-xl border transition-all ${autoSpeak
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={autoSpeak ? "Voice TTS Enabled" : "Voice TTS Muted"}
            >
              {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={handleStartNewSession}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700 transition-all"
              title="Reset Conversation / New Session"
            >
              <RefreshCw size={16} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Language Strip */}
        <div className="pt-3 pb-2 border-b border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
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
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 ${isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-md shadow-cyan-500/25 scale-[1.02]'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-[220px]">
          {messages.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Bot size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                ASHA Conversational GenAI Ready
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Speak or type in 8 Indian languages. If any clinical detail is missing (e.g., medicine name, quantity, temperature), the copilot will proactively ask clarifying questions before triggering reallocation.
              </p>

              {/* Quick Starter Prompts */}
              <div className="pt-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                  Sample Frontline Scenarios:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                  {(quickPromptsByLang[selectedLang] || quickPromptsByLang['hi']).map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendQuery(q.text)}
                      className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-2xl flex flex-col justify-between transition-all"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                          {q.label}
                        </span>
                        <ArrowRight size={12} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2">
                        {q.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shrink-0 mt-0.5">
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                        <Bot size={14} className="text-cyan-400" />
                      </div>
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Speech Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-medium rounded-tr-sm shadow-md'
                        : msg.status === 'AWAITING_CLARIFICATION'
                          ? 'bg-amber-950/40 border border-amber-500/50 text-amber-100 rounded-tl-sm'
                          : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-sm'
                      }`}
                    >
                      <p>{msg.content}</p>

                      {!isUser && msg.contentEnglish && (
                        <p className="text-[11px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/80 font-normal">
                          🇬🇧 {msg.contentEnglish}
                        </p>
                      )}
                    </div>

                    {/* Interactive Suggestion / Clarification Chips */}
                    {!isUser && msg.quickReplyOptions && msg.quickReplyOptions.length > 0 && (
                      <div className={`space-y-1.5 p-2.5 rounded-2xl border ${
                        msg.status === 'AWAITING_CLARIFICATION'
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-cyan-500/10 border-cyan-500/30'
                      }`}>
                        <div className={`flex items-center gap-1.5 text-[11px] font-bold ${
                          msg.status === 'AWAITING_CLARIFICATION' ? 'text-amber-400' : 'text-cyan-400'
                        }`}>
                          <HelpCircle size={13} />
                          <span>{msg.status === 'AWAITING_CLARIFICATION' ? 'Clarification Required — Tap to Answer:' : 'Suggested Frontline Actions — Tap to Send:'}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.quickReplyOptions.map((opt, oIdx) => {
                            const optLabel = typeof opt === 'object' && opt !== null ? (opt.label || opt.name || opt.value) : String(opt);
                            const optPayload = typeof opt === 'object' && opt !== null ? (opt.action_payload || opt.value || opt.label) : String(opt);
                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleSendQuery(optPayload)}
                                className={`text-xs px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all hover:scale-105 border ${
                                  msg.status === 'AWAITING_CLARIFICATION'
                                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40 hover:border-amber-400'
                                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-500/40 hover:border-cyan-400'
                                }`}
                              >
                                <span>{optLabel}</span>
                                <ArrowRight size={11} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reallocation Corridor Card */}
                    {!isUser && msg.recommendedAction && msg.recommendedAction.action_type === 'CREATE_DISPATCH_ORDER' && (
                      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-emerald-400" />
                            <span className="font-extrabold text-emerald-300">
                              Dispatch Order Confirmed
                            </span>
                            {msg.recommendedAction.dispatch_id && (
                              <span className="font-mono text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                {msg.recommendedAction.dispatch_id}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold">ETA: {msg.recommendedAction.eta || '1 min'}</span>
                        </div>

                        <p className="text-[11px] text-slate-300">
                          {msg.recommendedAction.action_summary}
                        </p>

                        {/* Multi-Facility Route Nodes */}
                        {(msg.source_facility_name || msg.target_facility_name) && (
                          <div className="flex items-center gap-1.5 flex-wrap bg-slate-950/70 border border-emerald-500/20 rounded-xl p-2 text-[10px]">
                            <span className="text-slate-400 font-semibold">Recipient:</span>
                            <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">
                              {msg.target_facility_name || selectedFacility?.name}
                            </span>
                            <ArrowRight size={11} className="text-emerald-400" />
                            <span className="text-slate-400 font-semibold">Supplying Donor:</span>
                            <span className="font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              {msg.source_facility_name || msg.nearest_surplus_donor?.facility_name || 'AI Selected Surplus'}
                            </span>
                            {msg.is_user_specified_donor ? (
                              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-500/30">
                                User Specified
                              </span>
                            ) : (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                Nearest Surplus
                              </span>
                            )}
                          </div>
                        )}

                        {onTriggerReallocation && (
                          <button
                            onClick={() => {
                              onTriggerReallocation(selectedFacility?.id || 'DH-AND-001');
                              if (onClose) onClose();
                            }}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-1.5 rounded-xl flex items-center justify-center gap-1 transition-all"
                          >
                            <span>View Reallocation on Live Map</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Cold Chain SOS Card */}
                    {!isUser && msg.coldChainIncident && (
                      <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-rose-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <ShieldAlert size={14} className="text-rose-400" />
                            Thermal Incident Logged ({msg.coldChainIncident.incident_id})
                          </span>
                          <span>Holdover: {msg.coldChainIncident.safe_holdover_window_hours}h</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Technician {msg.coldChainIncident.assigned_technician} dispatched to {msg.coldChainIncident.facility_name}.
                        </p>
                      </div>
                    )}

                    {/* Coordinated Agent Swarm Flow (Picked dynamically per conversation) */}
                    {!isUser && ((msg.agentsInvoked && msg.agentsInvoked.length > 0) || (msg.executionTrace && msg.executionTrace.length > 0)) && (() => {
                      const flowAgents = (msg.agentsInvoked && msg.agentsInvoked.length > 0)
                        ? msg.agentsInvoked
                        : Array.from(new Set((msg.executionTrace || []).map(s => s.agent_name || s.agentName)));
                      return (
                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles size={11} className="text-cyan-400" /> Coordinated Agent Flow ({flowAgents.length} Agents):
                            </span>
                          </div>

                          {/* Specialized Agent Swarm Badges */}
                          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] text-slate-300 scrollbar-thin">
                            {flowAgents.map((agName, aIdx) => {
                              const agInfo = getAgentInfo(agName);
                              return (
                                <React.Fragment key={aIdx}>
                                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border shadow-sm shrink-0 font-medium ${agInfo.badgeClass}`}>
                                    <span className="text-xs">{agInfo.icon}</span>
                                    <span className="font-semibold tracking-tight">{agInfo.label}</span>
                                  </div>
                                  {aIdx < flowAgents.length - 1 && (
                                    <ChevronRight size={10} className="text-slate-600 shrink-0" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>

                          {/* Expandable Autonomous Actions (No raw steps forced directly) */}
                          {msg.executionTrace && msg.executionTrace.length > 0 && (
                            <details className="group mt-1 text-[11px] text-slate-400">
                              <summary className="cursor-pointer text-[10px] font-medium text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 select-none">
                                <Layers size={11} className="text-slate-500 group-hover:text-cyan-400" />
                                <span>Inspect Agent Reasoning Decisions ({msg.executionTrace.length})</span>
                                <ChevronDown size={11} className="transition-transform group-open:rotate-180 ml-0.5" />
                              </summary>
                              <div className="mt-1.5 space-y-1 pl-2 border-l-2 border-cyan-500/20 bg-slate-950/50 p-2 rounded-r-lg">
                                {msg.executionTrace.map((step, sIdx) => {
                                  const agInfo = getAgentInfo(step.agent_name || step.agentName);
                                  return (
                                    <div key={sIdx} className="text-[10.5px] leading-relaxed">
                                      <div className="flex items-baseline gap-1.5 font-semibold text-slate-200">
                                        <span>{agInfo.icon}</span>
                                        <span className="text-cyan-300 shrink-0">{agInfo.label}:</span>
                                        <span className="font-normal text-slate-300">{step.action_summary || step.actionSummary}</span>
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

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={14} className="text-slate-300" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs animate-pulse p-2">
              <Sparkles size={14} className="animate-spin" />
              <span>Orchestrating clinical agents & verifying logistics ledger...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input & Microphone Dock */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2 shrink-0">
          {isRecording && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-rose-500/15 border border-rose-500/40 rounded-xl animate-pulse text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold text-rose-300">
                  Listening in {activeLangObj.name}... Speak your requisition or query
                </span>
              </div>
              <button
                onClick={stopListening}
                className="text-[11px] bg-rose-500 hover:bg-rose-600 text-white font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
              >
                <Square size={10} className="fill-white" /> Stop
              </button>
            </div>
          )}

          <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/90 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/30 p-2.5 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuery();
                }
              }}
              placeholder={isRecording ? "Transcribing speech..." : `Type or speak in ${activeLangObj.name}...`}
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />

            <button
              onClick={toggleRecording}
              className={`p-2 rounded-xl transition-all flex items-center justify-center ${isRecording
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-slate-800 text-cyan-400 hover:bg-slate-700 border border-slate-700'
              }`}
              title={isRecording ? "Stop Recording" : "Speak"}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <button
              onClick={() => handleSendQuery()}
              disabled={loading || !inputText.trim()}
              className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
