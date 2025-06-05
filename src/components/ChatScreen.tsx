
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Send, Images, Eye } from 'lucide-react';

const ChatScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hey! I loved reading about your perfect Sunday. Coffee shops are the best for reading! 📚",
      sender: 'them',
      timestamp: new Date(Date.now() - 10 * 60 * 1000)
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [canSend, setCanSend] = useState(true);
  const [messageCount] = useState(15); // Simulate message count
  const [photoRequestSent, setPhotoRequestSent] = useState(false);
  const [photosRevealed, setPhotosRevealed] = useState(false);

  const conversationStarters = [
    "What's the last book that really moved you?",
    "If you could have coffee with anyone, who would it be?",
    "What's a small thing that made you smile today?",
    "Do you have a favorite spot in Bangalore?",
    "What's your go-to comfort food when you're feeling down?",
    "If you could travel anywhere right now, where would you go?",
    "What's a hobby you've always wanted to try?",
    "What song always puts you in a good mood?",
    "What's the best advice someone has given you recently?"
  ];

  const handleSendMessage = () => {
    if (!newMessage.trim() || !canSend) return;
    
    const message = {
      id: messages.length + 1,
      text: newMessage,
      sender: 'me' as const,
      timestamp: new Date()
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
    setCanSend(false);
    
    // Simulate 1-minute delay for next message
    setTimeout(() => setCanSend(true), 60000);
  };

  const handlePhotoRequest = () => {
    setPhotoRequestSent(true);
    const requestMessage = {
      id: messages.length + 1,
      text: "Would you like to share more photos?",
      sender: 'me' as const,
      timestamp: new Date()
    };
    setMessages([...messages, requestMessage]);
  };

  const handleStarterClick = (starter: string) => {
    setNewMessage(starter);
  };

  const canRequestPhotos = messageCount >= 30;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                <img 
                  src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=100&h=100&fit=crop&crop=face"
                  alt="Alex"
                  className={`w-full h-full object-cover ${messageCount < 30 ? 'filter blur-sm' : ''}`}
                />
              </div>
              {messageCount < 30 && (
                <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center opacity-80">
                  <span className="text-sm">📚</span>
                </div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Alex</h2>
              <p className="text-sm text-gray-600">Chill • Book Worm</p>
            </div>
          </div>
          
          {canRequestPhotos && !photosRevealed && (
            <Button
              onClick={handlePhotoRequest}
              disabled={photoRequestSent}
              size="sm"
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Images className="w-4 h-4 mr-1" />
              {photoRequestSent ? 'Requested' : 'Request Photos'}
            </Button>
          )}
        </div>
        
        {messageCount < 30 && (
          <div className="mt-2 p-2 bg-yellow-50 rounded-lg">
            <p className="text-xs text-yellow-700">
              <Eye className="w-3 h-3 inline mr-1" />
              Photos will be revealed after 30 messages ({30 - messageCount} more to go)
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.sender === 'me'
                  ? 'bg-rose-500 text-white rounded-br-sm'
                  : 'bg-blue-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        
        {!canSend && (
          <div className="text-center">
            <Card className="inline-flex items-center space-x-2 p-3 bg-yellow-50 border-yellow-200">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                Take your time... next message unlocks soon
              </span>
            </Card>
          </div>
        )}
      </div>

      {/* Input and Controls */}
      <div className="p-4 space-y-4 bg-white border-t border-gray-200">
        {/* Message Input */}
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-full border-gray-300 focus:border-rose-400 focus:ring-rose-200"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!canSend || !newMessage.trim()}
            className="rounded-full bg-rose-500 hover:bg-rose-600 text-white p-3 disabled:bg-gray-300"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Conversation Starters */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Conversation starters:</p>
          <div className="flex flex-wrap gap-2">
            {conversationStarters.slice(0, 3).map((starter, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleStarterClick(starter)}
                className="text-xs rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                {starter}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {conversationStarters.slice(3, 6).map((starter, index) => (
              <Button
                key={index + 3}
                variant="outline"
                size="sm"
                onClick={() => handleStarterClick(starter)}
                className="text-xs rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                {starter}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
