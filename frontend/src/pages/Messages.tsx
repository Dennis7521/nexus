import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Send, MoreVertical, Flag, Smile, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { markMessagesAsRead, markDirectMessagesAsRead } from '../utils/notificationHelpers';
import { useToast, ToastContainer } from '../components/Toast';

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  id: number;
  exchangeId: string | null;
  exchangeStatus?: string | null;
  cycleId?: string | null;
  cycleStatus?: string | null;
  isGroup?: boolean;
  groupMembers?: string[];
  groupMemberDetails?: { id: string; name: string }[];
  partnerId: string;
  partnerName: string;
  partnerInitials: string;
  partnerProfilePicture?: string;
  skill: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export const Messages: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, success, error, removeToast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportedMemberId, setReportedMemberId] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Mark all messages as read when page loads
  useEffect(() => {
    markMessagesAsRead();
  }, []);

  // Load conversations from database
  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      try {
        // Load 1-on-1 exchange conversations
        const response = await axios.get(`/messages/conversations`);
        const conversationsData = response.data;

        const formattedConversations: Conversation[] = await Promise.all(
          conversationsData.map(async (conv: any, index: number) => {
            const messagesResponse = conv.exchange_id 
              ? await axios.get(`/messages/conversation/${conv.exchange_id}`)
              : await axios.get(`/messages/direct/${conv.partner_id}`);
              
            const messages = messagesResponse.data.map((msg: any) => ({
              id: msg.id,
              senderId: msg.sender_id === user.id ? 'me' : msg.sender_id,
              senderName: msg.sender_name,
              content: msg.content,
              timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              isRead: true
            }));

            const lastMessage = messages[messages.length - 1];
            return {
              id: index + 1,
              exchangeId: conv.exchange_id || null,
              exchangeStatus: conv.exchange_status || null,
              cycleId: null,
              cycleStatus: null,
              isGroup: false,
              partnerId: conv.partner_id,
              partnerName: conv.partner_name,
              partnerInitials: conv.partner_name.split(' ').map((n: string) => n[0]).join(''),
              partnerProfilePicture: conv.partner_profile_picture || conv.partnerProfilePicture,
              skill: conv.skill_title || 'Direct Message',
              lastMessage: lastMessage?.content || conv.initial_message || conv.last_message || 'No messages yet',
              lastMessageTime: lastMessage ? lastMessage.timestamp : 'Just now',
              unreadCount: 0,
              messages
            };
          })
        );

        // Load sync group chats
        const groupResponse = await axios.get(`/messages/group-conversations`);
        const groupData = groupResponse.data;

        const groupConversations: Conversation[] = await Promise.all(
          groupData.map(async (gc: any, index: number) => {
            const msgRes = await axios.get(`/messages/group/${gc.cycle_id}`);
            const messages = msgRes.data.map((msg: any) => ({
              id: msg.id,
              senderId: msg.sender_id === user.id ? 'me' : msg.sender_id,
              senderName: msg.sender_name,
              content: msg.content,
              timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              isRead: msg.is_read
            }));
            const lastMsg = messages[messages.length - 1];
            const groupName = `${gc.cycle_length}-Person Exchange Group`;
            const memberNames: string[] = Array.isArray(gc.member_names) ? gc.member_names : [];
            const memberDetails: { id: string; name: string }[] = Array.isArray(gc.member_details) ? gc.member_details : [];
            return {
              id: formattedConversations.length + index + 1,
              exchangeId: null,
              exchangeStatus: null,
              cycleId: gc.cycle_id,
              cycleStatus: gc.cycle_status || null,
              isGroup: true,
              groupMembers: memberNames,
              groupMemberDetails: memberDetails,
              partnerId: gc.cycle_id,
              partnerName: groupName,
              partnerInitials: `${gc.cycle_length}P`,
              partnerProfilePicture: undefined,
              skill: `${gc.teach_skill} ↔ ${gc.learn_skill}`,
              lastMessage: lastMsg?.content || 'Group chat started',
              lastMessageTime: lastMsg ? lastMsg.timestamp : 'Just now',
              unreadCount: Number(gc.unread_count || 0),
              messages
            };
          })
        );

        const all = [...formattedConversations, ...groupConversations];
        setConversations(all);
        
        if (all.length > 0 && selectedConversation === null) {
          setSelectedConversation(all[0].id);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };

    loadConversations();
  }, [user]); // Removed selectedConversation dependency to prevent reload on selection change

  const filteredConversations = conversations.filter(conv =>
    conv.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.skill.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentConversation = conversations.find(conv => conv.id === selectedConversation);

  // Mark messages as read when a conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      const conversation = conversations.find(conv => conv.id === selectedConversation);
      if (conversation) {
        // Mark direct messages with this partner as read
        markDirectMessagesAsRead(conversation.partnerId);
      }
    }
  }, [selectedConversation, conversations]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && currentConversation && user) {
      try {
        const isGroup = currentConversation.isGroup && currentConversation.cycleId;
        const isDirectMessage = !isGroup && currentConversation.exchangeId === null;
        
        let response;
        if (isGroup) {
          response = await axios.post(`/messages/group/${currentConversation.cycleId}`, {
            content: newMessage.trim()
          });
        } else if (isDirectMessage) {
          response = await axios.post('/messages/', {
            receiverId: currentConversation.partnerId,
            content: newMessage.trim()
          });
        } else {
          response = await axios.post('/messages/send', {
            exchangeId: currentConversation.exchangeId,
            content: newMessage.trim()
          });
        }

        if (response.status === 201) {
          let messagesResponse;
          if (isGroup) {
            messagesResponse = await axios.get(`/messages/group/${currentConversation.cycleId}`);
          } else if (isDirectMessage) {
            messagesResponse = await axios.get(`/messages/direct/${currentConversation.partnerId}`);
          } else {
            messagesResponse = await axios.get(`/messages/conversation/${currentConversation.exchangeId}`);
          }
          
          const messages = messagesResponse.data.map((msg: any) => ({
            id: msg.id,
            senderId: msg.sender_id === user.id ? 'me' : msg.sender_id,
            senderName: msg.sender_name,
            content: msg.content,
            timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            isRead: true
          }));

          // Update the conversation with new messages
          const updatedConversations = conversations.map(conv => {
            if (conv.id === selectedConversation) {
              const lastMessage = messages[messages.length - 1];
              return {
                ...conv,
                messages,
                lastMessage: lastMessage.content,
                lastMessageTime: lastMessage.timestamp
              };
            }
            return conv;
          });

          setConversations(updatedConversations);
          setNewMessage('');
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!currentConversation) return;

    try {
      const response = await axios.delete(`/messages/${messageId}`);
      
      if (response.status === 200) {
        // Determine if this is a direct message or exchange-based message
        const isDirectMessage = currentConversation.exchangeId === null;
        
        // Reload messages based on message type
        let messagesResponse;
        if (isDirectMessage) {
          messagesResponse = await axios.get(`/messages/direct/${currentConversation.partnerId}`);
        } else {
          messagesResponse = await axios.get(`/messages/conversation/${currentConversation.exchangeId}`);
        }
        
        const messages = messagesResponse.data.map((msg: any) => ({
          id: msg.id,
          senderId: msg.sender_id === user?.id ? 'me' : msg.sender_id,
          senderName: msg.sender_name,
          content: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          isRead: true
        }));

        // Update the conversation with updated messages
        const updatedConversations = conversations.map(conv => {
          if (conv.id === selectedConversation) {
            const lastMessage = messages[messages.length - 1];
            return {
              ...conv,
              messages,
              lastMessage: lastMessage?.content || 'Message deleted',
              lastMessageTime: lastMessage?.timestamp || 'Just now'
            };
          }
          return conv;
        });

        setConversations(updatedConversations);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleDeleteConversation = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteConversation = async () => {
    if (!currentConversation) {
      error('No conversation selected');
      return;
    }

    const conversationIdToDelete = selectedConversation;
    const partnerIdToDelete = currentConversation.partnerId;

    try {
      // Determine if this is a direct message or exchange-based conversation
      const isDirectMessage = currentConversation.exchangeId === null;
      
      // Close modal and clear UI immediately for better UX
      setShowDeleteModal(false);
      setSelectedConversation(null);
      
      let response;
      if (isDirectMessage) {
        // Delete direct message conversation
        response = await axios.delete(`/messages/direct/${partnerIdToDelete}`);
      } else {
        // Delete exchange-based conversation
        response = await axios.delete(`/messages/conversation/${currentConversation.exchangeId}`);
      }
      
      if (response.status === 200) {
        // Remove the deleted conversation from state
        const updatedConversations = conversations.filter(conv => conv.id !== conversationIdToDelete);
        
        // Update conversations state
        setConversations(updatedConversations);
        
        // Select the first conversation if available (after a brief delay)
        if (updatedConversations.length > 0) {
          setTimeout(() => {
            setSelectedConversation(updatedConversations[0].id);
          }, 100);
        }
        
        // Show success message
        success('Conversation deleted successfully');
      }
    } catch (err: any) {
      console.error('Error deleting conversation:', err);
      setShowDeleteModal(false);
      
      // If deletion failed, we need to restore the selection
      // Reload conversations to get fresh data
      window.location.reload();
      
      error(`Failed to delete conversation: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showEmojiPicker && !target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleReportUser = () => {
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!currentConversation || !reportReason.trim()) {
      error('Please select a reason for reporting');
      return;
    }

    const targetUserId = currentConversation.isGroup ? reportedMemberId : currentConversation.partnerId;
    if (!targetUserId) {
      error('Please select the member you want to report');
      return;
    }

    setIsSubmittingReport(true);

    try {
      const response = await axios.post('/reports', {
        reportedUserId: targetUserId,
        exchangeId: currentConversation.exchangeId || null,
        reason: reportReason,
        description: reportDescription.trim() || null
      });

      if (response.status === 201) {
        success('Report submitted successfully. Our team will review it shortly.');
        setShowReportModal(false);
        setReportReason('');
        setReportDescription('');
        setReportedMemberId('');
      }
    } catch (err: any) {
      console.error('Error submitting report:', err);
      error(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-7xl mx-auto px-12 py-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-4 tracking-tighter" style={{ color: 'var(--gray-900)' }}>
          Messages
        </h1>
      </div>

      {/* Messages Interface */}
      <div className="rounded-2xl shadow-sm overflow-hidden" style={{ height: '600px', background: 'var(--green-50)' }}>
        <div className="flex h-full">
          {/* Conversations Sidebar */}
          <div className="w-1/3 flex flex-col" style={{ background: 'var(--white)', borderRight: '1px solid var(--gray-100)' }}>
            {/* Search */}
            <div className="p-4 border-b" style={{ 
              background: 'var(--green-800)', 
              borderColor: 'var(--green-700)' 
            }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--gray-500)' }} />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 text-sm transition-all duration-200 focus:outline-none"
                  style={{
                    background: 'var(--gray-100)',
                    borderRadius: 'var(--radius-xl)',
                    border: 'none',
                    color: 'var(--gray-900)'
                  }}
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Search className="w-6 h-6 text-secondary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-black dark:text-neutral-white mb-2">
                    No conversations yet
                  </h3>
                  <p className="text-sm text-black dark:text-neutral-white">
                    Accept exchange requests to start messaging with learning partners
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedConversation === conversation.id 
                        ? 'border-l-3' 
                        : ''
                    }`}
                    style={{
                      background: selectedConversation === conversation.id ? 'var(--green-50)' : 'var(--white)',
                      borderLeft: selectedConversation === conversation.id ? '3px solid var(--green-800)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedConversation !== conversation.id) {
                        e.currentTarget.style.background = 'var(--green-50)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedConversation !== conversation.id) {
                        e.currentTarget.style.background = 'var(--white)';
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold overflow-hidden" style={{
                          background: conversation.isGroup ? '#0D3B22' : 'var(--green-800)',
                          color: 'var(--white)'
                        }}>
                          {conversation.partnerProfilePicture ? (
                            <img 
                              src={conversation.partnerProfilePicture}
                              alt={conversation.partnerName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            conversation.partnerInitials
                          )}
                        </div>
                        {conversation.isGroup && (
                          <span className="absolute -bottom-0.5 -right-0.5 text-xs px-1 rounded-full font-bold" style={{ background: 'var(--green-400)', color: 'white', fontSize: '9px' }}>GRP</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold truncate" style={{ color: 'var(--gray-900)' }}>{conversation.partnerName}</h3>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>{conversation.lastMessageTime}</span>
                        </div>
                        <p className="truncate" style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-400)' }}>{conversation.skill}</p>
                        <p className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>{conversation.lastMessage}</p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div className="w-5 h-5 bg-accent-600 text-neutral-white text-xs rounded-full flex items-center justify-center font-medium">
                          {conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {currentConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b" style={{ 
                  background: 'var(--green-800)', 
                  borderColor: 'var(--green-700)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold shadow-sm overflow-hidden" style={{
                          background: 'var(--white)',
                          color: 'var(--green-500)'
                        }}>
                          {currentConversation.partnerProfilePicture ? (
                            <img 
                              src={currentConversation.partnerProfilePicture}
                              alt={currentConversation.partnerName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            currentConversation.partnerInitials
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: 'var(--white)' }}>{currentConversation.partnerName}</h3>
                        {currentConversation.isGroup && currentConversation.groupMembers && currentConversation.groupMembers.length > 0 && (
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{currentConversation.groupMembers.join(' · ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Workspace button — async exchange or sync group */}
                      {currentConversation.exchangeId && (
                        <button 
                          onClick={() => navigate(`/exchange/${currentConversation.exchangeId}`)}
                          className="px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all"
                          style={{ background: 'var(--white)', color: 'var(--green-800)' }}
                          title="Open Exchange Workspace"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-50)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--white)'}>
                          <ExternalLink className="w-4 h-4" />
                          Workspace
                        </button>
                      )}
                      {currentConversation.isGroup && currentConversation.cycleId && (
                        <button 
                          onClick={() => navigate(`/sync-exchange/${currentConversation.cycleId}`)}
                          className="px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all"
                          style={{ background: 'var(--white)', color: 'var(--green-800)' }}
                          title="Open Sync Workspace"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-50)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--white)'}>
                          <ExternalLink className="w-4 h-4" />
                          Sync Workspace
                        </button>
                      )}
                      {/* Hide report button for NEXUS Admin */}
                      {currentConversation.partnerName !== 'NEXUS Admin' && (
                        <button 
                          onClick={handleReportUser}
                          className="p-2 rounded-lg transition-colors" 
                          style={{ color: 'var(--white)' }}
                          title="Report user"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-700)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <Flag className="w-5 h-5" />
                        </button>
                      )}
                      {/* Hide delete button for active exchanges and active group chats */}
                      {!(
                        (currentConversation.exchangeId && currentConversation.exchangeStatus === 'accepted') ||
                        (currentConversation.isGroup && currentConversation.cycleStatus === 'active')
                      ) && (
                        <button 
                          onClick={handleDeleteConversation}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--danger-500)' }}
                          title="Delete conversation"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--white)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-700)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div className="relative">
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                            message.senderId === 'me'
                              ? 'bg-accent-600 text-neutral-white'
                              : 'bg-secondary-200 dark:bg-secondary-600 text-secondary-900 dark:text-neutral-white'
                          }`}
                        >
                          {currentConversation.isGroup && message.senderId !== 'me' && (
                            <p className="text-xs font-semibold mb-1 opacity-70">{message.senderName}</p>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center justify-between mt-2 text-xs ${
                            message.senderId === 'me' ? 'text-neutral-white/70' : 'text-secondary-500 dark:text-secondary-400'
                          }`}>
                            <span>{message.timestamp}</span>
                            <div className="flex items-center gap-1">
                              {message.senderId === 'me' && (
                                <CheckCheck className={`w-3 h-3 ${message.isRead ? 'text-neutral-white/70' : 'text-neutral-white/50'}`} />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Delete button - only show for user's own messages */}
                        {message.senderId === 'me' && (
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center shadow-lg"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input - Hidden for NEXUS Admin */}
                {currentConversation.partnerName === 'NEXUS Admin' ? (
                  <div className="p-4 border-t border-secondary-200 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-700">
                    <div className="flex items-center justify-center gap-2 py-3">
                      <p className="text-sm text-center" style={{ color: 'var(--gray-600)' }}>
                        This is a read-only conversation. NEXUS Admin will contact you regarding your reports.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-secondary-200 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-700">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 relative">
                        <textarea
                          className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-sm bg-neutral-white dark:bg-secondary-800 text-secondary-900 dark:text-neutral-white focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 transition-all duration-200 resize-none"
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          rows={1}
                        />
                      </div>
                      <div className="relative emoji-picker-container">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 text-black dark:text-neutral-white hover:bg-secondary-100 dark:hover:bg-secondary-600 rounded-lg transition-colors"
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-12 right-0 z-50">
                            <EmojiPicker
                              onEmojiClick={(emojiData: EmojiClickData) => {
                                setNewMessage(prev => prev + emojiData.emoji);
                                setShowEmojiPicker(false);
                              }}
                              width={300}
                              height={400}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-accent-600 hover:bg-accent-700 disabled:bg-secondary-300 text-neutral-white p-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Search className="w-6 h-6 text-secondary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-black dark:text-neutral-white mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-sm text-black dark:text-neutral-white">
                    Choose a conversation from the sidebar to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report User Modal */}
      {showReportModal && currentConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-white dark:bg-secondary-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--danger-100)' }}>
                <Flag className="w-6 h-6" style={{ color: 'var(--danger-600)' }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-neutral-white">
                  Report User
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  {currentConversation.isGroup ? 'Report a member of this group' : `Report ${currentConversation.partnerName}`}
                </p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              {currentConversation.isGroup && currentConversation.groupMemberDetails && currentConversation.groupMemberDetails.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Member to report *
                  </label>
                  <select
                    value={reportedMemberId}
                    onChange={(e) => setReportedMemberId(e.target.value)}
                    className="w-full px-4 py-2 border border-secondary-200 dark:border-secondary-600 rounded-lg bg-neutral-white dark:bg-secondary-800 text-secondary-900 dark:text-neutral-white focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                  >
                    <option value="">Select a member</option>
                    {currentConversation.groupMemberDetails
                      .filter(m => m.id !== user?.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Reason for reporting *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-4 py-2 border border-secondary-200 dark:border-secondary-600 rounded-lg bg-neutral-white dark:bg-secondary-800 text-secondary-900 dark:text-neutral-white focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                >
                  <option value="">Select a reason</option>
                  <option value="Inappropriate behavior">Inappropriate behavior</option>
                  <option value="Harassment or bullying">Harassment or bullying</option>
                  <option value="No-show for sessions">No-show for sessions</option>
                  <option value="Poor teaching quality">Poor teaching quality</option>
                  <option value="Scam or fraud">Scam or fraud</option>
                  <option value="Spam or misleading content">Spam or misleading content</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide more information about the issue..."
                  rows={4}
                  className="w-full px-4 py-2 border border-secondary-200 dark:border-secondary-600 rounded-lg bg-neutral-white dark:bg-secondary-800 text-secondary-900 dark:text-neutral-white focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setReportDescription('');
                  setReportedMemberId('');
                }}
                disabled={isSubmittingReport}
                className=""
                style={{
                  backgroundColor: '#D1D5DB',
                  color: '#2C2C54',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 500,
                  border: 'none',
                  cursor: isSubmittingReport ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingReport ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason.trim() || isSubmittingReport || (currentConversation.isGroup && !reportedMemberId)}
                className=""
                style={{
                  backgroundColor: reportReason.trim() && !isSubmittingReport && (!currentConversation.isGroup || reportedMemberId) ? '#145A32' : '#D1D5DB',
                  color: '#FFFFFF',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 500,
                  border: 'none',
                  cursor: (!reportReason.trim() || isSubmittingReport || (currentConversation.isGroup && !reportedMemberId)) ? 'not-allowed' : 'pointer',
                  opacity: (!reportReason.trim() || isSubmittingReport || (currentConversation.isGroup && !reportedMemberId)) ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && currentConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-white dark:bg-secondary-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-neutral-white">
                  Delete Conversation
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <p className="text-secondary-700 dark:text-secondary-300 mb-6">
              Are you sure you want to delete this entire conversation with{' '}
              <span className="font-semibold text-black dark:text-neutral-white">
                {currentConversation.partnerName}
              </span>
              ? All messages will be permanently deleted.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteConversation}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Delete Conversation
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Messages;
