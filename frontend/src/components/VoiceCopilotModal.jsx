'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mic, MicOff, Volume2, VolumeX, Sparkles, Languages,
  ArrowRight, Truck, Radio, Square, RotateCcw, Send, CheckCircle2,
  Clock, ShieldAlert, Cpu, Activity
} from 'lucide-react';
import { queryGeminiCopilot } from '../services/api';

export default function VoiceCopilotModal({ isOpen, onClose, apiKey }) {
  const [selectedLang, setSelectedLang] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copilotResponse, setCopilotResponse] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const recognitionRef = useRef(null);

  const supportedLanguages = [
    { code: 'hi', bcp47: 'hi-IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
    { code: 'te', bcp47: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'ta', bcp47: 'ta-IN', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'mr', bcp47: 'mr-IN', name: 'मराठी (Marathi)', flag: '🇮🇳' },
    { code: 'bn', bcp47: 'bn-IN', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
    { code: 'kn', bcp47: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
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
    ]
  };

  useEffect(() => {
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
    } catch (err) {
      console.error("Copilot request error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeLangObj = supportedLanguages.find(l => l.code === selectedLang) || supportedLanguages[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel-glow w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 relative space-y-6 rounded-3xl border border-slate-700/60 bg-slate-950/95 shadow-2xl shadow-cyan-950/40 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Languages size={22} className="text-white" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-slate-950"></span>
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  ASHA Multilingual Voice Copilot
                </h2>
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  <Sparkles size={11} className="text-cyan-400" /> Google Gemini NLU
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Voice-first clinical assistance & emergency supply dispatch for frontline community workers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Audio Toggle Pill */}
            <button
              onClick={() => {
                if (isPlayingAudio) stopSpeaking();
                setAutoSpeak(!autoSpeak);
              }}
              className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 border font-semibold transition-all shadow-sm ${autoSpeak
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              title={autoSpeak ? "Voice Output is Enabled (Click to Mute)" : "Voice Output is Muted (Click to Enable)"}
            >
              {autoSpeak ? (
                <>
                  <Volume2 size={14} className="text-cyan-400 animate-pulse" />
                  <span>Voice: ON</span>
                </>
              ) : (
                <>
                  <VolumeX size={14} className="text-slate-400" />
                  <span>Muted</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800/80 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Regional Language Switcher */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Languages size={13} className="text-cyan-400" /> Regional Language:
            </span>
            <span className="text-[11px] text-cyan-400 font-medium">
              Listening in {activeLangObj.name}
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
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-md shadow-cyan-500/25 scale-[1.02]'
                      : 'bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fast Action Emergency Prompt Chips */}
        <div className="space-y-2">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Quick Emergency Dispatch Prompts:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(quickPromptsByLang[selectedLang] || quickPromptsByLang['hi']).map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(q.text);
                }}
                className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 p-3 rounded-2xl flex flex-col justify-between text-left transition-all hover:shadow-lg hover:shadow-cyan-500/10"
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

        {/* Smart Input & Microphone Dock */}
        <div className="space-y-2.5">
          {isRecording && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-rose-500/15 border border-rose-500/40 rounded-2xl animate-pulse">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-4 bg-rose-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-1.5 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                </div>
                <span className="text-xs font-bold text-rose-200">
                  Listening in {activeLangObj.name}... Speak your emergency request now
                </span>
              </div>
              <button
                onClick={stopListening}
                className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-500/30 transition-all"
              >
                <Square size={11} className="fill-white" /> Stop
              </button>
            </div>
          )}

          <div className="relative rounded-xl border border-slate-700/70 bg-slate-900/90 focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all overflow-hidden p-3">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? "Transcribing speech in real-time..." : `Type or click mic to speak in ${activeLangObj.name}...`}
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

        {/* AI Copilot Response Display */}
        {copilotResponse && (
          <div className="bg-slate-900/90 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl shadow-cyan-950/50 animate-fadeIn">
            {/* Header: Intent & Audio Controls */}
            <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-800/80 gap-3">
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
                    {copilotResponse.powered_by || "Google Gemini AI"}
                  </span>
                </div>
              </div>

              {/* Audio Playback Dock */}
              <div className="flex items-center gap-2">
                {isPlayingAudio ? (
                  <button
                    onClick={stopSpeaking}
                    className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2 font-bold animate-pulse shadow-md transition-all"
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce"></span>
                      <span className="w-1 h-4 bg-rose-300 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                      <span className="w-1 h-2.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                    </div>
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

            {/* Localized Native Script Audio Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={12} className="text-cyan-400" /> Localized Audio Response ({activeLangObj.name}):
                </span>
                <span className="text-[10px] text-cyan-400/80 font-medium">Native Clinical Voice</span>
              </div>
              <div className="bg-gradient-to-r from-slate-900 to-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-inner">
                <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
                  {copilotResponse.response_text_localized}
                </p>
              </div>
            </div>

            {/* National Command Summary (English) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={12} className="text-indigo-400" /> National Dashboard Translation:
              </span>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {copilotResponse.response_text_english}
                </p>
              </div>
            </div>

            {/* Autonomous Dispatch & Actions Workflow */}
            {copilotResponse.recommended_action && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-emerald-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Truck size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-emerald-400 block tracking-wide">
                      AUTONOMOUS SUPPLY CHAIN DISPATCH INITIATED
                    </span>
                    <p className="text-xs text-slate-200 mt-0.5">
                      {copilotResponse.recommended_action.action_summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                    <CheckCircle2 size={12} /> DISPATCH CONFIRMED
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
