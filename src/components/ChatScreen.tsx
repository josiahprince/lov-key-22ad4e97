
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Send } from 'lucide-react';

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

  const conversationStarters = [
    "What's the last book that really moved you?",
    "If you could have coffee with anyone, who would it be?",
    "What's a small thing that made you smile today?",
    "Do you have a favorite spot in Bangalore?",
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

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center">
            <span className="text-lg">📚</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Alex</h2>
            <p className="text-sm text-gray-600">Chill • Book Worm</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.sender === 'me'
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-100 text-gray-800'
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

      <div className="p-4 space-y-4 bg-white border-t border-gray-200">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Conversation starters:</p>
          <div className="flex flex-wrap gap-2">
            {conversationStarters.slice(0, 2).map((starter, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setNewMessage(starter)}
                className="text-xs rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                {starter}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-full border-gray-200 focus:border-rose-300"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!canSend || !newMessage.trim()}
            className="rounded-full bg-rose-500 hover:bg-rose-600 text-white p-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
