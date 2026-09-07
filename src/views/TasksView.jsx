import React, { useState } from 'react';
import { Plus, CheckSquare, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import Modal from '../components/Modal';

export default function TasksView({ 
  currentUser, 
  members = [], 
  tasks = [], 
  onAddTask, 
  onToggleTaskDone, 
  onDeleteTask 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState(currentUser?.id || (members[0]?.id || ''));
  const [frequency, setFrequency] = useState('Settimanale');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      assigned_to: assignedTo,
      frequency
    });

    setTitle('');
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          Turni e Pulizie di Casa
        </h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Nuovo Turno
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <CheckSquare size={20} />
            <span>Elenco Turni</span>
          </h3>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{tasks.length} compiti</span>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state">
            Nessun turno inserito. Clicca su "Nuovo Turno" per assegnare i compiti di casa.
          </div>
        ) : (
          <div className="item-list">
            {tasks.map(t => {
              const assignee = members.find(m => m.id === t.assigned_to);
              return (
                <div key={t.id} className="item-row" style={{ opacity: t.is_completed ? 0.7 : 1 }}>
                  <div className="item-info">
                    <span className="item-title" style={{ textDecoration: t.is_completed ? 'line-through' : 'none' }}>
                      {t.title}
                    </span>
                    <div className="item-meta">
                      <span>Assegnato a: <strong>{assignee?.full_name || 'Tutti'}</strong></span>
                      <span>•</span>
                      <span>Frequenza: {t.frequency}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${t.is_completed ? 'badge-success' : 'badge-neutral'}`}>
                      {t.is_completed ? 'Completato' : 'Da fare'}
                    </span>

                    <button 
                      className={`btn btn-sm ${t.is_completed ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => onToggleTaskDone(t.id)}
                    >
                      {t.is_completed ? (
                        <>
                          <RotateCcw size={14} />
                          Riapri
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Fatto
                        </>
                      )}
                    </button>

                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => onDeleteTask(t.id)}
                      title="Elimina turno"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE NUOVO TURNO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Aggiungi nuovo turno">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Nome del compito</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. Pulire il bagno, Portare fuori la spazzatura..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assegnato a</label>
            <select
              className="form-control"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Frequenza</label>
            <select
              className="form-control"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="Giornaliero">Giornaliero</option>
              <option value="Settimanale">Settimanale</option>
              <option value="Ogni 2 settimane">Ogni 2 settimane</option>
              <option value="Mensile">Mensile</option>
              <option value="Quando serve">Quando serve</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            Salva Turno
          </button>
        </form>
      </Modal>
    </div>
  );
}
