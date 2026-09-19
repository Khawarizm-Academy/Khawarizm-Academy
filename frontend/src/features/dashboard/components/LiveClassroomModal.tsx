import React, { useState } from 'react';
import { Radio, Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Users, X, Send } from 'lucide-react';

interface LiveClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
  instructorName?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isInstructor?: boolean;
}

const initialMessages: ChatMessage[] = [
  { id: 'm1', sender: 'م. خالد الشمري', text: 'أهلاً بكم جميعاً في حصة اليوم! سنركز على الدوال المتقدمة واستدعاء الخوارزميات.', time: '18:02', isInstructor: true },
  { id: 'm2', sender: 'سارة العتيبي', text: 'السلام عليكم يا مهندس، هل سيتم رفع ملفات الشرح بعد انتهاء البث؟', time: '18:04' },
  { id: 'm3', sender: 'م. خالد الشمري', text: 'نعم يا سارة، جميع الأكواد والشروحات ستكون متاحة فوراً في لوحتكم.', time: '18:05', isInstructor: true },
  { id: 'm4', sender: 'فهد القحطاني', text: 'الكود المنشور يعمل بنجاح مع التعقيد الزمني O(n). شكراً جزيلاً!', time: '18:07' },
];

export const LiveClassroomModal: React.FC<LiveClassroomModalProps> = ({
  isOpen,
  onClose,
  courseTitle = 'برمجة بايثون للمبتدئين',
  instructorName = 'م. خالد الشمري',
}) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState('');

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: 'أحمد الغامدي (أنت)',
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="w-full max-w-5xl bg-slate-900 border border-blue-900/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Classroom Header */}
        <div className="px-6 py-4 border-b border-blue-900/60 bg-blue-950/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <Radio size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-400 font-bold text-xs font-mono uppercase">LIVE</span>
                <h2 className="text-slate-100 font-bold font-['Cairo'] text-base md:text-lg">
                  {courseTitle}
                </h2>
              </div>
              <span className="text-slate-400 text-xs font-['Tajawal']">
                المحاضر: {instructorName} • الحضور: 84 طالباً
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Classroom Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Live Stage */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col justify-between gap-4 border-b lg:border-b-0 lg:border-l border-blue-900/60 bg-slate-950">
            {/* Main Stage Screen: Interactive Code / Blackboard simulation */}
            <div className="w-full aspect-video bg-[#040D1E] rounded-2xl border border-blue-900/80 p-4 md:p-6 relative overflow-hidden flex flex-col justify-between shadow-inner">
              {/* Teacher camera pip */}
              <div className="absolute top-4 left-4 size-24 md:size-32 rounded-xl bg-slate-900 border border-sky-400/50 overflow-hidden shadow-lg z-20 flex flex-col justify-between p-2">
                <div className="flex justify-between items-center text-[10px] text-slate-300 font-bold font-['Tajawal']">
                  <span>{instructorName}</span>
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="size-10 rounded-full bg-blue-900/80 self-center flex items-center justify-center text-sky-300 text-xs font-bold">
                  م.خ
                </div>
                <span className="text-[9px] text-slate-400 text-center font-mono">1080p 60fps</span>
              </div>

              {/* Code Presentation on blackboard */}
              <div className="text-right font-mono text-xs md:text-sm text-slate-300 space-y-2 relative z-10">
                <div className="text-slate-400 text-xs">// خوارزمية البحث الثنائي المحسنة - بايثون 3.12</div>
                <div className="text-sky-400 font-bold">def binary_search(arr, target):</div>
                <div className="text-slate-300 pr-4">left, right = 0, len(arr) - 1</div>
                <div className="text-amber-300 pr-4">while left &lt;= right:</div>
                <div className="text-slate-300 pr-8">mid = (left + right) // 2</div>
                <div className="text-emerald-400 pr-8">if arr[mid] == target: return mid</div>
                <div className="text-slate-300 pr-8">elif arr[mid] &lt; target: left = mid + 1</div>
                <div className="text-slate-300 pr-8">else: right = mid - 1</div>
                <div className="text-red-400 pr-4">return -1</div>
              </div>

              {/* Live Status indicator */}
              <div className="flex justify-between items-center text-xs text-slate-400 z-10 pt-4 border-t border-blue-900/40">
                <span className="text-[#E5B65C] font-bold font-['Tajawal']">
                  مشاركة الشاشة الحية للمحاضر
                </span>
                <span className="font-mono text-slate-500">Buffer: 0.1s • Latency: 24ms</span>
              </div>
            </div>

            {/* Stage Controls */}
            <div className="flex justify-center items-center gap-3 py-2">
              <button
                type="button"
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-3 rounded-full transition-all cursor-pointer ${
                  isMicOn
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={isMicOn ? 'كتم المايكروفون' : 'تشغيل المايكروفون'}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`p-3 rounded-full transition-all cursor-pointer ${
                  isVideoOn
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={isVideoOn ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
              >
                {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setIsHandRaised(!isHandRaised)}
                className={`px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-bold font-['Tajawal'] transition-all cursor-pointer ${
                  isHandRaised
                    ? 'bg-[#E5B65C] text-slate-900 shadow-[0_0_12px_rgba(229,182,92,0.4)]'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Hand size={16} />
                <span>{isHandRaised ? 'اليد مرفوعة ✋' : 'رفع اليد للسؤال'}</span>
              </button>
            </div>
          </div>

          {/* Live Chat Drawer */}
          <div className="w-full lg:w-80 bg-slate-900/90 flex flex-col justify-between p-4 shrink-0">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-sm font-['Cairo']">
                  <MessageSquare size={16} className="text-sky-400" />
                  <span>المحادثة التفاعلية</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs font-['Tajawal']">
                  <Users size={14} />
                  <span>84</span>
                </div>
              </div>

              {/* Message List */}
              <div className="h-64 lg:h-96 overflow-y-auto space-y-3 py-3 no-scrollbar">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl text-xs font-['Tajawal'] text-right ${
                      msg.isInstructor
                        ? 'bg-blue-950/80 border border-sky-400/40'
                        : 'bg-slate-800/80 border border-blue-900/40'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold ${msg.isInstructor ? 'text-sky-300' : 'text-slate-300'}`}>
                        {msg.sender}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{msg.time}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-2 border-t border-blue-900/40">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="اكتب استفسارك للمعلم..."
                className="flex-1 bg-slate-950 border border-blue-900/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-sky-400 transition-colors"
              />
              <button
                type="submit"
                className="size-8 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-900 flex items-center justify-center shrink-0 cursor-pointer transition-all"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
