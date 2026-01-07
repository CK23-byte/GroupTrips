import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Pin,
  MessageSquare,
  Image,
  X,
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
  const [sending, setSending] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reverse messages for display (newest at bottom)
  const sortedMessages = [...messages].reverse();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
    }
  }

  function clearMedia() {
    setMediaFile(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!newMessage.trim() && !mediaFile) || !user) return;

    setSending(true);

    let mediaUrl: string | null = null;

    // Upload media if present
    if (mediaFile) {
      const fileExt = mediaFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${tripId}/chat/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('trip-media')
        .upload(fileName, mediaFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('trip-media')
          .getPublicUrl(fileName);
        mediaUrl = publicUrl;
      }
    }

    await supabase.from('trip_messages').insert({
      trip_id: tripId,
      sender_id: user.id,
      content: newMessage.trim() || (mediaUrl ? '📷' : ''),
      type: 'update',
      is_pinned: false,
      media_url: mediaUrl,
    });

    setNewMessage('');
    clearMedia();
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

  return (
    <div className="flex flex-col h-[500px] sm:h-[600px]">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 mb-4 px-1">
        {sortedMessages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No messages yet</p>
            <p className="text-white/30 text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          sortedMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              isAdmin={isAdmin}
              onTogglePin={() => togglePin(message.id, message.is_pinned)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="card p-3 sm:p-4">
        {/* Media Preview */}
        {mediaPreview && (
          <div className="mb-3 relative inline-block">
            <img
              src={mediaPreview}
              alt="Preview"
              className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={clearMedia}
              className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary px-2 sm:px-3 flex-shrink-0"
            title="Add photo/video"
          >
            <Image className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-field flex-1 min-w-0"
          />
          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && !mediaFile)}
            className="btn-primary px-3 sm:px-4 disabled:opacity-50 flex-shrink-0"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
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
  onTogglePin,
}: {
  message: TripMessage & { media_url?: string };
  isOwn: boolean;
  isAdmin: boolean;
  onTogglePin: () => void;
}) {
  const time = new Date(message.created_at);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[80%] ${
          isOwn ? 'order-2' : 'order-1'
        }`}
      >
        {/* Header */}
        {!isOwn && (
          <div className="mb-1">
            <span className="text-sm font-medium">{message.sender?.name}</span>
          </div>
        )}

        {/* Message */}
        <div
          className={`card p-2.5 sm:p-3 ${
            isOwn
              ? 'bg-blue-500/20 border-blue-500/30'
              : 'bg-white/10 border-white/20'
          } ${message.is_pinned ? 'ring-2 ring-yellow-500/50' : ''}`}
        >
          {message.is_pinned && (
            <div className="flex items-center gap-1 text-yellow-400 text-xs mb-2">
              <Pin className="w-3 h-3" />
              Pinned
            </div>
          )}

          {/* Media content */}
          {message.media_url && (
            <div className="mb-2">
              {message.media_url.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  src={message.media_url}
                  controls
                  className="max-w-full rounded-lg max-h-48 sm:max-h-64"
                />
              ) : (
                <img
                  src={message.media_url}
                  alt=""
                  className="max-w-full rounded-lg max-h-48 sm:max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(message.media_url, '_blank')}
                />
              )}
            </div>
          )}

          {/* Text content - only show if not just emoji */}
          {message.content && message.content !== '📷' && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center gap-2 mt-1 text-xs text-white/40 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>
            {time.toLocaleTimeString('en-US', {
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
