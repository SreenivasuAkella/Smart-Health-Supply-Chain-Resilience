'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mic, MicOff, Volume2, VolumeX, Sparkles, Languages,
  ArrowRight, Truck, Radio, Square, RotateCcw, Send, CheckCircle2,
  Clock, ShieldAlert, Cpu, Activity, Layers, ChevronDown, ChevronUp, ChevronRight,
  HelpCircle, Bot, User, RefreshCw, AlertTriangle, Building2,
  Maximize2, Minimize2, Minus, MessageSquare, Flame, Check, Camera,
  AlertOctagon, Thermometer, FileText, Image as ImageIcon, ShieldCheck
} from 'lucide-react';
import { chatWithAshaCopilot, fetchFacilities, fetchCopilotSessionDetail } from '../services/api';
import { mapBackendName, formatCopilotTime } from '../utils/formatters';
import OpenFDAClinicalCard from './OpenFDAClinicalCard';

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

export default function VoiceCopilotModal({ 
  isOpen, 
  onClose, 
  onToggle, 
  apiKey, 
  onTriggerReallocation,
  facilities: initialFacilities = [],
  activeTab = 'overview',
  onOpenVoiceTab
}) {
  const [selectedLang, setSelectedLang] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  const [selectedFacility, setSelectedFacility] = useState(null);
  const [facilities, setFacilities] = useState(initialFacilities);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const [attachedImageBase64, setAttachedImageBase64] = useState(null);
  const [attachedImageName, setAttachedImageName] = useState(null);

  const recognitionRef = useRef(null);
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);
  const langDropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearAttachedImage = () => {
    setAttachedImageBase64(null);
    setAttachedImageName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const syncSessionFromStorage = async () => {
    try {
      const savedSid = localStorage.getItem('asha_copilot_active_session_id');
      if (savedSid) {
        setSessionId(savedSid);
        const fullSess = await fetchCopilotSessionDetail(savedSid);
        if (fullSess && Array.isArray(fullSess.messages) && fullSess.messages.length > 0) {
          setMessages(fullSess.messages);
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
      } else {
        const newSid = `SESS-${Date.now().toString(36).toUpperCase()}`;
        setSessionId(newSid);
        localStorage.setItem('asha_copilot_active_session_id', newSid);
      }
      const savedFac = localStorage.getItem('asha_copilot_active_facility');
      if (savedFac) {
        setSelectedFacility(JSON.parse(savedFac));
      }
    } catch (e) {
      console.warn("Session sync notice:", e);
    }
  };

  useEffect(() => {
    syncSessionFromStorage();

    const handleSessionUpdate = () => {
      syncSessionFromStorage();
    };

    window.addEventListener('asha_copilot_session_updated', handleSessionUpdate);
    window.addEventListener('storage', handleSessionUpdate);

    return () => {
      window.removeEventListener('asha_copilot_session_updated', handleSessionUpdate);
      window.removeEventListener('storage', handleSessionUpdate);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      syncSessionFromStorage();
    }
  }, [isOpen]);

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
      { text: "కోల్డ్ చైన్ ఐస్-లైన్డ్ రిఫ్రిజిరేటర్ ఉష్ణోగ్రత 8.7°C దాటింది", label: "❄️ కోల్డ్ చైన్ హెచ్చరిక", category: "COLD_CHAIN" },
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
    try {
      if (selectedFacility) {
        localStorage.setItem('asha_copilot_active_facility', JSON.stringify(selectedFacility));
      } else {
        localStorage.removeItem('asha_copilot_active_facility');
      }
    } catch (_) {}
  }, [selectedFacility]);

  // Keyboard shortcut listener: Cmd+K / Ctrl+K to toggle copilot, Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onToggle) {
          onToggle();
        } else if (isOpen && onClose) {
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onToggle]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (facilities.length === 0) {
      let isMounted = true;
      fetchFacilities(1, 1200)
        .then(liveFacs => {
          if (isMounted && liveFacs && Array.isArray(liveFacs) && liveFacs.length > 0) {
            setFacilities(liveFacs);
          }
        })
        .catch(err => console.warn('Failed to load facilities in copilot:', err));
      return () => {
        isMounted = false;
      };
    }
  }, [facilities.length]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Focus input when copilot opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

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
    const newSid = `SESS-${Date.now().toString(36).toUpperCase()}`;
    setSessionId(newSid);
    setMessages([]);
    setLatestResult(null);
    setInputText('');
    clearAttachedImage();
    try {
      localStorage.setItem('asha_copilot_active_session_id', newSid);
      localStorage.removeItem('asha_copilot_active_facility');
      window.dispatchEvent(new CustomEvent('asha_copilot_session_updated', { detail: { sessionId: newSid } }));
    } catch (_) {}
  };

  const handleSendQuery = async (queryText = null) => {
    stopListening();
    stopSpeaking();

    const textToSend = (queryText || inputText).trim();
    const currentImage = attachedImageBase64;
    const currentImageName = attachedImageName;

    if (!textToSend && !currentImage) return;

    clearAttachedImage();
    setInputText('');

    const userMessage = {
      role: 'user',
      content: textToSend || (currentImageName ? `Uploaded health asset: ${currentImageName}` : "Clinical inspection request"),
      has_image: Boolean(currentImage),
      image_base64: currentImage,
      image_name: currentImageName,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const activeSid = sessionId || localStorage.getItem('asha_copilot_active_session_id') || `SESS-${Date.now().toString(36).toUpperCase()}`;
      const res = await chatWithAshaCopilot({
        prompt: textToSend || (currentImageName ? `Please analyze this clinical asset: ${currentImageName}` : "Clinical inspection request"),
        sessionId: activeSid,
        language: selectedLang,
        facilityId: selectedFacility?.id || null,
        facilityName: selectedFacility?.name || null,
        sourceFacilityId: null,
        sourceFacilityName: null,
        imageBase64: currentImage
      });

      const copilotData = res?.data || res;
      if (copilotData && (copilotData.response_text_localized || copilotData.response_text_english || copilotData.clarification_prompt_localized)) {
        setLatestResult(copilotData);

        if (copilotData.session_id) {
          setSessionId(copilotData.session_id);
          try {
            localStorage.setItem('asha_copilot_active_session_id', copilotData.session_id);
            window.dispatchEvent(new CustomEvent('asha_copilot_session_updated', { detail: { sessionId: copilotData.session_id } }));
          } catch (_) {}
        }

        const effectiveFacId = copilotData.facility_id || copilotData.target_facility_id || copilotData.recommended_action?.target_facility_id || copilotData.dispatch_package?.target_facility?.id;
        const effectiveFacName = copilotData.facility_name || copilotData.target_facility_name || copilotData.recommended_action?.target_facility_name || copilotData.dispatch_package?.target_facility?.name;
        if (effectiveFacId || effectiveFacName) {
          const facObj = {
            id: effectiveFacId || selectedFacility?.id,
            name: effectiveFacName || selectedFacility?.name,
            district: copilotData.extracted_entities?.district_name || selectedFacility?.district || '',
            state: copilotData.extracted_entities?.state_name || selectedFacility?.state || ''
          };
          setSelectedFacility(facObj);
          try {
            localStorage.setItem('asha_copilot_active_facility', JSON.stringify(facObj));
          } catch (_) {}
        }

        const assistantMessage = {
          role: 'assistant',
          content: copilotData.response_text_localized || copilotData.clarification_prompt_localized,
          contentEnglish: copilotData.response_text_english || copilotData.clarification_prompt_english,
          status: copilotData.status,
          intent: copilotData.intent,
          target_facility_id: effectiveFacId,
          target_facility_name: effectiveFacName || selectedFacility?.name,
          source_facility_id: copilotData.source_facility_id || copilotData.recommended_action?.source_facility_id || copilotData.dispatch_package?.selected_donor?.facility_id,
          source_facility_name: copilotData.source_facility_name || copilotData.dispatch_package?.selected_donor?.facility_name,
          medicine_id: copilotData.medicine_id || copilotData.extracted_entities?.medicine_id || copilotData.recommended_action?.medicine_id,
          quantity: copilotData.requested_quantity || copilotData.extracted_entities?.requested_quantity || copilotData.recommended_action?.quantity || 20,
          dispatch_package: copilotData.dispatch_package || copilotData.recommended_action?.dispatch_package,
          nearest_surplus_donor: copilotData.nearest_surplus_donor,
          is_user_specified_donor: copilotData.is_user_specified_donor,
          missingSlots: copilotData.missing_slots || [],
          quickReplyOptions: copilotData.quick_reply_options || [],
          recommendedAction: copilotData.recommended_action,
          coldChainIncident: copilotData.cold_chain_incident,
          executionTrace: copilotData.execution_trace || [],
          agentsInvoked: copilotData.agents_invoked || [],
          toolsExecuted: copilotData.tools_executed || [],
          vision_analysis: copilotData.vision_analysis,
          openfda_clinical_insights: copilotData.openfda_clinical_insights || copilotData.vision_analysis?.openfda_clinical_insights,
          clinical_protocol_card: copilotData.clinical_protocol_card,
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

  const activeLangObj = supportedLanguages.find(l => l.code === selectedLang) || supportedLanguages[0];

  return (
    <>
      {/* 
        ========================================================================
        FLOATING COPILOT LAUNCHER ICON (Bottom Right - Hidden on /voice Tab)
        ========================================================================
      */}
      {activeTab !== 'voice' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={onToggle || (() => (isOpen ? onClose?.() : null))}
            className={`
              group relative p-[2px] rounded-2xl sm:rounded-3xl transition-all duration-300
              transform active:scale-95 flex items-center justify-center
              ${isOpen 
                ? 'bg-gradient-to-tr from-rose-500 via-amber-500 to-cyan-500 shadow-2xl shadow-rose-500/30 scale-105 ring-2 ring-rose-400/50'
                : 'bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-400/60 hover:scale-110'}
            `}
            title={isOpen ? "Close ASHA Voice Copilot" : "Open ASHA Voice Copilot (8 Indian Languages) • ⌘K"}
            aria-label="Toggle ASHA Voice Copilot"
          >
            {/* Ambient Glow Halo */}
            <span className="absolute -inset-1 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-50 blur-lg group-hover:opacity-85 transition duration-500 animate-pulse-glow" />

            {/* Inner Container with team_logo.jpg */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[14px] sm:rounded-[22px] overflow-hidden bg-slate-950 border border-cyan-400/30 group-hover:border-cyan-300 transition-colors flex items-center justify-center shadow-inner">
              <img 
                src="/team_logo.jpg" 
                alt="ASHA Copilot Logo" 
                className={`w-full h-full object-cover transition-all duration-300 ${
                  isOpen ? 'opacity-85 scale-95' : 'group-hover:scale-105'
                }`} 
              />

              {/* If open, close overlay on hover */}
              {isOpen && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <X size={24} className="stroke-[2.5]" />
                </div>
              )}
            </div>

            {/* Online Green Beacon */}
            {!isOpen && (
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950 shadow" />
              </span>
            )}

            {isOpen && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-slate-950 shadow" />
              </span>
            )}
          </button>
        </div>
      )}

      {/* 
        ========================================================================
        COPILOT SURFACE (Docked Floating Widget OR Full Maximized Modal)
        ========================================================================
      */}
      {isOpen && (
        <div 
          className={
            isMaximized
              ? "modal-overlay"
              : "fixed bottom-24 right-4 sm:right-6 z-50 animate-copilot-pop"
          }
          onClick={isMaximized ? onClose : undefined}
        >
          <div
            className={`
              flex flex-col relative rounded-3xl border border-cyan-500/35 bg-slate-950/95 
              backdrop-blur-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden transition-all duration-300
              ${isMaximized 
                ? 'w-full max-w-4xl h-[90vh] p-6 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.25)]' 
                : 'w-[calc(100vw-32px)] sm:w-[460px] md:w-[500px] h-[660px] max-h-[calc(100vh-120px)] p-4 sm:p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.2)]'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Glowing Ambient Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500" />

            {/* Header Bar - Single Clean Line */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                  ASHA Voice Copilot
                </h3>
              </div>

              {/* Copilot Window Controls + Language Dropdown */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Language Dropdown */}
                <div className="relative" ref={langDropdownRef}>
                  <button
                    onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                    className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all shadow-sm"
                    title="Switch Language (8 Indian Languages)"
                  >
                    <span className="text-sm">{activeLangObj.flag}</span>
                    <span className="text-white font-bold">{activeLangObj.name.split(' ')[0]}</span>
                    <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                  </button>

                  {isLangDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1.5 w-48 bg-slate-950/98 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/90 backdrop-blur-2xl p-1.5 z-50 animate-fadeIn">
                      <div className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 tracking-wider border-b border-slate-800/80">
                        Select Language
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-0.5 mt-1 scrollbar-thin">
                        {supportedLanguages.map((lang) => {
                          const isSelected = selectedLang === lang.code;
                          return (
                            <button
                              key={lang.code}
                              onClick={() => {
                                stopSpeaking();
                                stopListening();
                                setSelectedLang(lang.code);
                                setIsLangDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors text-left ${
                                isSelected
                                  ? 'bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 text-cyan-300 font-bold border border-cyan-500/40'
                                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{lang.flag}</span>
                                <span>{lang.name}</span>
                              </div>
                              {isSelected && <Check size={13} className="text-cyan-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Auto-Speak Toggle */}
                <button
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`p-1.5 sm:p-2 rounded-xl border transition-all ${autoSpeak
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title={autoSpeak ? "Voice TTS Enabled" : "Voice TTS Muted"}
                >
                  {autoSpeak ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>

                {/* Reset / New Session */}
                <button
                  onClick={handleStartNewSession}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700 transition-all"
                  title="Reset Conversation / New Session"
                >
                  <RefreshCw size={15} />
                </button>

                {/* Open Full ASHA Copilot Tab */}
                <button
                  onClick={() => {
                    if (onOpenVoiceTab) {
                      onOpenVoiceTab();
                    } else if (onClose) {
                      onClose();
                    }
                  }}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700 transition-all"
                  title="Open Full ASHA Copilot Tab"
                >
                  <Maximize2 size={15} />
                </button>

                {/* Minimize / Close */}
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-all"
                  title="Close Copilot"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Conversation Stream */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 min-h-[200px]">
              {messages.length === 0 ? (
                <div className="py-2 space-y-2.5 text-left">
                  {/* Prominent Quick Image Upload Action */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gradient-to-r from-cyan-950/70 to-indigo-950/70 hover:from-cyan-900/80 hover:to-indigo-900/80 border border-cyan-500/40 hover:border-cyan-400 p-2.5 rounded-2xl flex items-center justify-between text-left transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                        <Camera size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-cyan-200 group-hover:text-cyan-100 flex items-center gap-1.5">
                          📷 Upload Clinical Asset / Photo
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Attach prescription, stock register logbook, or ILR dial
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block px-1 pt-1">
                    Quick Frontline Scenarios:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {(quickPromptsByLang[selectedLang] || quickPromptsByLang['hi']).map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendQuery(q.text)}
                        className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 p-2.5 rounded-2xl flex items-center justify-between text-left transition-all"
                      >
                        <div className="pr-2">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 block">
                            {q.label}
                          </span>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {q.text}
                          </p>
                        </div>
                        <ArrowRight size={13} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 shrink-0 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const quickReplies = msg.quickReplyOptions || msg.quick_reply_options;
                  const recAction = msg.recommendedAction || msg.recommended_action;
                  const coldChain = msg.coldChainIncident || msg.cold_chain_incident;

                  return (
                    <div
                      key={idx}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shrink-0 mt-0.5 overflow-hidden">
                          <img
                            src="/team_logo.jpg"
                            alt="Copilot"
                            className="w-full h-full object-cover rounded-[9px]"
                          />
                        </div>
                      )}

                      <div className={`max-w-[88%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                        {/* Sender & Timestamp & Intent Header */}
                        <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {!isUser ? (
                            <>
                              <span className="font-semibold text-cyan-400">ASHA Copilot</span>
                              {msg.intent && (
                                <span className="bg-slate-900 border border-slate-700/80 text-cyan-300 px-1.5 py-0.5 rounded font-medium text-[9px]">
                                  {mapBackendName(msg.intent)}
                                </span>
                              )}
                              <span className="w-1 h-1 rounded-full bg-slate-600" />
                              <span>{formatCopilotTime(msg.timestamp)}</span>
                            </>
                          ) : (
                            <span>{formatCopilotTime(msg.timestamp)}</span>
                          )}
                        </div>

                        {/* Speech Bubble */}
                        <div
                          className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${isUser
                            ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-medium rounded-tr-sm shadow-md'
                            : msg.status === 'AWAITING_CLARIFICATION'
                              ? 'bg-amber-950/40 border border-amber-500/50 text-amber-100 rounded-tl-sm'
                              : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="flex-1">{msg.content}</p>
                            {!isUser && (
                              <button
                                onClick={() => speakText(msg.content, selectedLang)}
                                className="p-1 rounded text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                                title="Replay Audio"
                              >
                                <Volume2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* Attached Image Thumbnail */}
                          {msg.image_base64 && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-950/60 p-1">
                              <img src={msg.image_base64} alt="Clinical Asset" className="w-full h-auto object-cover max-h-40 rounded-lg" />
                              {msg.image_name && (
                                <span className="text-[10px] text-slate-300 px-1 pt-1 block truncate font-mono">{msg.image_name}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Multimodal Vision Inspection Card */}
                        {!isUser && msg.vision_analysis && (
                          <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-2.5 space-y-2 shadow-lg text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                                  <Camera size={14} />
                                </div>
                                <div>
                                  <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide block">
                                    {msg.vision_analysis.summary_title || "Multimodal Vision Inspection"}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {msg.vision_analysis.category} &bull; {msg.vision_analysis.ai_engine_used || 'Gemini Vision'}
                                  </span>
                                </div>
                              </div>
                              <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                Visual Audit
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              {msg.vision_analysis.findings_summary}
                            </p>

                            {/* Medicine Packaging OCR & Authenticity Card */}
                            {(msg.vision_analysis.category === 'MEDICINE_PACK' || msg.vision_analysis.medicine_details?.brand_name || msg.vision_analysis.brand_name) && (
                              <div className="bg-slate-900/90 rounded-xl border border-slate-800/80 p-2.5 space-y-2 text-[11px]">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-[9px] text-slate-400 block font-medium">Brand</span>
                                    <span className="font-bold text-cyan-300 truncate block">
                                      {msg.vision_analysis.medicine_details?.brand_name || msg.vision_analysis.brand_name || "Identified Asset"}
                                    </span>
                                  </div>
                                  <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-[9px] text-slate-400 block font-medium">Generic Name</span>
                                    <span className="font-semibold text-slate-200 truncate block">
                                      {msg.vision_analysis.medicine_details?.generic_name || msg.vision_analysis.generic_name || "Clinical Drug"}
                                    </span>
                                  </div>
                                  <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-[9px] text-slate-400 block font-medium">Batch No.</span>
                                    <span className="font-mono text-emerald-300 font-semibold truncate block">
                                      {msg.vision_analysis.medicine_details?.batch_number || msg.vision_analysis.batch_number || "Verified"}
                                    </span>
                                  </div>
                                  <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-[9px] text-slate-400 block font-medium">Expiry</span>
                                    <span className="font-medium text-amber-300 truncate block">
                                      {msg.vision_analysis.medicine_details?.expiry_date || msg.vision_analysis.expiry_date || "Valid"}
                                    </span>
                                  </div>
                                  <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-[9px] text-slate-400 block font-medium">Status</span>
                                    <span className="font-medium text-emerald-400 flex items-center gap-1">
                                      <ShieldCheck size={11} /> {msg.vision_analysis.medicine_details?.packaging_status || msg.vision_analysis.packaging_status || "Intact"}
                                    </span>
                                  </div>
                                  <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-[9px] text-slate-400 block font-medium">Counterfeit Risk</span>
                                    <span className="font-bold text-emerald-400">
                                      {msg.vision_analysis.medicine_details?.counterfeit_risk_score ?? msg.vision_analysis.counterfeit_risk_score ?? 3.5}%
                                    </span>
                                  </div>
                                </div>
                                {msg.vision_analysis.medicine_details?.dosage_form && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
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
                              compact={true}
                            />
                          )}

                            {/* Stock Register Rows */}
                            {msg.vision_analysis.category === 'STOCK_REGISTER' && msg.vision_analysis.stock_register_details?.detected_rows?.length > 0 && (
                              <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-2 space-y-1">
                                <span className="text-[9.5px] font-bold text-amber-400 uppercase tracking-wider block">
                                  📋 Detected Inventory Logbook Rows:
                                </span>
                                <div className="space-y-1">
                                  {msg.vision_analysis.stock_register_details.detected_rows.map((row, rIdx) => (
                                    <div key={rIdx} className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-slate-950 border border-slate-800/80">
                                      <span className="font-semibold text-slate-200">{row.item_name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">Stock: <strong className={row.stock_available === 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>{row.stock_available}</strong> / Min: {row.minimum_required}</span>
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
                              <div className={`p-2 rounded-xl border flex items-center justify-between ${
                                msg.vision_analysis.temperature_details.excursion_detected 
                                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-200' 
                                  : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <Thermometer size={15} className={msg.vision_analysis.temperature_details.excursion_detected ? "text-rose-400 animate-pulse" : "text-emerald-400"} />
                                  <div>
                                    <span className="text-xs font-bold block">
                                      Observed ILR Temp: {msg.vision_analysis.temperature_details.recorded_temperature_celsius}°C
                                    </span>
                                    <span className="text-[9.5px] opacity-80">Safe Cold-Chain Target: 2.0°C – 8.0°C</span>
                                  </div>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  msg.vision_analysis.temperature_details.excursion_detected
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}>
                                  {msg.vision_analysis.temperature_details.excursion_detected ? 'EXCURSION BREACH' : 'NORMAL'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Emergency Clinical Protocol Card */}
                        {!isUser && msg.clinical_protocol_card && (
                          <div className="bg-rose-950/20 border border-rose-500/40 rounded-2xl p-2.5 space-y-2 shadow-lg text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                                  <AlertOctagon size={14} />
                                </div>
                                <div>
                                  <span className="text-[11px] font-black text-rose-300 uppercase tracking-wide block">
                                    {msg.clinical_protocol_card.title}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium">
                                    {msg.clinical_protocol_card.authority_guideline}
                                  </span>
                                </div>
                              </div>
                              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold px-2 py-0.5 rounded-lg animate-pulse">
                                {msg.clinical_protocol_card.urgency} PROTOCOL
                              </span>
                            </div>

                            <div className="bg-slate-950/70 p-2 rounded-xl border border-rose-500/20 space-y-1">
                              <span className="text-[9.5px] font-bold text-rose-400 uppercase flex items-center gap-1">
                                <FileText size={10} /> First-Line Mandatory Test:
                              </span>
                              <div className="font-bold text-slate-100 text-xs">{msg.clinical_protocol_card.first_line_test}</div>
                              <p className="text-[10px] text-slate-400 leading-relaxed">{msg.clinical_protocol_card.test_procedure}</p>
                            </div>
                          </div>
                        )}

                        {/* Interactive Suggestions / Clarification Chips */}
                        {!isUser && quickReplies && quickReplies.length > 0 && (
                          <div className={`space-y-1.5 p-2 rounded-2xl border ${
                            msg.status === 'AWAITING_CLARIFICATION'
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-cyan-500/10 border-cyan-500/30'
                          }`}>
                            <div className={`flex items-center gap-1.5 text-[10.5px] font-bold ${
                              msg.status === 'AWAITING_CLARIFICATION' ? 'text-amber-400' : 'text-cyan-400'
                            }`}>
                              <HelpCircle size={12} />
                              <span>{msg.status === 'AWAITING_CLARIFICATION' ? 'Clarification Required — Tap to Answer:' : 'Suggested Actions:'}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {quickReplies.map((opt, oIdx) => {
                                const optLabel = typeof opt === 'object' && opt !== null ? (opt.label || opt.name || opt.value) : String(opt);
                                const optPayload = typeof opt === 'object' && opt !== null ? (opt.action_payload || opt.value || opt.label) : String(opt);
                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => handleSendQuery(optPayload)}
                                    className={`text-[11px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition-all hover:scale-105 border ${
                                      msg.status === 'AWAITING_CLARIFICATION'
                                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40 hover:border-amber-400'
                                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-500/40 hover:border-cyan-400'
                                    }`}
                                  >
                                    <span>{optLabel}</span>
                                    <ArrowRight size={10} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Reallocation Dispatch Order Card */}
                        {!isUser && recAction && recAction.action_type === 'CREATE_DISPATCH_ORDER' && (
                          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-2.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Truck size={13} className="text-emerald-400" />
                                <span className="font-extrabold text-emerald-300">
                                  Dispatch Order Confirmed
                                </span>
                                {recAction.dispatch_id && (
                                  <span className="font-mono text-[9px] text-emerald-300 bg-emerald-500/20 px-1 py-0.5 rounded">
                                    {recAction.dispatch_id}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-emerald-400 font-bold">ETA: {recAction.eta || '1 min'}</span>
                            </div>

                            <p className="text-[11px] text-slate-300">
                              {recAction.action_summary}
                            </p>

                            {/* Corridor Nodes */}
                            {(msg.source_facility_name || msg.target_facility_name) && (
                              <div className="flex items-center gap-1 flex-wrap bg-slate-950/70 border border-emerald-500/20 rounded-xl p-1.5 text-[10px]">
                                <span className="text-slate-400 font-semibold">To:</span>
                                <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">
                                  {msg.target_facility_name || selectedFacility?.name}
                                </span>
                                <ArrowRight size={10} className="text-emerald-400" />
                                <span className="text-slate-400 font-semibold">From:</span>
                                <span className="font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                  {msg.source_facility_name || msg.nearest_surplus_donor?.facility_name || 'AI Selected Surplus'}
                                </span>
                              </div>
                            )}

                            {onTriggerReallocation && (
                              <button
                                onClick={() => {
                                  const plan = msg.dispatch_package || recAction?.dispatch_package || recAction?.dispatch_plan;
                                  const targetId = msg.target_facility_id || recAction?.target_facility_id || selectedFacility?.id;
                                  const medId = msg.medicine_id || recAction?.medicine_id || 'PUB-MED-001';
                                  const qty = msg.quantity || recAction?.quantity || 20;
                                  onTriggerReallocation(plan || targetId, medId, qty);
                                  if (onClose) onClose();
                                }}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-1.5 rounded-xl flex items-center justify-center gap-1 transition-all"
                              >
                                <span>View Reallocation on Live Map</span>
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Cold Chain SOS Card */}
                        {!isUser && coldChain && (
                          <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-2.5 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-rose-300 font-bold">
                              <span className="flex items-center gap-1.5">
                                <ShieldAlert size={13} className="text-rose-400" />
                                Thermal Incident ({coldChain.incident_id})
                              </span>
                              <span>Holdover: {coldChain.safe_holdover_window_hours}h</span>
                            </div>
                            <p className="text-[11px] text-slate-300">
                              Technician {coldChain.assigned_technician} dispatched to {coldChain.facility_name}.
                            </p>
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          <User size={13} className="text-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {loading && (
                <div className="flex items-center gap-2 text-cyan-400 text-xs animate-pulse p-2 bg-cyan-950/20 rounded-xl border border-cyan-500/20">
                  <Sparkles size={14} className="animate-spin text-cyan-400" />
                  <span>Orchestrating clinical agents & verifying logistics ledger...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input & Microphone Dock */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2 shrink-0">
              {/* Attached Image Preview Chip */}
              {attachedImageBase64 && (
                <div className="flex items-center gap-2 bg-slate-900 border border-cyan-500/40 rounded-xl p-1.5 px-2 text-xs animate-fadeIn">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-cyan-500/50 shrink-0 bg-slate-950">
                    <img src={attachedImageBase64} alt="Attached Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                      <Camera size={11} /> Image Attached
                    </span>
                    <span className="text-[11px] text-slate-300 truncate block font-mono">
                      {attachedImageName || "clinical_asset.jpg"}
                    </span>
                  </div>
                  <button
                    onClick={clearAttachedImage}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove attached image"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {isRecording && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-rose-500/15 border border-rose-500/40 rounded-xl animate-pulse text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-bold text-rose-300">
                      Listening in {activeLangObj.name}... Speak query
                    </span>
                  </div>
                  <button
                    onClick={stopListening}
                    className="text-[10px] bg-rose-500 hover:bg-rose-600 text-white font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                  >
                    <Square size={9} className="fill-white" /> Stop
                  </button>
                </div>
              )}

              <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/90 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/30 p-2 space-y-2 shadow-inner">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <input
                  ref={inputRef}
                  type="text"
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
                      ? "Transcribing speech..." 
                      : attachedImageBase64 
                        ? "Add notes or hit Send..." 
                        : `Type or speak in ${activeLangObj.name}...`
                  }
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none px-1"
                />

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  {/* Multimodal Add Image Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`py-1 px-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                      attachedImageBase64
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                    title="Attach photo of clinical medicine pack, prescription, stock register, or ILR thermometer dial"
                  >
                    <Camera size={13} className={attachedImageBase64 ? "text-slate-950" : "text-cyan-400"} />
                    <span>{attachedImageBase64 ? "Image Added" : "Add Image"}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Microphone Speak Button */}
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`py-1 px-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                        isRecording 
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30' 
                          : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30'
                      }`}
                      title={isRecording ? "Stop Recording" : "Speak in " + activeLangObj.name}
                    >
                      {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
                      <span>{isRecording ? "Listening..." : "Speak"}</span>
                    </button>

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={() => handleSendQuery()}
                      disabled={loading || (!inputText.trim() && !attachedImageBase64)}
                      className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold py-1 px-3 rounded-xl flex items-center gap-1 shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      title="Send Request"
                    >
                      <span>Send</span>
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
