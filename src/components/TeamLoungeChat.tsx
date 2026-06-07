import React, { useState, useEffect, useRef } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, X, Users, MessageCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TeamLoungeChat: React.FC = () => {
  const { activeProject, chatMessages, sendChatMessage, onlineUsers } = useProjects();
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on load / message count changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  // Keep track of unread messages when closed
  useEffect(() => {
    if (!isOpen && chatMessages.length > 0) {
      setUnreadCount(prev => prev + 1);
    }
  }, [chatMessages.length]);

  // Reset unread count when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  if (!activeProject) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const ok = await sendChatMessage(typedMessage);
    if (ok) {
      setTypedMessage('');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      {/* Floating Toggle Lounge Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-slate-950 px-4 py-3 rounded-2xl shadow-lg hover:shadow-indigo-500/20 shadow-xl border border-indigo-400/20 flex items-center gap-2 font-bold text-xs cursor-pointer tracking-wider uppercase font-semibold h-11"
        id="team-lounge-toggle"
      >
        <MessageCircle className="h-4 w-4 text-slate-950 shrink-0" />
        <span>Team Lounge</span>
        
        {/* Unread badge indicator */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-mono font-bold text-[9px] rounded-full h-5 min-w-5 flex items-center justify-center border border-[#020617] px-1 animate-bounce">
            {unreadCount}
          </span>
        )}
      </motion.button>

      {/* Floating Side Chat Panel drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.92 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            className="absolute bottom-16 right-0 w-88 h-128 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left"
            id="team-lounge-drawer"
          >
            {/* Header section */}
            <div className="p-4 bg-[#0a1128]/40 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">Project Lounge Chat</h4>
                  <p className="text-[9px] text-slate-400 font-medium">Talk with group in real-time</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick status channel header */}
            <div className="px-4 py-2 bg-slate-950/40 border-b border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-medium font-mono">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>active session channel</span>
              </span>
              <span>{onlineUsers.length} collaborator(s) online</span>
            </div>

            {/* Chat message listing scroll feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0a1128]/10">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <div className="h-8 w-8 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-slate-500">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-300">Workspace Lounge is empty</h5>
                    <p className="text-[9.5px] text-slate-500 mt-0.5 leading-relaxed">
                      Say hello to your project teammates! Any message sent here triggers instant desktop WebSocket sync.
                    </p>
                  </div>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.userId === user?.id;
                  const senderName = msg.user?.name || 'Teammate';
                  const senderRole = msg.user?.role || 'Member';
                  const senderPic = msg.user?.profilePicture;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse text-right' : ''}`}
                    >
                      {/* Avatar */}
                      {senderPic ? (
                        <img
                          src={senderPic}
                          alt={senderName}
                          referrerPolicy="no-referrer"
                          className="h-7 w-7 rounded-full object-cover border border-white/10 bg-slate-800"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-indigo-400">
                            {senderName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Content block */}
                      <div className="space-y-1">
                        {/* Meta header */}
                        <div className={`flex items-center gap-1.5 text-[9px] ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-slate-300 font-bold">{senderName}</span>
                          <span className="px-1 py-0.2 px-1.5 bg-white/5 border border-white/5 rounded text-slate-500 font-bold text-[7.5px] uppercase">
                            {senderRole}
                          </span>
                          <span className="text-slate-600 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Balloon body message */}
                        <div
                          className={`p-2.5 rounded-xl text-xs leading-relaxed break-words whitespace-pre-wrap ${
                            isMe
                              ? 'bg-indigo-600/25 text-indigo-100 border border-indigo-500/20 rounded-tr-none text-left'
                              : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message composer input bar */}
            <form onSubmit={handleSend} className="p-3 bg-slate-950/80 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                placeholder="Write message..."
                value={typedMessage}
                onChange={e => setTypedMessage(e.target.value)}
                className="flex-1 bg-slate-900 border border-white/10 hover:border-white/15 focus:border-indigo-500/80 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                disabled={!typedMessage.trim()}
                className="h-7.5 w-7.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 disabled:hover:bg-indigo-500 text-slate-950 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
