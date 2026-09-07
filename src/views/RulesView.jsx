import React, { useState } from 'react';
import { Plus, FileText, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function RulesView({ 
  currentUser, 
  rules = [], 
  onAddRule, 
  onDeleteRule 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleText, setRuleText] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!ruleText.trim()) return;

    onAddRule({
      rule_text: ruleText.trim(),
      created_by: currentUser?.id
    });

    setRuleText('');
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          Regole della Casa
        </h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Nuova Regola
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FileText size={20} />
            <span>Regolamento Condiviso</span>
          </h3>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{rules.length} regole stabili</span>
        </div>

        {rules.length === 0 ? (
          <div className="empty-state">
            Nessuna regola definita al momento. Clicca su "Nuova Regola" per aggiungerne una.
          </div>
        ) : (
          <div className="item-list">
            {rules.map((r, idx) => (
              <div key={r.id} className="item-row">
                <div className="item-info">
                  <span className="item-title" style={{ fontSize: '0.95rem' }}>
                    <strong>{idx + 1}.</strong> {r.rule_text}
                  </span>
                </div>

                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={() => onDeleteRule(r.id)}
                  title="Elimina regola"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALE NUOVA REGOLA */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Aggiungi una regola per la casa">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Testo della regola</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Es. Spegnere le luci quando si esce da una stanza, rispettare la raccolta differenziata..."
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            Aggiungi al Regolamento
          </button>
        </form>
      </Modal>
    </div>
  );
}
