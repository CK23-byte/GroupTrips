import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Pin,
  Bell,
  AlertTriangle,
  Info,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { TripMessage } from '../types';

interface MessagesPanelProps {
  messages: TripMessage[];
  tripId: string;
  isAdmin: boolean;
  onRefresh: () => void;
}

export default function MessagesPanel({
  messages,
  tripId,
  isAdmin,
  onRefresh,
}: MessagesPanelProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<TripMessage['type']>('update');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reverse messages for display (newest at bottom)
  const sortedMessages = [...messages].reverse();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);

    await supabase.from('trip_messages').insert({
      trip_id: tripId,
      sender_id: user.id,
      content: newMessage.trim(),
      type: isAdmin ? messageType : 'update',
      is_pinned: false,
    });

    setNewMessage('');
    setSending(false);
    onRefresh();
  }

  async function togglePin(messageId: string, currentPinned: boolean) {
    await supabase
      .from('trip_messages')
      .update({ is_pinned: !currentPinned })
      .eq('id', messageId);
    onRefresh();
  }

  const typeConfig: Record<
    TripMessage['type'],
    { icon: React.ReactNode; color: string; label: string }
  > = {
    announcement: {
      icon: <Bell className="w-4 h-4" />,
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      label: 'Aankondiging',
    },
    update: {
      icon: <Info className="w-4 h-4" />,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      label: 'Update',
    },
    reminder: {
      icon: <Bell className="w-4 h-4" />,
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      label: 'Herinnering',
    },
    alert: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      label: 'Alert',
    },
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {sortedMessages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">Nog geen berichten</p>
          </div>
        ) : (
          sortedMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              isAdmin={isAdmin}
              typeConfig={typeConfig[message.type]}
              onTogglePin={() => togglePin(message.id, message.is_pinned)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="card p-4">
        {isAdmin && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {(Object.keys(typeConfig) as TripMessage['type'][]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMessageType(type)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  messageType === type
                    ? typeConfig[type].color
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {typeConfig[type].icon}
                {typeConfig[type].label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Typ een bericht..."
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="btn-primary px-4 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
  isAdmin,
  typeConfig,
  onTogglePin,
}: {
  message: TripMessage;
  isOwn: boolean;
  isAdmin: boolean;
  typeConfig: { icon: React.ReactNode; color: string; label: string };
  onTogglePin: () => void;
}) {
  const time = new Date(message.created_at);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] ${
          isOwn ? 'order-2' : 'order-1'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center gap-2 mb-1 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}
        >
          {!isOwn && (
            <span className="text-sm font-medium">{message.sender?.name}</span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${typeConfig.color}`}
          >
            {typeConfig.icon}
            {typeConfig.label}
          </span>
        </div>

        {/* Message */}
        <div
          className={`card p-4 ${
            isOwn
              ? 'bg-blue-500/20 border-blue-500/30'
              : 'bg-white/10 border-white/20'
          } ${message.is_pinned ? 'ring-2 ring-yellow-500/50' : ''}`}
        >
          {message.is_pinned && (
            <div className="flex items-center gap-1 text-yellow-400 text-xs mb-2">
              <Pin className="w-3 h-3" />
              Vastgepind
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center gap-2 mt-1 text-xs text-white/40 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>
            {time.toLocaleTimeString('nl-NL', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isAdmin && (
            <button
              onClick={onTogglePin}
              className={`hover:text-yellow-400 transition-colors ${
                message.is_pinned ? 'text-yellow-400' : ''
              }`}
            >
              <Pin className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
