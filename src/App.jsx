
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
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
  Menu,
  X,
  ShoppingBag,
  Sparkles,
  ArrowLeft,
  Trash2,
} from 'lucide-react';

import responseData from './data/responses.json';

const CHAT_KEY = 'product-ai-conversations';
const THEME_KEY = 'product-ai-theme';
const FEEDBACK_KEY = 'product-ai-feedback';

const BUDGET_PROMPT =
  'Please select your budget (500 - 1000, 1000 - 1500, 1500 - 2000)';

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createMessage(role, content, extra = {}) {
  return {
    id: createId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

function getProduct(query) {
  const normalized = query.toLowerCase();

  return responseData.products.find((product) =>
    product.keywords.some((keyword) =>
      normalized.includes(keyword.toLowerCase())
    )
  );
}

function parseBudget(text) {
  const numbers = text.match(/[\d,]+(?:\.\d+)?/g);

  if (!numbers || numbers.length < 2) {
    return null;
  }

  const min = Number(numbers[0].replace(/,/g, ''));
  const max = Number(numbers[1].replace(/,/g, ''));

  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min < 0 ||
    max < min
  ) {
    return null;
  }

  return { min, max };
}

function formatPrice(price) {
  return `₹${Number(price).toLocaleString('en-IN')}`;
}

function getGreeting() {
  return responseData.greetings[0];
}

function createInitialMessages() {
  return [createMessage('assistant', getGreeting())];
}

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <div className="product-card-icon">
        <ShoppingBag size={21} />
      </div>

      <div className="product-card-info">
        <h4>{product.name}</h4>
        <p>{product.description}</p>
        <strong>{formatPrice(product.price)}</strong>
      </div>
    </div>
  );
}

function MessageFeedback({ message, onFeedback, feedback }) {
  const [rating, setRating] = useState(feedback?.rating || 0);
  const [comment, setComment] = useState(feedback?.comment || '');
  const [showRating, setShowRating] = useState(
    feedback?.type === 'like'
  );
  const [showComment, setShowComment] = useState(
    feedback?.type === 'dislike'
  );

  function handleLike() {
    setShowRating(true);
    setShowComment(false);

    onFeedback(message.id, {
      type: 'like',
      rating: 0,
      comment: '',
    });
  }

  function handleDislike() {
    setShowComment(true);
    setShowRating(false);

    onFeedback(message.id, {
      type: 'dislike',
      rating: 0,
      comment: '',
    });
  }

  function saveRating(value) {
    setRating(value);

    onFeedback(message.id, {
      type: 'like',
      rating: value,
      comment: '',
    });
  }

  function saveComment() {
    onFeedback(message.id, {
      type: 'dislike',
      rating: 0,
      comment,
    });
  }

  return (
    <div className="message-feedback">
      <div className="message-feedback-actions">
        <button
          type="button"
          aria-label="Like response"
          title="Helpful"
          className={feedback?.type === 'like' ? 'feedback-active' : ''}
          onClick={handleLike}
        >
          <ThumbsUp size={15} />
        </button>

        <button
          type="button"
          aria-label="Dislike response"
          title="Not helpful"
          className={
            feedback?.type === 'dislike' ? 'feedback-active' : ''
          }
          onClick={handleDislike}
        >
          <ThumbsDown size={15} />
        </button>
      </div>

      {showRating && (
        <div className="inline-feedback">
          <p>How helpful was this recommendation?</p>

          <div className="inline-stars">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button"
                key={value}
                aria-label={`Rate ${value} stars`}
                onClick={() => saveRating(value)}
                className={value <= rating ? 'star-selected' : ''}
              >
                <Star
                  size={19}
                  fill={value <= rating ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <span className="feedback-saved">Rating saved</span>
          )}
        </div>
      )}

      {showComment && (
        <div className="inline-feedback">
          <p>How could this recommendation be improved?</p>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Tell us what went wrong..."
            rows={2}
          />

          <button
            type="button"
            className="small-submit-button"
            onClick={saveComment}
          >
            Submit feedback
          </button>
        </div>
      )}
    </div>
  );
}

function ChatMessage({ message, onFeedback, feedback }) {
  const isBot = message.role === 'assistant';

  return (
    <div className={`message-row ${isBot ? 'bot-row' : 'user-row'}`}>
      {isBot && (
        <div className="message-avatar">
          <Bot size={19} />
        </div>
      )}

      <div
        className={`message-content ${
          isBot ? 'bot-message' : 'user-message'
        }`}
      >
        <div className="message-bubble">
          {message.content}

          {message.products?.length > 0 && (
            <div className="recommendation-list">
              {message.products.map((product) => (
                <ProductCard key={product.name} product={product} />
              ))}
            </div>
          )}
        </div>

        <div className="message-meta">
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {isBot && (
            <MessageFeedback
              message={message}
              onFeedback={onFeedback}
              feedback={feedback}
            />
          )}
        </div>
      </div>

      {!isBot && <div className="user-avatar">You</div>}
    </div>
  );
}

function FeedbackModal({ onClose, onSubmit, initialRating = 0 }) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState('');

  function submit(event) {
    event.preventDefault();

    if (rating === 0) return;

    onSubmit({ rating, comment });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="feedback-modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close feedback"
        >
          <X size={20} />
        </button>

        <div className="modal-icon">
          <Sparkles size={25} />
        </div>

        <h2>We value your feedback!</h2>

        <p>
          How would you rate your experience with Product Recommendation AI?
        </p>

        <div className="modal-stars">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              key={value}
              aria-label={`Rate ${value} stars`}
              onClick={() => setRating(value)}
              className={value <= rating ? 'star-selected' : ''}
            >
              <Star
                size={30}
                fill={value <= rating ? 'currentColor' : 'none'}
              />
            </button>
          ))}
        </div>

        <label htmlFor="finalFeedback">
          Tell us more (optional)
        </label>

        <textarea
          id="finalFeedback"
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Share your experience or suggestions..."
        />

        <button
          type="submit"
          className="primary-action"
          disabled={rating === 0}
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
}

function HistoryPage({ conversations, onDelete }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return conversations;
    }

    if (filter === 'unrated') {
      return conversations.filter((item) => !item.rating);
    }

    return conversations.filter(
      (item) => item.rating === Number(filter)
    );
  }, [conversations, filter]);

  return (
    <main className="history-page">
      <div className="history-heading">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          Back to Chat
        </Link>

        <span className="section-eyebrow">YOUR ACTIVITY</span>

        <h1>Conversation History</h1>

        <p>
          Review your previous product recommendations and feedback.
        </p>
      </div>

      <div className="history-toolbar">
        <div>
          <h2>Previous Suggestions</h2>
          <span>{filtered.length} conversations</span>
        </div>

        <div className="history-toolbar-actions">
          <Link to="/" className="primary-action">
            <Plus size={16} />
            New suggestion
          </Link>

          <select
            aria-label="Filter conversations by rating"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All ratings</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
            <option value="unrated">Not rated</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="history-empty">
          <History size={38} />

          <h3>No conversations found</h3>

          <p>Start a chat to see your recommendations here.</p>

          <Link to="/" className="primary-action">
            Start a conversation
          </Link>
        </div>
      ) : (
        <div className="history-list">
          {filtered.map((conversation) => (
            <article className="history-card" key={conversation.id}>
              <div className="history-card-top">
                <div className="history-card-icon">
                  <MessageCircle size={20} />
                </div>

                <div className="history-card-info">
                  <h3>
                    {conversation.title ||
                      'Product recommendation conversation'}
                  </h3>

                  <span>
                    {new Date(conversation.updatedAt).toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  className="delete-conversation"
                  aria-label="Delete conversation"
                  onClick={() => onDelete(conversation.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <p className="history-preview">
                {conversation.messages
                  ?.filter((message) => message.role === 'user')
                  .map((message) => message.content)
                  .join(' · ') || 'No user messages'}
              </p>

              <div className="history-card-bottom">
                <span className="history-rating">
                  {conversation.rating ? (
                    <>
                      <Star size={15} fill="currentColor" />
                      {conversation.rating}/5
                    </>
                  ) : (
                    'Not rated'
                  )}
                </span>

                <span>
                  {conversation.messages?.length || 0} messages
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function ChatPage({
  conversations,
  setConversations,
  feedbacks,
  setFeedbacks,
  theme,
  setTheme,
}) {
  const [messages, setMessages] = useState(createInitialMessages);
  const [input, setInput] = useState('');
  const [isBudgetPending, setIsBudgetPending] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function appendMessage(message) {
    setMessages((previous) => [...previous, message]);
  }

  function handleBotFeedback(messageId, feedback) {
    setFeedbacks((previous) => ({
      ...previous,
      [messageId]: feedback,
    }));
  }

  function handleAsk(event) {
    event.preventDefault();

    const query = input.trim();

    if (!query) return;

    appendMessage(createMessage('user', query));
    setInput('');
    setSaved(false);

    if (isBudgetPending && pendingProduct) {
      const budget = parseBudget(query);

      if (!budget) {
        appendMessage(
          createMessage(
            'assistant',
            'Please provide a valid budget range with two numbers, such as 500-1000.'
          )
        );
        return;
      }

      const matches = pendingProduct.recommendations.filter(
        (product) =>
          product.price >= budget.min &&
          product.price <= budget.max
      );

      if (matches.length === 0) {
        appendMessage(
          createMessage(
            'assistant',
            `I couldn't find ${pendingProduct.name.toLowerCase()} recommendations between ${formatPrice(budget.min)} and ${formatPrice(budget.max)}. Please try another budget range.`
          )
        );
      } else {
        appendMessage(
          createMessage(
            'assistant',
            `Here are my ${pendingProduct.name.toLowerCase()} recommendations between ${formatPrice(budget.min)} and ${formatPrice(budget.max)}:`,
            { products: matches }
          )
        );
      }

      setIsBudgetPending(false);
      setPendingProduct(null);
      return;
    }

    const product = getProduct(query);

    if (!product) {
      appendMessage(
        createMessage('assistant', responseData.fallback)
      );
      return;
    }

    setPendingProduct(product);
    setIsBudgetPending(true);

    appendMessage(
      createMessage('assistant', BUDGET_PROMPT)
    );
  }

  function saveConversation(
    currentMessages = messages,
    rating = null,
    comment = ''
  ) {
    const userMessages = currentMessages.filter(
      (message) => message.role === 'user'
    );

    if (userMessages.length === 0) return;

    const conversation = {
      id: createId(),
      title: userMessages[0]?.content || 'Product recommendation',
      messages: currentMessages,
      rating,
      comment,
      updatedAt: new Date().toISOString(),
    };

    setConversations((previous) => [
      conversation,
      ...previous,
    ]);

    return conversation;
  }

  function handleSave(event) {
    event.preventDefault();

    saveConversation();
    setSaved(true);
  }

  function resetConversation() {
    setMessages(createInitialMessages());
    setInput('');
    setIsBudgetPending(false);
    setPendingProduct(null);
    setSaved(false);
    setShowFeedback(false);
  }

  function handleNewSuggestion() {
    saveConversation();
    resetConversation();
  }

  function handleFinalFeedback(data) {
    saveConversation(messages, data.rating, data.comment);
    resetConversation();
  }

  return (
    <div className="app-layout">
      <aside
        className={`sidebar ${
          sidebarOpen ? 'sidebar-open' : ''
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Sparkles size={22} />
          </div>

          <span>
            Product<span>AI</span>
          </span>

          <button
            type="button"
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <button
          type="button"
          className="new-chat-button"
          onClick={handleNewSuggestion}
        >
          <Plus size={18} />
          New conversation
        </button>

        <Link
          to="/history"
          className="sidebar-link"
          onClick={() => setSidebarOpen(false)}
        >
          <History size={18} />
          Previous Recommendations
        </Link>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setTheme(theme === 'light' ? 'dark' : 'light')
            }
          >
            {theme === 'light' ? (
              <Moon size={18} />
            ) : (
              <Sun size={18} />
            )}

            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>

          <div className="sidebar-user">
            <div className="sidebar-user-avatar">U</div>

            <div>
              <strong>Guest User</strong>
              <span>Product explorer</span>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="chat-main">
        <header className="chat-header">
          <button
            type="button"
            className="mobile-menu"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="chat-header-title">
            <div className="header-bot-icon">
              <Bot size={19} />
            </div>

            <div>
              <h1>Product Recommendation AI</h1>
              <span>
                <i /> Online and ready to help
              </span>
            </div>
          </div>

          <button
            type="button"
            className="header-theme-toggle"
            aria-label="Toggle theme"
            onClick={() =>
              setTheme(theme === 'light' ? 'dark' : 'light')
            }
          >
            {theme === 'light' ? (
              <Moon size={19} />
            ) : (
              <Sun size={19} />
            )}
          </button>
        </header>

        <section className="chat-scroll-area">
          <div className="chat-welcome">
            <div className="welcome-icon">
              <Sparkles size={25} />
            </div>

            <h2>Welcome to Product Recommendation AI</h2>

            <p>
              Your personal shopping assistant. Tell me what you're
              looking for, and I'll help you find the right product.
            </p>

            <div className="suggestion-chips">
              {[
                'I need a laptop',
                'Suggest a mobile phone',
                'I want headphones',
              ].map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="messages-list">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onFeedback={handleBotFeedback}
                feedback={feedbacks[message.id]}
              />
            ))}

            <div ref={bottomRef} />
          </div>
        </section>

        <footer className="chat-composer-area">
          <form
            className="chat-composer"
            onSubmit={handleAsk}
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Please tell me about your query!"
              aria-label="Chat message"
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
            <form
              className="composer-save-form"
              onSubmit={handleSave}
            >
              <button type="submit">
                <Save size={16} />
                Save Conversation
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowFeedback(true)}
            >
              <Star size={16} />
              Rate this conversation
            </button>

            <button
              type="button"
              onClick={handleNewSuggestion}
            >
              <Plus size={16} />
              Want new suggestion?
            </button>
          </div>

          {saved && (
            <p className="save-confirmation">
              Conversation saved successfully!
            </p>
          )}

          <p className="composer-disclaimer">
            AI recommendations are suggestions. Please verify product
            details before purchasing.
          </p>
        </footer>
      </main>

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          onSubmit={handleFinalFeedback}
        />
      )}
    </div>
  );
}

export default function App() {
  const [conversations, setConversations] = useState(() =>
    readStorage(CHAT_KEY, [])
  );

  const [feedbacks, setFeedbacks] = useState(() =>
    readStorage(FEEDBACK_KEY, {})
  );

  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_KEY) || 'light'
  );

  useEffect(() => {
    localStorage.setItem(
      CHAT_KEY,
      JSON.stringify(conversations)
    );
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem(
      FEEDBACK_KEY,
      JSON.stringify(feedbacks)
    );
  }, [feedbacks]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function deleteConversation(id) {
    setConversations((previous) =>
      previous.filter(
        (conversation) => conversation.id !== id
      )
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ChatPage
            conversations={conversations}
            setConversations={setConversations}
            feedbacks={feedbacks}
            setFeedbacks={setFeedbacks}
            theme={theme}
            setTheme={setTheme}
          />
        }
      />

      <Route
        path="/history"
        element={
          <HistoryPage
            conversations={conversations}
            onDelete={deleteConversation}
          />
        }
      />
    </Routes>
  );
}
