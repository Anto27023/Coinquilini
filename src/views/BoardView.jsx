import React, { useState } from 'react';
import { Send, MessageSquare, Trash2 } from 'lucide-react';

export default function BoardView({ 
  currentUser, 
  members = [], 
  boardMessages = [], 
  onAddBoardMessage, 
  onDeleteBoardMessage 
}) {
  const [message, setMessage] = useState('');

  const handlePostMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    onAddBoardMessage({
      user_id: currentUser?.id,
      message: message.trim()
    });

    setMessage('');
  };

  const accentClasses = ['accent-1', 'accent-2', 'accent-3', 'accent-4', 'accent-5'];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          Bacheca e Avvisi della Casa
        </h2>
      </div>

      {/* Form di pubblicazione messaggio */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handlePostMessage}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Scrivi un avviso o un messaggio ai tuoi coinquilini</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Es. Qualcuno sa se domani passa il tecnico del gas? Oppure: Stasera cena insieme!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Send size={16} />
              Pubblica in Bacheca
            </button>
          </div>
        </form>
      </div>

      {/* Feed cronologico messaggi */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <MessageSquare size={20} />
            <span>Feed Messaggi ({boardMessages.length})</span>
          </h3>
        </div>

        {boardMessages.length === 0 ? (
          <div className="empty-state">
            La bacheca è vuota! Scrivi il primo messaggio sopra per iniziare la conversazione.
          </div>
        ) : (
          <div className="item-list">
            {boardMessages.map(msg => {
              const author = members.find(m => m.id === msg.user_id);
              const authorIdx = members.findIndex(m => m.id === msg.user_id);
              const accentClass = accentClasses[(authorIdx >= 0 ? authorIdx : 0) % accentClasses.length];
              const initial = (author?.full_name || 'C').charAt(0).toUpperCase();
              const isMine = msg.user_id === currentUser?.id;

              return (
                <div key={msg.id} className="item-row" style={{ alignItems: 'flex-start', padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div className={`avatar ${accentClass}`} style={{ flexShrink: 0, width: '40px', height: '40px' }}>
                      {initial}
                    </div>
                    <div className="item-info" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>
                          {author?.full_name || 'Coinquilino'}
                        </span>
                        <span className="item-meta">
                          {new Date(msg.created_at || Date.now()).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p style={{ marginTop: '6px', color: 'var(--text)', fontSize: '0.92rem', whiteSpace: 'pre-wrap' }}>
                        {msg.message}
                      </p>
                    </div>
                  </div>

                  {isMine && (
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => onDeleteBoardMessage(msg.id)}
                      title="Elimina il tuo messaggio"
                      style={{ marginTop: '2px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
