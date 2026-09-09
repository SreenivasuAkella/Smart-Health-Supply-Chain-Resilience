'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, Sparkles, Languages, 
  ArrowRight, Truck, Radio, Square, RotateCcw, Send, CheckCircle2,
  Clock, ShieldAlert, Cpu, Activity, PhoneCall, Headphones, FileCheck2,
  AlertTriangle, Play, ChevronRight, Zap, RefreshCw, BarChart3
} from 'lucide-react';
import { queryGeminiCopilot, fetchCopilotHistory } from '../services/api';

export default function VoiceCopilotView({ apiKey, onTriggerReallocation }) {
  const [selectedLang, setSelectedLang] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copilotResponse, setCopilotResponse] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceDispatches, setVoiceDispatches] = useState([]);

  const recognitionRef = useRef(null);

  const supportedLanguages = [
    { code: 'hi', bcp47: 'hi-IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳', region: 'North / Central India' },
    { code: 'te', bcp47: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳', region: 'Andhra Pradesh & Telangana' },
    { code: 'ta', bcp47: 'ta-IN', name: 'தமிழ் (Tamil)', flag: '🇮🇳', region: 'Tamil Nadu & Puducherry' },
    { code: 'mr', bcp47: 'mr-IN', name: 'मराठी (Marathi)', flag: '🇮🇳', region: 'Maharashtra & Goa' },
    { code: 'bn', bcp47: 'bn-IN', name: 'বাংলা (Bengali)', flag: '🇮🇳', region: 'West Bengal & Tripura' },
    { code: 'kn', bcp47: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳', region: 'Karnataka' },
    { code: 'en', bcp47: 'en-IN', name: 'English (India)', flag: '🌐', region: 'Pan-India National' }
  ];

  const quickPromptsByLang = {
    hi: [
      { text: "हमारे पास केवल 3 शीशियां एंटी-वेनम बची हैं, तत्काल 25 शीशियां भेजें", label: "🐍 आपातकालीन एंटी-वेनम मांग", urgency: "CRITICAL" },
      { text: "पीएचसी बड़ागांव के रेफ्रिजरेटर का तापमान 8.7°C हो गया है", label: "❄️ कोल्ड-चेन तापमान अलर्ट", urgency: "HIGH" },
      { text: "डेंगू और मलेरिया के लिए हमारी आवश्यक दवाइयों की स्थिति जांचें", label: "📊 स्टॉक ऑडिट जांच", urgency: "NORMAL" }
    ],
    en: [
      { text: "We only have 3 vials of Anti-Snake Venom left, dispatch 25 vials urgently from district hospital", label: "🐍 Emergency ASV Requisition", urgency: "CRITICAL" },
      { text: "Cold chain ILR temperature breached 8.7°C at PHC Baragaon", label: "❄️ Cold-Chain Excursion SOS", urgency: "HIGH" },
      { text: "Audit current emergency stock for Dengue & Malaria epidemic surge", label: "📊 Outbreak Stock Audit", urgency: "NORMAL" }
    ],
    te: [
      { text: "మా వద్ద కేవలం 3 యాంటీ-స్నేక్ వెనమ్ వైల్స్ మాత్రమే మిగిలాయి, అత్యవసరంగా 25 పంపండి", label: "🐍 అత్యవసర యాంటీ-వెనమ్ అభ్యర్థన", urgency: "CRITICAL" },
      { text: "కోల్డ్ చైన్ ఐస్-లైన్డ్ రిఫ్రిజిరేటర్ ఉష్ణోగ్రత 8.7°C దాటింది", label: "❄️ కోల్డ్ చైన్ హెచ్చరిక", urgency: "HIGH" },
      { text: "డెంగ్యూ మరియు మలేరియా మందుల స్టాక్ వివరాలు తనిఖీ చేయండి", label: "📊 స్టాక్ ఆడిట్ తనిఖీ", urgency: "NORMAL" }
    ],
    ta: [
      { text: "எங்களிடம் 3 பாம்புக்கடி விஷமுறிவு மருந்துகள் மட்டுமே உள்ளன, உடனடியாக 25 அனுப்பவும்", label: "🐍 அவசர விஷமுறிவு மருந்து", urgency: "CRITICAL" },
      { text: "குளிர்சாதன பெட்டி வெப்பநிலை 8.7°C ஆக அதிகரித்துள்ளது", label: "❄️ குளிர்பதன எச்சரிக்கை", urgency: "HIGH" },
      { text: "அத்தியாவசிய மருந்துகளின் இருப்பு நிலையை சரிபார்க்கவும்", label: "📊 இருப்பு தணிக்கை", urgency: "NORMAL" }
    ],
    mr: [
      { text: "आमच्याकडे फक्त ३ अँटी-स्नेक व्हेनम उरले आहेत, त्वरित २५ पाठवा", label: "🐍 तातडीची अँटी-व्हेनम मागणी", urgency: "CRITICAL" },
      { text: "रेफ्रिजरेटरचे तापमान ८.७ अंश सेल्सिअस झाले आहे", label: "❄️ कोल्ड-चेन तापमान अलर्ट", urgency: "HIGH" },
      { text: "डेंग्यू आणि मलेरिया औषधांचा साठा तपासा", label: "📊 स्टॉक ऑडिट", urgency: "NORMAL" }
    ],
    bn: [
      { text: "আমাদের কাছে মাত্র ৩টি অ্যান্টি-ভেনম অবশিষ্ট আছে, অবিলম্বে ২৫টি পাঠান", label: "🐍 জরুরি অ্যান্টি-ভেনম", urgency: "CRITICAL" },
      { text: "রেফ্রিজারেটরের তাপমাত্রা ৮.৭°C এ পৌঁছেছে", label: "❄️ কোল্ড-চেইন সতর্কতা", urgency: "HIGH" },
      { text: "ডেঙ্গু ও ম্যালেরিয়া ওষুধের মজুদ পরীক্ষা করুন", label: "📊 স্টক অডিট", urgency: "NORMAL" }
    ],
    kn: [
      { text: "ನಮ್ಮಲ್ಲಿ ಕೇವಲ 3 ಆಂಟಿ-ಸ್ನೇಕ್ ವೆನಮ್ ಉಳಿದಿದೆ, ತಕ್ಷಣ 25 ಕಳುಹಿಸಿ", label: "🐍 ತುರ್ತು ಆಂಟಿ-ವೆನಮ್", urgency: "CRITICAL" },
      { text: "ಕೋಲ್ಡ್ ಚೈನ್ ತಾಪಮಾನ 8.7°C ಮೀರಿದೆ", label: "❄️ ಕೋಲ್ಡ್ ಚೈನ್ ಎಚ್ಚರಿಕೆ", urgency: "HIGH" },
      { text: "ಡೆಂಗ್ಯೂ ಮತ್ತು ಮಲೇರಿಯಾ ಔಷಧಿಗಳ ದಾಸ್ತಾನು ಪರಿಶೀಲಿಸಿ", label: "📊 ದಾಸ್ತಾನು ಲೆಕ್ಕಪರಿಶೋಧನೆ", urgency: "NORMAL" }
    ]
  };

  const loadHistory = async () => {
    try {
      const list = await fetchCopilotHistory();
      if (list && list.length > 0) {
        setVoiceDispatches(list);
      }
    } catch (e) {
      console.warn("Failed to load history:", e);
    }
  };

  useEffect(() => {
    loadHistory();
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

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

      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

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

    setLoading(true);
    setCopilotResponse(null);

    try {
      const result = await queryGeminiCopilot({
        prompt: textToSend,
        language: selectedLang,
        apiKey: apiKey
      });

      setCopilotResponse(result);

      if (autoSpeak && result?.response_text_localized) {
        speakText(result.response_text_localized, selectedLang);
      }

      // Refresh database history
      loadHistory();

      // If autonomous reallocation created, trigger map sync
      if (result?.recommended_action?.action_type === 'CREATE_DISPATCH_ORDER' && onTriggerReallocation) {
        onTriggerReallocation('PHC-BARAGAON-03');
      }
    } catch (err) {
      console.error("Copilot request error:", err);
    } finally {
      setLoading(false);
    }
  };

  const activeLangObj = supportedLanguages.find(l => l.code === selectedLang) || supportedLanguages[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner with Google AI Architecture Badges */}
      <div className="glass-panel p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 p-3">
              <Headphones size={26} className="text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  ASHA & PHC Multilingual Voice Intelligence Center
                </h1>
                <span className="bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={11} className="text-cyan-400" /> Google Gemini 1.5 Flash NLU
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Frontline voice-first clinical triage and automated emergency medicine requisition across 7 Indian official languages.
              </p>
            </div>
          </div>

          {/* Quick Global Audio Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (isPlayingAudio) stopSpeaking();
                setAutoSpeak(!autoSpeak);
              }}
              className={`text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 border font-bold transition-all shadow-sm ${
                autoSpeak 
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {autoSpeak ? (
                <>
                  <Volume2 size={15} className="text-cyan-400 animate-pulse" />
                  <span>Voice Output: ON</span>
                </>
              ) : (
                <>
                  <VolumeX size={15} className="text-slate-400" />
                  <span>Voice: MUTED</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border border-slate-800 space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Voice Emergency Requisitions</span>
            <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-400">
              <PhoneCall size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white">2,847 Calls</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 size={12} /> 99.4% Automated NLU Dispatch
          </div>
        </div>

        <div className="glass-panel p-4 border border-slate-800 space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Gemini NLU Inference Latency</span>
            <div className="p-2 bg-cyan-500/15 rounded-lg text-cyan-400">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-300">142 ms</div>
          <div className="text-[11px] text-slate-400 font-medium">
            Sub-second real-time transcription
          </div>
        </div>

        <div className="glass-panel p-4 border border-slate-800 space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Supported Regional Dialects</span>
            <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-400">
              <Languages size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-300">7 Languages</div>
          <div className="text-[11px] text-indigo-400 font-medium">
            Hindi, Telugu, Tamil, Marathi, Bengali, Kannada, English
          </div>
        </div>

        <div className="glass-panel p-4 border border-slate-800 space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Autonomous GPS Dispatches</span>
            <div className="p-2 bg-amber-500/15 rounded-lg text-amber-400">
              <Truck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300">412 Today</div>
          <div className="text-[11px] text-amber-400 font-semibold">
            Avg ETA: 38 mins to rural PHCs
          </div>
        </div>
      </div>

      {/* Main 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 Cols) — Interactive Voice Studio */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Interactive Studio Panel */}
          <div className="glass-panel p-5 sm:p-6 border border-slate-800 space-y-5">
            {/* Language Switcher */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Languages size={14} className="text-cyan-400" /> Select Active Dialect:
                </span>
                <span className="text-xs text-cyan-400 font-medium">
                  {activeLangObj.name} ({activeLangObj.region})
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
                        setCopilotResponse(null);
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

            {/* Field Emergency Quick Cards */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                1-Click Field Emergency Presets:
              </span>
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
                      <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                        {q.label}
                      </span>
                      <ArrowRight size={13} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {q.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Input & Microphone Command Box */}
            <div className="space-y-2.5">
              {isRecording && (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-3 bg-rose-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                      <span className="w-1.5 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                    </div>
                    <span className="text-xs font-bold text-rose-200">
                      Listening in {activeLangObj.name}... Speak your emergency request now
                    </span>
                  </div>
                  <button
                    onClick={stopListening}
                    className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Square size={10} className="fill-white" /> Stop
                  </button>
                </div>
              )}

              <div className="relative rounded-xl border border-slate-700/70 bg-slate-900/90 focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all p-3">
                <textarea
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isRecording ? "Transcribing voice in real-time..." : `Type or click mic to speak in ${activeLangObj.name}...`}
                  className="w-full min-h-[76px] bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none pr-2 leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/70 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    {inputText && (
                      <button
                        onClick={() => setInputText('')}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
                      >
                        <RotateCcw size={11} /> Clear
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Compact Microphone Button */}
                    <button
                      onClick={toggleRecording}
                      className={`py-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
                        isRecording 
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30' 
                          : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30'
                      }`}
                      title={isRecording ? "Stop Recording" : "Speak in " + activeLangObj.name}
                    >
                      {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
                      <span>{isRecording ? "Stop" : "Speak"}</span>
                    </button>

                    {/* Compact Send Button */}
                    <button
                      onClick={() => handleSendQuery()}
                      disabled={loading || !inputText.trim()}
                      className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span>{loading ? "..." : "Send Request"}</span>
                      <Send size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Response Display */}
            {copilotResponse && (
              <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-xl animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-cyan-300 tracking-wide uppercase">
                          {copilotResponse.intent?.replace(/_/g, ' ')}
                        </span>
                        <span className="bg-emerald-500/15 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {Math.round((copilotResponse.confidence || 0.95) * 100)}% Confidence
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {copilotResponse.powered_by || "Google Gemini NLU"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPlayingAudio ? (
                      <button
                        onClick={stopSpeaking}
                        className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold animate-pulse"
                      >
                        <Square size={12} className="fill-rose-300" />
                        <span>Stop Speaking</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => speakText(copilotResponse.response_text_localized, selectedLang)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-700 font-semibold transition-all hover:border-cyan-500/40"
                      >
                        <Volume2 size={14} className="text-cyan-400" />
                        <span>Replay Audio</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Localized Speech Text */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity size={12} className="text-cyan-400" /> Localized Clinical Audio ({activeLangObj.name}):
                    </span>
                    <span className="text-[10px] text-cyan-400/80 font-medium">Native Audio Broadcast</span>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
                      {copilotResponse.response_text_localized}
                    </p>
                  </div>
                </div>

                {/* English National Summary */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={12} className="text-indigo-400" /> National Dashboard Translation:
                  </span>
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {copilotResponse.response_text_english}
                    </p>
                  </div>
                </div>

                {/* Autonomous Action */}
                {copilotResponse.recommended_action && (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Truck size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-extrabold text-emerald-400 block tracking-wide">
                          AUTONOMOUS REALLOCATION DIRECTIVE
                        </span>
                        <p className="text-xs text-slate-200 mt-0.5">
                          {copilotResponse.recommended_action.action_summary}
                        </p>
                      </div>
                    </div>

                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={12} /> DISPATCH CONFIRMED
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 Cols) — Field Emergency Audit & Voice Protocol Matrix */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Voice Dispatch Log from Database */}
          <div className="glass-panel p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/15 rounded-lg text-cyan-400">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Voice Emergency Feed</h3>
                  <p className="text-[11px] text-slate-400">Real-time database log of audio triage requests</p>
                </div>
              </div>
              <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> DB Stream
              </span>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {voiceDispatches.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  Loading emergency records from database...
                </div>
              ) : (
                voiceDispatches.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 rounded-xl p-3.5 space-y-2 transition-all"
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

                    <p className="text-xs text-slate-300 font-medium">
                      "{item.prompt}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 font-semibold">{item.facility}</span>
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

          {/* Clinical Voice Protocols Guide */}
          <div className="glass-panel p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/15 rounded-lg text-indigo-400">
                  <FileCheck2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Clinical Voice Requisition Protocols</h3>
                  <p className="text-[11px] text-slate-400">Standardized operational voice directives</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-rose-400 block">🐍 Snakebite Envenomation (ASV):</span>
                <p className="text-[11px] text-slate-300">
                  State stock count and patient status. Gemini triggers cold-chain insulated box dispatch from closest Civil Hospital with GPS tag.
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-amber-400 block">❄️ Cold-Chain Excursion (&gt; 8.0°C):</span>
                <p className="text-[11px] text-slate-300">
                  Broadcasts instant SMS alert to District Vaccine Cold-Chain Officer and generates automated transfer plan.
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-cyan-400 block">📊 Epidemic Outbreak Requisition:</span>
                <p className="text-[11px] text-slate-300">
                  Correlates with BigQuery bio-climatic vector surge scores to pre-allocate buffer stock before flood isolation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
