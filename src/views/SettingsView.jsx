import React, { useState } from 'react';
import { Settings, Copy, Check, LogOut, Save, User, Shield, Sliders } from 'lucide-react';

export default function SettingsView({ 
  currentUser, 
  house, 
  features = {}, 
  onUpdateHouse, 
  onUpdateProfile, 
  onLogout 
}) {
  // Stato Casa
  const [houseName, setHouseName] = useState(house?.name || '');
  const [copiedCode, setCopiedCode] = useState(false);

  // Stato Profilo Personale
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [iban, setIban] = useState(currentUser?.iban || '');
  const [paypal, setPaypal] = useState(currentUser?.paypal || '');
  const [revolut, setRevolut] = useState(currentUser?.revolut || '');
  const [satispay, setSatispay] = useState(currentUser?.satispay || '');

  const [houseSaved, setHouseSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const handleCopyCode = () => {
    if (house?.invite_code) {
      navigator.clipboard.writeText(house.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSaveHouse = (e) => {
    e.preventDefault();
    if (!houseName.trim()) return;
    onUpdateHouse({ name: houseName.trim() });
    setHouseSaved(true);
    setTimeout(() => setHouseSaved(false), 2000);
  };

  const handleToggleFeature = (featureKey) => {
    const updatedFeatures = {
      ...features,
      [featureKey]: features[featureKey] === false ? true : false
    };
    onUpdateHouse({ features: updatedFeatures });
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    onUpdateProfile({
      full_name: fullName.trim(),
      avatar_url: avatarUrl.trim(),
      iban: iban.trim(),
      paypal: paypal.trim(),
      revolut: revolut.trim(),
      satispay: satispay.trim()
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          Impostazioni Casa e Profilo
        </h2>
      </div>

      {/* 1. Gestione Codice Invito e Nome Casa */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Settings size={20} />
            <span>Impostazioni della Casa</span>
          </h3>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Codice Invito per i tuoi Coinquilini</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-control"
              value={house?.invite_code || 'FS-XXXXXX'}
              readOnly
              style={{ fontWeight: 800, letterSpacing: '2px', fontSize: '1.1rem', backgroundColor: 'var(--surface-soft)' }}
            />
            <button className="btn btn-secondary" onClick={handleCopyCode}>
              {copiedCode ? <Check size={18} color="var(--accent)" /> : <Copy size={18} />}
              {copiedCode ? 'Copiato!' : 'Copia Codice'}
            </button>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
            Condividi questo codice con i nuovi coinquilini per farli accedere a questa casa.
          </span>
        </div>

        <form onSubmit={handleSaveHouse}>
          <div className="form-group">
            <label className="form-label">Nome della Casa</label>
            <input
              type="text"
              className="form-control"
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              Salva Nome Casa
            </button>
            {houseSaved && <span className="text-accent" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Salvato!</span>}
          </div>
        </form>
      </div>

      {/* 2. Interruttori Funzionalità Opzionali */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Sliders size={20} />
            <span>Attivazione Funzionalità della Casa</span>
          </h3>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '16px' }}>
          Attiva o disattiva le sezioni nel menu principale a seconda delle esigenze dei coinquilini.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {[
            { key: 'rent', label: 'Spese Affitto' },
            { key: 'bills', label: 'Spese Bollette' },
            { key: 'groceries', label: 'Spese Spesa comune' },
            { key: 'products', label: 'Spese Prodotti casa' },
            { key: 'shopping_list', label: 'Sezione Lista della spesa' },
            { key: 'bathroom', label: 'Sezione Bagno (prenotazioni)' },
            { key: 'guests', label: 'Sezione Registro Ospiti' },
            { key: 'rules', label: 'Sezione Regole della casa' }
          ].map(item => {
            const isEnabled = features[item.key] !== false;
            return (
              <div 
                key={item.key} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface-soft)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.label}</span>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleToggleFeature(item.key)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Dati Profilo Personale e Coordinate di Pagamento */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <User size={20} />
            <span>Profilo e Coordinate di Pagamento</span>
          </h3>
        </div>

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">URL Avatar (opzionale)</label>
              <input
                type="text"
                className="form-control"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '16px', marginBottom: '12px', color: 'var(--primary-dark)' }}>
            Metodi di Pagamento per Rimborsi (Visibili ai Coinquilini)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">IBAN</label>
              <input
                type="text"
                className="form-control"
                placeholder="IT60X..."
                value={iban}
                onChange={(e) => setIban(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">PayPal (Email o Link)</label>
              <input
                type="text"
                className="form-control"
                placeholder="paypal.me/..."
                value={paypal}
                onChange={(e) => setPaypal(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Revolut (@tag)</label>
              <input
                type="text"
                className="form-control"
                placeholder="@tuotag"
                value={revolut}
                onChange={(e) => setRevolut(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Satispay (Numero)</label>
              <input
                type="text"
                className="form-control"
                placeholder="3331234567"
                value={satispay}
                onChange={(e) => setSatispay(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              Salva Profilo
            </button>
            {profileSaved && <span className="text-accent" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Profilo salvato!</span>}
          </div>
        </form>
      </div>

      {/* 4. Pulsante Disconnessione */}
      <div className="card" style={{ borderColor: 'var(--danger-soft)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)' }}>Disconnessione</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Esci dal tuo account su questo dispositivo.</p>
          </div>
          <button className="btn btn-danger" onClick={onLogout}>
            <LogOut size={18} />
            Disconnettiti
          </button>
        </div>
      </div>
    </div>
  );
}
