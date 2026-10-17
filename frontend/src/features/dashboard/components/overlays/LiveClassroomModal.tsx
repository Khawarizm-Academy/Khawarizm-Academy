import React, { useState } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  MessageSquare,
  Users,
  User,
  X,
  Send,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/authContext';

interface LiveClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The course the learner joined; the chamber never invents one. */
  courseTitle: string;
  /** The course instructor, possibly empty when the course carries none. */
  instructorName: string;
  /** Live headcount from the API; no count is shown when it is unknown. */
  attendanceCount?: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isInstructor?: boolean;
}

/** Blackboard code lines the instructor shares (empty until a course provides them). */
const CODE_LINES: Array<{ tone: string; indent: number; text: string }> = [];

/** Bubble + sender tones by chat role. */
const CHAT_TONE = {
  instructor: { bubble: 'bg-navy-950/80 border border-blue-400/40', sender: 'text-sky-300' },
  student: { bubble: 'bg-navy-800/80 border border-navy-600/40', sender: 'text-slate-300' },
} as const;

/** Shared states for the mic / video toggles, plus the gold hand-raise pill. */
const MEDIA_ON = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50';
const MEDIA_OFF = 'bg-navy-800 text-slate-400 hover:text-slate-200';
const HAND_ON = 'bg-gold-400 text-navy-900 shadow-[0_0_12px_rgba(229,182,92,0.4)]';
const HAND_OFF = 'bg-navy-800 text-slate-300 hover:bg-slate-700';

/** Syntax tones and physical indents for the blackboard code block. */
const CODE_TONE: Record<string, string> = {
  muted: 'text-slate-400 text-xs',
  keyword: 'text-blue-400 font-bold',
  plain: 'text-slate-300',
  gold: 'text-gold-400',
  ok: 'text-emerald-400',
  bad: 'text-red-400',
};
const CODE_INDENT = ['', 'pr-4', 'pr-8'];

export const LiveClassroomModal: React.FC<LiveClassroomModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  instructorName,
  attendanceCount,
}) => {
  const { user } = useAuth();
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: `${user?.fullName ?? ''} (أنت)`,
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
  };

  return (
    <div dir="rtl" className="dash-modal-overlay">
      <div className="dash-modal-shell max-w-5xl">
        {/* Classroom header */}
        <div className="dash-modal-head">
          <div className="dash-modal-lead">
            <div className="dash-modal-icon dash-modal-icon-red">
              <Radio size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-400 font-bold text-xs font-mono uppercase">LIVE</span>
                <h2 className="dash-modal-title">{courseTitle}</h2>
              </div>
              <span className="dash-modal-sub">
                المحاضر: {instructorName}
                {attendanceCount !== undefined && ` • الحضور: ${attendanceCount} طالباً`}
              </span>
            </div>
          </div>

          <button type="button" onClick={onClose} className="dash-modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Classroom body */}
        <div className="dash-modal-body">
          {/* Live stage */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col justify-between gap-4 border-b lg:border-b-0 lg:border-l border-navy-600/60 bg-navy-950">
            {/* Main stage screen: code / blackboard simulation */}
            <div className="w-full aspect-video bg-navy-950 rounded-2xl border border-navy-600/80 p-4 md:p-6 relative overflow-hidden flex flex-col justify-between shadow-inner">
              {/* Teacher camera pip */}
              <div className="absolute top-4 left-4 size-24 md:size-32 rounded-xl bg-navy-900 border border-blue-400/50 overflow-hidden shadow-lg z-20 flex flex-col justify-between p-2">
                <div className="flex justify-between items-center text-[10px] text-slate-300 font-bold">
                  <span>{instructorName}</span>
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="size-10 rounded-full bg-navy-600/80 self-center flex items-center justify-center text-sky-300">
                  <User size={18} />
                </div>
                <span className="text-[9px] text-slate-400 text-center font-mono">1080p 60fps</span>
              </div>

              {/* Code presentation on blackboard, or its empty placeholder */}
              <div className="text-right font-mono text-xs md:text-sm text-slate-300 space-y-2 relative z-10">
                {CODE_LINES.length === 0 ? (
                  <span className="text-slate-500">لا يوجد محتوى معروض على السبورة حالياً.</span>
                ) : (
                  CODE_LINES.map((line, idx) => (
                    <div key={idx} className={`${CODE_TONE[line.tone]} ${CODE_INDENT[line.indent]}`}>
                      {line.text}
                    </div>
                  ))
                )}
              </div>

              {/* Live status indicator */}
              <div className="flex justify-between items-center text-xs text-slate-400 z-10 pt-4 border-t border-navy-600/40">
                <span className="text-gold-400 font-bold">مشاركة الشاشة الحية للمحاضر</span>
                <span className="font-mono text-slate-500">Buffer: 0.1s • Latency: 24ms</span>
              </div>
            </div>

            {/* Stage controls */}
            <div className="flex justify-center items-center gap-3 py-2">
              <button
                type="button"
                onClick={() => setIsMicOn(!isMicOn)}
                className={`dash-ctrl dash-ctrl-round ${isMicOn ? MEDIA_ON : MEDIA_OFF}`}
                title={isMicOn ? 'كتم المايكروفون' : 'تشغيل المايكروفون'}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`dash-ctrl dash-ctrl-round ${isVideoOn ? MEDIA_ON : MEDIA_OFF}`}
                title={isVideoOn ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
              >
                {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setIsHandRaised(!isHandRaised)}
                className={`dash-ctrl dash-ctrl-pill ${isHandRaised ? HAND_ON : HAND_OFF}`}
              >
                <Hand size={16} />
                <span>{isHandRaised ? 'اليد مرفوعة' : 'رفع اليد للسؤال'}</span>
              </button>
            </div>
          </div>

          {/* Live chat drawer */}
          <div className="w-full lg:w-80 bg-navy-900/90 flex flex-col justify-between p-4 shrink-0">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-navy-600/40">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-sm font-display">
                  <MessageSquare size={16} className="text-blue-400" />
                  <span>المحادثة التفاعلية</span>
                </div>
                {attendanceCount !== undefined && (
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Users size={14} />
                    <span>{attendanceCount.toLocaleString('en-US')}</span>
                  </div>
                )}
              </div>

              {/* Message list, or its empty state */}
              <div className="h-64 lg:h-96 overflow-y-auto space-y-3 py-3 no-scrollbar">
                {messages.length === 0 && (
                  <p className="text-center text-slate-500 text-xs py-6">
                    لا توجد رسائل بعد. كن أول من يشارك سؤالاً.
                  </p>
                )}
                {messages.map((msg) => {
                  const tone = msg.isInstructor ? CHAT_TONE.instructor : CHAT_TONE.student;
                  return (
                    <div key={msg.id} className={`p-2.5 rounded-xl text-xs text-right ${tone.bubble}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold ${tone.sender}`}>{msg.sender}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{msg.time}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{msg.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat input */}
            <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-2 border-t border-navy-600/40">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="اكتب استفسارك للمعلم..."
                className="dash-input flex-1 py-2"
              />
              <button
                type="submit"
                className="size-8 rounded-xl bg-blue-400 hover:bg-sky-300 text-navy-900 flex items-center justify-center shrink-0 cursor-pointer transition-all"
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
