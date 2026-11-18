
import React, { useEffect, useState } from 'react';
import {
  Link,
  Route,
  Routes,
  useNavigate
} from 'react-router-dom';

import {
  Bot,
  MessageCircle,
  Send,
  Save,
  Plus,
  History,
  Sun,
  Moon,
  ThumbsUp,
  ThumbsDown,
  Star,
  Trash2,
  ArrowLeft,
  ShoppingBag
} from 'lucide-react';

import responseData from './data/responses.json';

const CHAT_KEY = 'product-ai-conversations';
const THEME_KEY = 'product-ai-theme';
const FEEDBACK_KEY = 'product-ai-feedback';

const BUDGET_PROMPT =
  'Please select your budget (500 - 1000, 1000 - 1500, 1500 - 2000)';

const FALLBACK_MESSAGE =
  'Sorry, I did not understand your query!';

const getStoredData = (key, fallback = []) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const createInitialMessages = () => [
  {
    id: Date.now(),
    sender: 'bot',
    text:
      responseData.greeting ||
      'Hello! Welcome to Product Recommendation AI. What product are you looking for?'
  }
];

const getProduct = (query) => {
  const products = responseData.products || [];
  const normalizedQuery = query.toLowerCase().trim();

  return products.find((product) => {
    const keywords = product.keywords || [];

    return (
      keywords.some((keyword) =>
        normalizedQuery.includes(String(keyword).toLowerCase())
      ) ||
      String(product.name || product.category || '')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  });
};

const parseBudget = (value) => {
  const numbers = value.match(/\d+/g);

  if (!numbers || numbers.length < 2) {
    return null;
  }

  return {
    min: Number(numbers[0]),
    max: Number(numbers[1])
  };
};

const getPrice = (product) => {
  const rawPrice = product.price ?? product.cost ?? 0;
  return Number(String(rawPrice).replace(/[^\d.]/g, '')) || 0;
};

function ChatPage() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState(createInitialMessages);
  const [input, setInput] = useState('');
  const [pendingProduct, setPendingProduct] = useState(null);
  const [isBudgetPending, setIsBudgetPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_KEY) || 'light'
  );

  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const addMessage = (sender, text, extra = {}) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      sender,
      text,
      timestamp: new Date().toISOString(),
      ...extra
    };

    setMessages((previous) => [...previous, newMessage]);
    return newMessage;
  };

  const saveConversation = (
    conversationMessages = messages,
    conversationRating = rating,
    comment = feedbackComment
  ) => {
    if (!conversationMessages || conversationMessages.length <= 1) {
      return;
    }

    const conversations = getStoredData(CHAT_KEY, []);

    const conversation = {
      id: Date.now(),
      date: new Date().toISOString(),
      messages: conversationMessages,
      rating: conversationRating,
      feedback: comment
    };

    conversations.push(conversation);

    localStorage.setItem(
      CHAT_KEY,
      JSON.stringify(conversations)
    );

    setSaved(true);
    return conversation;
  };

  const handleSave = (event) => {
    event?.preventDefault();
    saveConversation();
  };

  const resetConversation = () => {
    setMessages(createInitialMessages());
    setInput('');
    setPendingProduct(null);
    setIsBudgetPending(false);
    setSaved(false);
    setShowFeedback(false);
    setRating(0);
    setFeedbackComment('');
  };

  const handleNewSuggestion = (event) => {
    event?.preventDefault();

    if (messages.length > 1 && !saved) {
      saveConversation();
    }

    resetConversation();
    navigate('/');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const userQuery = input.trim();

    if (!userQuery) return;

    addMessage('user', userQuery);
    setInput('');

    if (isBudgetPending && pendingProduct) {
      const budget = parseBudget(userQuery);

      if (!budget) {
        addMessage(
          'bot',
          'Please enter a valid budget range, for example 500 - 1000.'
        );
        return;
      }

      const recommendations =
        pendingProduct.recommendations || [];

      const filteredProducts = recommendations.filter((product) => {
        const price = getPrice(product);
        return price >= budget.min && price <= budget.max;
      });

      if (filteredProducts.length > 0) {
        addMessage(
          'bot',
          `Here are the products I recommend within your budget of ${budget.min} - ${budget.max}:`,
          { products: filteredProducts }
        );
      } else {
        addMessage(
          'bot',
          'Sorry, no products were found within your selected budget. Please try another budget range.'
        );
      }

      setIsBudgetPending(false);
      setPendingProduct(null);
      return;
    }

    const matchedProduct = getProduct(userQuery);

    if (!matchedProduct) {
      addMessage('bot', FALLBACK_MESSAGE);
      return;
    }

    setPendingProduct(matchedProduct);
    setIsBudgetPending(true);
    addMessage('bot', BUDGET_PROMPT);
  };

  const handleMessageFeedback = (messageId, type) => {
    const feedback = getStoredData(FEEDBACK_KEY, []);

    const existingIndex = feedback.findIndex(
      (item) => item.messageId === messageId
    );

    const newFeedback = {
      messageId,
      type,
      date: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      feedback[existingIndex] = newFeedback;
    } else {
      feedback.push(newFeedback);
    }

    localStorage.setItem(
      FEEDBACK_KEY,
      JSON.stringify(feedback)
    );

    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageId
          ? { ...message, feedback: type }
          : message
      )
    );
  };

  const handleFinalFeedback = () => {
    saveConversation(messages, rating, feedbackComment);
    resetConversation();
  };

  return (
    <div className={`app-container ${theme}`}>
      <header className="chat-header">
        <div className="header-left">
          <div className="header-logo">
            <Bot size={25} />
          </div>

          <div className="chat-header-title">
            <h1>Product Recommendation AI</h1>
            <p>Your personal shopping assistant</p>
          </div>
        </div>

        <div className="header-actions">
          <Link to="/history" className="history-link">
            <History size={17} />
            <span>Past Conversations</span>
          </Link>

          <button
            type="button"
            className="theme-toggle"
            aria-label="Toggle theme"
            onClick={() =>
              setTheme((previous) =>
                previous === 'light' ? 'dark' : 'light'
              )
            }
          >
            {theme === 'light' ? (
              <Moon size={19} />
            ) : (
              <Sun size={19} />
            )}
          </button>
        </div>
      </header>

      <main className="chat-main">
        <section className="chat-window">
          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-row ${message.sender}`}
              >
                {message.sender === 'bot' && (
                  <div className="message-avatar">
                    <Bot size={19} />
                  </div>
                )}

                <div className="message-content">
                  <div className="message-bubble">
                    <p>{message.text}</p>

                    {message.products?.length > 0 && (
                      <div className="recommended-products">
                        {message.products.map((product, index) => (
                          <div
                            className="product-card"
                            key={product.id || product.name || index}
                          >
                            {product.image && (
                              <img
                                src={product.image}
                                alt={product.name || product.title || 'Product'}
                              />
                            )}

                            <div className="product-details">
                              <h3>
                                {product.name ||
                                  product.title ||
                                  'Recommended Product'}
                              </h3>

                              {product.description && (
                                <p>{product.description}</p>
                              )}

                              <strong>
                                ₹{getPrice(product)}
                              </strong>

                              {product.link && (
                                <a
                                  href={product.link}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View Product
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.sender === 'bot' &&
                    message.id !== messages[0]?.id && (
                      <div className="message-feedback">
                        <button
                          type="button"
                          aria-label="Helpful"
                          className={
                            message.feedback === 'up' ? 'active' : ''
                          }
                          onClick={() =>
                            handleMessageFeedback(message.id, 'up')
                          }
                        >
                          <ThumbsUp size={15} />
                        </button>

                        <button
                          type="button"
                          aria-label="Not helpful"
                          className={
                            message.feedback === 'down' ? 'active' : ''
                          }
                          onClick={() =>
                            handleMessageFeedback(message.id, 'down')
                          }
                        >
                          <ThumbsDown size={15} />
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>

          <div className="chat-footer">
            <form className="chat-composer" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Please tell me about your query!"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label="Enter your product query"
              />

              <button
                type="submit"
                className="ask-button"
                aria-label="Ask"
              >
                <Send size={18} />
                <span>Ask</span>
              </button>
            </form>

            <div className="composer-actions">
              <button
                type="button"
                className="save-button"
                onClick={handleSave}
              >
                <Save size={16} />
                {saved ? 'Saved' : 'Save Conversation'}
              </button>

              <Link
                to="/"
                className="new-suggestion-link"
                onClick={handleNewSuggestion}
              >
                <Plus size={16} />
                Want new suggestion?
              </Link>
            </div>
          </div>
        </section>

        {showFeedback && (
          <div className="feedback-modal">
            <div className="feedback-content">
              <h2>Rate Your Experience</h2>
              <p>How helpful were the recommendations?</p>

              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      size={25}
                      fill={star <= rating ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Share your feedback (optional)"
                value={feedbackComment}
                onChange={(event) =>
                  setFeedbackComment(event.target.value)
                }
              />

              <button
                type="button"
                onClick={handleFinalFeedback}
                disabled={!rating}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function HistoryPage() {
  const [conversations, setConversations] = useState(
    () => getStoredData(CHAT_KEY, [])
  );

  const [filter, setFilter] = useState('all');

  const handleDelete = (id) => {
    const updated = conversations.filter(
      (conversation) => conversation.id !== id
    );

    setConversations(updated);
    localStorage.setItem(CHAT_KEY, JSON.stringify(updated));
  };

  const filteredConversations = conversations.filter(
    (conversation) => {
      if (filter === 'all') return true;
      return String(conversation.rating) === filter;
    }
  );

  return (
    <div className="app-container history-page">
      <header className="chat-header">
        <div className="header-left">
          <div className="header-logo">
            <History size={24} />
          </div>

          <div className="chat-header-title">
            <h1>Product Recommendation AI</h1>
            <p>Your saved conversations</p>
          </div>
        </div>

        <Link to="/" className="history-link">
          <ArrowLeft size={17} />
          Back to Chat
        </Link>
      </header>

      <main className="history-main">
        <div className="history-toolbar">
          <div>
            <h2>Previous Suggestions</h2>
            <p>Review your previous product recommendations.</p>
          </div>

          <div className="history-toolbar-actions">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter by rating"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            <Link to="/" className="primary-action">
              <Plus size={16} />
              New suggestion
            </Link>
          </div>
        </div>

        {filteredConversations.length === 0 ? (
          <div className="empty-history">
            <div className="empty-history-icon">
              <MessageCircle size={35} />
            </div>

            <h3>No previous suggestions found</h3>
            <p>Your saved conversations will appear here.</p>

            <Link to="/" className="primary-action">
              Start a Conversation
            </Link>
          </div>
        ) : (
          <div className="history-list">
            {filteredConversations
              .slice()
              .reverse()
              .map((conversation) => (
                <article
                  className="history-card"
                  key={conversation.id}
                >
                  <div className="history-card-header">
                    <span>
                      {new Date(conversation.date).toLocaleString()}
                    </span>

                    <button
                      type="button"
                      aria-label="Delete conversation"
                      onClick={() => handleDelete(conversation.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="history-card-messages">
                    {(conversation.messages || []).map((message) => (
                      <div
                        key={message.id}
                        className={`history-message ${message.sender}`}
                      >
                        <strong>
                          {message.sender === 'user' ? 'You' : 'AI'}
                        </strong>

                        <p>{message.text}</p>
                      </div>
                    ))}
                  </div>

                  {conversation.rating > 0 && (
                    <div className="history-rating">
                      <span>Your rating:</span>

                      {Array.from(
                        { length: conversation.rating },
                        (_, index) => (
                          <Star
                            key={index}
                            size={15}
                            fill="currentColor"
                          />
                        )
                      )}
                    </div>
                  )}

                  {conversation.feedback && (
                    <p className="history-comment">
                      {conversation.feedback}
                    </p>
                  )}
                </article>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Routes>
  );
}
