import React, { useState } from 'react';
import { Plus, Calendar, CheckCircle2, Trash2, Clock, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';

export default function DeadlinesView({ 
  currentUser, 
  deadlines = [], 
  onAddDeadline, 
  onToggleDeadlineDone, 
  onDeleteDeadline 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Casa');
  const [priority, setPriority] = useState('media');
  const [notes, setNotes] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    onAddDeadline({
      title: title.trim(),
      due_date: dueDate,
      category,
      priority,
      notes: notes.trim(),
      created_by: currentUser?.id
    });

    setTitle('');
    setDueDate('');
    setNotes('');
    setIsModalOpen(false);
  };

  const getStatusBadge = (dueDateStr, isCompleted) => {
    if (isCompleted) {
      return <span className="badge badge-success">Completata</span>;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dueDateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return <span className="badge badge-danger">Scaduta da {Math.abs(diffDays)} giorni</span>;
    } else if (diffDays === 0) {
      return <span className="badge badge-danger">Scade oggi</span>;
    } else if (diffDays <= 3) {
      return <span className="badge badge-danger">Mancano {diffDays} giorni</span>;
    } else if (diffDays <= 7) {
      return <span className="badge badge-warning">Entro {diffDays} giorni</span>;
    } else {
      return <span className="badge badge-neutral">Tra {diffDays} giorni</span>;
    }
  };

  const now = new Date();
  const next7DaysDeadlines = deadlines.filter(d => {
    if (d.is_completed) return false;
    const diffDays = Math.ceil((new Date(d.due_date) - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          Scadenze e Promemoria
        </h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Nuova Scadenza
        </button>
      </div>

      {/* Riquadro separato: Scadenze Entro 7 Giorni */}
      {next7DaysDeadlines.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="card-header">
            <h3 className="card-title text-warning">
              <Clock size={20} />
              <span>In Scadenza nei Prossimi 7 Giorni ({next7DaysDeadlines.length})</span>
            </h3>
          </div>
          <div className="item-list">
            {next7DaysDeadlines.map(d => (
              <div key={d.id} className="item-row">
                <div className="item-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="item-title">{d.title}</span>
                    <span className="badge badge-muted">{d.category}</span>
                  </div>
                  <span className="item-meta">Data: {new Date(d.due_date).toLocaleDateString('it-IT')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getStatusBadge(d.due_date, d.is_completed)}
                  <button className="btn btn-secondary btn-sm" onClick={() => onToggleDeadlineDone(d.id)}>
                    Fatto
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Elenco Completo Tutte le Scadenze */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Tutte le Scadenze</h3>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{deadlines.length} totali</span>
        </div>

        {deadlines.length === 0 ? (
          <div className="empty-state">
            Nessuna scadenza inserita. Clicca su "Nuova Scadenza" per aggiungerne una.
          </div>
        ) : (
          <div className="item-list">
            {deadlines.map(d => (
              <div key={d.id} className="item-row" style={{ opacity: d.is_completed ? 0.65 : 1 }}>
                <div className="item-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="item-title" style={{ textDecoration: d.is_completed ? 'line-through' : 'none' }}>
                      {d.title}
                    </span>
                    <span className="badge badge-muted">{d.category}</span>
                    {d.priority === 'alta' && <span className="badge badge-danger">Alta Priorità</span>}
                  </div>
                  <div className="item-meta">
                    <span>Data: {new Date(d.due_date).toLocaleDateString('it-IT')}</span>
                    {d.notes && <span>• Note: {d.notes}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getStatusBadge(d.due_date, d.is_completed)}

                  <button 
                    className={`btn btn-sm ${d.is_completed ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => onToggleDeadlineDone(d.id)}
                  >
                    {d.is_completed ? 'Riapri' : 'Segna Fatto'}
                  </button>

                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => onDeleteDeadline(d.id)}
                    title="Elimina scadenza"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALE NUOVA SCADENZA */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Aggiungi una nuova scadenza">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Titolo scadenza</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. Pagamento Affitto, Autolettura Gas..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data entro cui completare</label>
            <input
              type="date"
              className="form-control"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {['Casa', 'Affitto', 'Spese', 'Turni', 'Bagno', 'Ospiti', 'Altro'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Priorità</label>
            <select
              className="form-control"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="bassa">Bassa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Note facoltative</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Dettagli aggiuntivi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            Salva Scadenza
          </button>
        </form>
      </Modal>
    </div>
  );
}
