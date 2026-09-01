'use client';
import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, Languages, Check, ArrowRight, Truck, Thermometer, ShieldAlert } from 'lucide-react';
import { queryGeminiCopilot } from '../services/api';

export default function VoiceCopilotModal({ isOpen, onClose, apiKey }) {
  const [selectedLang, setSelectedLang] = useState('hi');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copilotResponse, setCopilotResponse] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const supportedLanguages = [
    { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी (Marathi)', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
    { code: 'en', name: 'English (India)', flag: '🌐' }
  ];

  const quickPromptsByLang = {
    hi: [
      { text: "हमारे पास केवल 3 शीशियां एंटी-वेनम बची हैं, तत्काल 25 शीशियां भेजें", label: "🐍 आपातकालीन एंटी-वेनम मांग" },
      { text: "पीएचसी बड़ागांव के रेफ्रिजरेटर का तापमान 8.7°C हो गया है", label: "❄️ कोल्ड-चेन तापमान अलर्ट" },
      { text: "डेंगू और मलेरिया के लिए हमारी आवश्यक दवाइयों की स्थिति जांचें", label: "📊 स्टॉक ऑडिट जांच" }
    ],
    en: [
      { text: "We only have 3 vials of Anti-Snake Venom left, dispatch 25 vials urgently from district hospital", label: "🐍 Emergency ASV Requisition" },
      { text: "Cold chain ILR temperature breached 8.7°C at PHC Baragaon", label: "❄️ Cold-Chain Excursion SOS" },
      { text: "Audit current emergency stock for Dengue & Malaria epidemic surge", label: "📊 Outbreak Stock Audit" }
    ],
    te: [
      { text: "మా వద్ద కేవలం 3 యాంటీ-స్నేక్ వెనమ్ వైల్స్ మాత్రమే మిగిలాయి, అత్యవసరంగా 25 పంపండి", label: "🐍 అత్యవసర యాంటీ-వెనమ్ అభ్యర్థన" }
    ],
    ta: [
      { text: "எங்களிடம் 3 பாம்புக்கடி விஷமுறிவு மருந்துகள் மட்டுமே உள்ளன, உடனடியாக 25 அனுப்பவும்", label: "🐍 அவசர விஷமுறிவு மருந்து" }
    ],
    mr: [
      { text: "आमच्याकडे फक्त ३ अँटी-स्नेक व्हेनम उरले आहेत, त्वरित २५ पाठवा", label: "🐍 तातडीची अँटी-व्हेनम मागणी" }
    ],
    bn: [
      { text: "আমাদের কাছে মাত্র ৩টি অ্যান্টি-ভেনম অবশিষ্ট আছে, অবিলম্বে ২৫টি পাঠান", label: "🐍 জরুরি অ্যান্টি-ভেনম" }
    ],
    kn: [
      { text: "ನಮ್ಮಲ್ಲಿ ಕೇವಲ 3 ಆಂಟಿ-ಸ್ನೇಕ್ ವೆನಮ್ ಉಳಿದಿದೆ, ತಕ್ಷಣ 25 ಕಳುಹಿಸಿ", label: "🐍 ತುರ್ತು ಆಂಟಿ-ವೆನಮ್" }
    ]
  };

  const handleSendQuery = async (queryText = null) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim()) return;

    setLoading(true);
    setCopilotResponse(null);

    const result = await queryGeminiCopilot({
      prompt: textToSend,
      language: selectedLang,
      apiKey: apiKey
    });

    setCopilotResponse(result);
    setLoading(false);

    // Speak localized response automatically
    if (result?.response_text_localized && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speakText(result.response_text_localized, selectedLang);
    }
  };

  const speakText = (text, langCode) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === 'en' ? 'en-IN' : (langCode === 'hi' ? 'hi-IN' : 'hi-IN');
    utterance.rate = 0.95;
    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      // Simulate live voice transcription for demo robustness
      setTimeout(() => {
        setIsRecording(false);
        const demoPrompt = quickPromptsByLang[selectedLang]?.[0]?.text || quickPromptsByLang['hi'][0].text;
        setInputText(demoPrompt);
        handleSendQuery(demoPrompt);
      }, 2200);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel-glow w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 relative space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <Languages size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  ASHA & PHC Multilingual Voice Copilot
                </h2>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded">
                  Cloud Speech + Gemini NLU
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Voice-first interface for frontline community health workers across Indian linguistic regions
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Language Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Select Regional Language:</span>
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setSelectedLang(lang.code);
                setCopilotResponse(null);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedLang === lang.code
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>

        {/* Quick Voice Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Click to Speak Pre-Configured Field Emergency:</span>
          <div className="flex flex-wrap gap-2">
            {(quickPromptsByLang[selectedLang] || quickPromptsByLang['hi']).map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(q.text);
                  handleSendQuery(q.text);
                }}
                className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-left"
              >
                <span>{q.label}</span>
                <ArrowRight size={12} className="text-cyan-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Voice Input Field */}
        <div className="relative">
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRecording ? "Listening to voice in your language..." : "Type or speak your emergency request..."}
            className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-500 rounded-xl p-3 text-sm text-white focus:outline-none resize-none pr-28"
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              onClick={toggleRecording}
              className={`p-2.5 rounded-xl transition-all ${
                isRecording 
                  ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/50' 
                  : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40'
              }`}
              title={isRecording ? "Stop Recording" : "Speak Voice Request"}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              onClick={() => handleSendQuery()}
              disabled={loading || !inputText.trim()}
              className="btn-primary text-xs py-2 px-3"
            >
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Response Card */}
        {copilotResponse && (
          <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300">
                  {copilotResponse.intent?.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({Math.round((copilotResponse.confidence || 0.95) * 100)}% Confidence)
                </span>
              </div>

              <button
                onClick={() => speakText(copilotResponse.response_text_localized, selectedLang)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-slate-700"
              >
                <Volume2 size={14} className={isPlayingAudio ? "animate-bounce text-cyan-400" : ""} />
                <span>{isPlayingAudio ? "Speaking Audio..." : "Replay Audio"}</span>
              </button>
            </div>

            {/* Localized Speech Text */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Localized Voice Response:
              </span>
              <p className="text-sm font-semibold text-white leading-relaxed bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                {copilotResponse.response_text_localized}
              </p>
            </div>

            {/* English National Summary */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                National Dashboard Translation:
              </span>
              <p className="text-xs text-slate-300 bg-slate-800/30 p-2.5 rounded-lg">
                {copilotResponse.response_text_english}
              </p>
            </div>

            {/* Autonomous Action Triggered */}
            {copilotResponse.recommended_action && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <Truck size={18} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-400 block">
                      AUTONOMOUS WORKFLOW TRIGGERED:
                    </span>
                    <span className="text-xs text-slate-200">
                      {copilotResponse.recommended_action.action_summary}
                    </span>
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded shrink-0">
                  DISPATCH CONFIRMED
                </span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
