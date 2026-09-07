// src/components/public/ChatbotWidget.tsx
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatbotApi } from '@/api/services';
import { MessageCircle, X, Send, Bot, Minimize2 } from 'lucide-react';
import type { ChatbotMessage } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const QUICK_REPLIES = [
  "Qu'est-ce que le GCF ?",
  'Voir les projets',
  'Comment nous contacter',
  'Financement disponible',
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--gcf-green)' }}>
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="chatbot-typing flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: '#f0f7f0' }}>
        <span /><span /><span />
      </div>
    </div>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen]     = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput]   = useState('');
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [welcomed, setWelcomed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ✅ Charge le message d'accueil depuis la route publique (sans token)
  useEffect(() => {
    if (open && !welcomed) {
      setWelcomed(true);
      // Appel à la route publique /chatbot/settings/public
      chatbotApi.publicSettings()
        .then(r => {
          const welcome = r.data?.welcome_message
            || "Bonjour ! Je suis l'assistant GCF Madagascar. Comment puis-je vous aider ?";
          setMessages([{
            id:        'welcome',
            role:      'bot',
            text:      welcome,
            timestamp: new Date(),
          }]);
        })
        .catch(() => {
          setMessages([{
            id:        'welcome',
            role:      'bot',
            text:      "Bonjour ! Je suis l'assistant GCF Madagascar. Comment puis-je vous aider ?",
            timestamp: new Date(),
          }]);
        });
    }
  }, [open, welcomed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const mutation = useMutation({
    mutationFn: (msg: string) => chatbotApi.message(msg),
    onMutate:   () => setTyping(true),
    onSuccess:  (res) => {
      setTyping(false);
      setMessages(prev => [...prev, {
        id:        uuidv4(),
        role:      'bot',
        text:      res.data.response,
        timestamp: new Date(),
      }]);
    },
    onError: () => {
      setTyping(false);
      setMessages(prev => [...prev, {
        id:        uuidv4(),
        role:      'bot',
        text:      'Désolé, une erreur est survenue. Veuillez réessayer ou nous contacter directement.',
        timestamp: new Date(),
      }]);
    },
  });

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, {
      id:        uuidv4(),
      role:      'user',
      text:      text.trim(),
      timestamp: new Date(),
    }]);
    setInput('');
    mutation.mutate(text.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 transition-all hover:scale-110"
        style={{ background: 'var(--gcf-green)' }}
        title="Assistant GCF Madagascar"
      >
        {open
          ? <X className="w-6 h-6 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 w-80 sm:w-96 z-50 animate-fade-in"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)', borderRadius: '20px', overflow: 'hidden' }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'var(--gcf-green)' }}>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">Assistant GCF Madagascar</div>
              <div className="text-green-200 text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-300 inline-block" />
                En ligne
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="bg-white overflow-y-auto space-y-3 p-4" style={{ height: '320px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-bubble flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'bot' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--gcf-green)' }}
                  >
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className="px-4 py-2.5 rounded-2xl text-sm max-w-[80%] leading-relaxed"
                  style={{
                    background:            msg.role === 'user' ? 'var(--gcf-green)' : '#f0f7f0',
                    color:                 msg.role === 'user' ? 'white' : '#1a1a1a',
                    borderBottomLeftRadius: msg.role === 'bot'  ? '4px' : '16px',
                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  }}
                >
                  {/* Rendu **bold** basique */}
                  {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i}>{part.slice(2, -2)}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>
              </div>
            ))}
            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies — affichés seulement au début */}
          {messages.length <= 2 && (
            <div className="bg-white px-4 pb-2 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
              {QUICK_REPLIES.map(reply => (
                <button
                  key={reply}
                  onClick={() => sendMessage(reply)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all hover:scale-105"
                  style={{ borderColor: 'var(--gcf-green)', color: 'var(--gcf-green)' }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="bg-white px-3 py-3 border-t border-gray-100 flex gap-2">
            <input
              className="form-input flex-1 text-sm"
              placeholder="Posez votre question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={mutation.isPending}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || mutation.isPending}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: 'var(--gcf-green)' }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}