import React, { useState, useEffect } from 'react';
import { Settings, Copy, Check, LogOut, Save, User, Shield, Sliders, UserX, AlertTriangle, Palette, BellRing, Smartphone, Send } from 'lucide-react';
import Modal from '../components/Modal';
import { 
  isPushSupported, 
  isIosDevice, 
  isStandalonePwa, 
  getNotificationPermission, 
  getExistingSubscription, 
  subscribeUserToPush, 
  unsubscribeUserFromPush, 
  sendTestNotification 
} from '../lib/pushNotifications';

export default function SettingsView({ 
  currentUser, 
  house, 
  features = {}, 
  onUpdateHouse, 
  onUpdateProfile, 
  onLeaveHouse,
  onLogout,
  currentTheme = 'light',
  onSelectTheme
}) {
  // Stato Casa
  const [houseName, setHouseName] = useState(house?.name || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(null);

  // Stato Profilo Personale
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [iban, setIban] = useState(currentUser?.iban || '');
  const [paypal, setPaypal] = useState(currentUser?.paypal || '');
  const [revolut, setRevolut] = useState(currentUser?.revolut || '');
  const [satispay, setSatispay] = useState(currentUser?.satispay || '');

  const [houseSaved, setHouseSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Stato Notifiche Push
  const [pushSupported, setPushSupported] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushFeedback, setPushFeedback] = useState(null);

  useEffect(() => {
    const supported = isPushSupported();
    setPushSupported(supported);
    setIsIos(isIosDevice());
    setIsStandalone(isStandalonePwa());
    setPushPermission(getNotificationPermission());

    if (supported) {
      getExistingSubscription().then(sub => {
        setIsPushSubscribed(!!sub);
      });
    }
  }, []);

  const handleTogglePush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      if (isPushSubscribed) {
        await unsubscribeUserFromPush(currentUser?.id);
        setIsPushSubscribed(false);
        setPushFeedback({ type: 'success', text: 'Notifiche push disattivate su questo dispositivo.' });
      } else {
        await subscribeUserToPush(currentUser?.id);
        setIsPushSubscribed(true);
        setPushPermission('granted');
        setPushFeedback({ type: 'success', text: 'Notifiche push attivate con successo! Riceverai avvisi anche ad app chiusa.' });
      }
    } catch (err) {
      console.error('Errore gestione notifiche push:', err);
      setPushFeedback({ type: 'error', text: err.message || 'Impossibile attivare le notifiche push.' });
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      await sendTestNotification(currentUser?.id);
      setPushFeedback({ type: 'success', text: 'Notifica inviata! Controlla la tendina o il blocco schermo.' });
    } catch (err) {
      console.error('Errore invio notifica test:', err);
      setPushFeedback({ type: 'error', text: err.message || 'Errore nell\'invio della notifica di prova.' });
    } finally {
      setPushLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setAvatarUrl(currentUser.avatar_url || '');
      setIban(currentUser.iban || '');
      setPaypal(currentUser.paypal || '');
      setRevolut(currentUser.revolut || '');
      setSatispay(currentUser.satispay || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (house) {
      setHouseName(house.name || '');
    }
  }, [house]);

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

      {/* 2. Tema e Aspetto dell'App */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Palette size={20} />
            <span>Tema e Aspetto dell'App</span>
          </h3>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '16px' }}>
          Personalizza l'interfaccia con la tavolozza di colori che preferisci. Il tema viene salvato automaticamente nel tuo browser.
        </p>

        <div className="theme-grid">
          {[
            {
              id: 'light',
              name: 'Chiaro Standard',
              desc: 'Blu navy e salvia equilibrati',
              bg: '#eef1f5',
              surface: '#ffffff',
              primary: '#273b59',
              accent: '#3f6f68'
            },
            {
              id: 'dark',
              name: 'Scuro Moderno',
              desc: 'Ardesia e azzurro rilassante',
              bg: '#0f172a',
              surface: '#1e293b',
              primary: '#38bdf8',
              accent: '#10b981'
            },
            {
              id: 'midnight',
              name: 'Notte Profonda',
              desc: 'Nero AMOLED e ciano',
              bg: '#030712',
              surface: '#111827',
              primary: '#818cf8',
              accent: '#06b6d4'
            },
            {
              id: 'warm',
              name: 'Caldo Terracotta',
              desc: 'Argilla, ambra e toni caldi',
              bg: '#faf6f1',
              surface: '#ffffff',
              primary: '#c25e36',
              accent: '#557552'
            },
            {
              id: 'forest',
              name: 'Foresta Nordica',
              desc: 'Verde pino e menta luminosa',
              bg: '#061b14',
              surface: '#0e2a20',
              primary: '#34d399',
              accent: '#a7f3d0'
            }
          ].map(t => {
            const isActive = currentTheme === t.id;
            return (
              <div 
                key={t.id}
                className={`theme-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTheme && onSelectTheme(t.id)}
                role="button"
                tabIndex={0}
              >
                {isActive && (
                  <div className="theme-card-check">
                    <Check size={14} />
                  </div>
                )}
                <div 
                  className="theme-card-preview"
                  style={{ backgroundColor: t.bg }}
                >
                  <div 
                    className="theme-preview-bar"
                    style={{ backgroundColor: t.primary }}
                  />
                  <div 
                    className="theme-preview-card"
                    style={{ backgroundColor: t.surface, borderColor: t.primary + '40' }}
                  >
                    <div 
                      className="theme-preview-dot"
                      style={{ backgroundColor: t.accent }}
                    />
                    <div 
                      className="theme-preview-line"
                      style={{ backgroundColor: t.primary + '60' }}
                    />
                  </div>
                </div>

                <div className="theme-card-info">
                  <span className="theme-card-name">{t.name}</span>
                  <span className="theme-card-desc">{t.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Notifiche Push sul Telefono (anche ad App Chiusa) */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <BellRing size={20} />
            <span>Notifiche Push sul Telefono</span>
          </h3>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '16px' }}>
          Ricevi avvisi con suono e vibrazione direttamente sul telefono quando un coinquilino aggiunge una spesa, un turno o una scadenza, anche con l'app chiusa.
        </p>

        {isIos && !isStandalone && (
          <div style={{
            backgroundColor: 'var(--warning-soft)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            color: 'var(--text)',
            lineHeight: 1.5
          }}>
            <strong>📱 Requisito Apple per iPhone:</strong> Per ricevere notifiche a schermo spento, apri Safari, tocca il pulsante <strong>Condividi [↑]</strong> in basso e seleziona <strong>"Aggiungi alla schermata Home"</strong>. Successivamente apri l'app dalla Home e attiva le notifiche da qui!
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px',
          backgroundColor: 'var(--surface-soft)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isPushSubscribed ? 'var(--accent)' : 'var(--muted)',
                display: 'inline-block'
              }} />
              <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>
                {isPushSubscribed ? 'Notifiche Attive su questo dispositivo' : 'Notifiche Non Attive'}
              </strong>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
              {isPushSubscribed 
                ? 'Questo telefono riceverà avvisi sonori e vibrazioni per le spese e i turni.' 
                : 'Abilita il dispositivo per non perderti spese e turni di pulizia della casa.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              className={`btn ${isPushSubscribed ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleTogglePush}
              disabled={pushLoading}
            >
              <Smartphone size={16} />
              {pushLoading 
                ? 'Operazione in corso...' 
                : isPushSubscribed 
                  ? 'Disattiva Notifiche' 
                  : 'Attiva Notifiche sul Telefono'}
            </button>

            {isPushSubscribed && (
              <button 
                className="btn btn-secondary"
                onClick={handleSendTestPush}
                disabled={pushLoading}
                title="Invia una notifica di test al telefono per provare subito"
              >
                <Send size={16} />
                Prova Notifica
              </button>
            )}
          </div>
        </div>

        {pushFeedback && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.86rem',
            backgroundColor: pushFeedback.type === 'error' ? 'var(--danger-soft)' : 'var(--accent-soft)',
            color: pushFeedback.type === 'error' ? 'var(--danger)' : 'var(--accent)',
            border: `1px solid ${pushFeedback.type === 'error' ? 'var(--danger)' : 'var(--accent)'}`
          }}>
            {pushFeedback.text}
          </div>
        )}
      </div>

      {/* 4. Interruttori Funzionalità Opzionali */}
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

      {/* 4. Abbandona Casa e Disconnessione */}
      <div className="card" style={{ borderColor: 'var(--danger-soft)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Abbandona Casa */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)' }}>Abbandona questa Casa</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Rimuovi la tua appartenenza a {house?.name || 'questa casa'}. Non riceverai più notifiche.
              </p>
            </div>
            <button className="btn btn-danger" onClick={() => setIsLeaveModalOpen(true)}>
              <UserX size={18} />
              Abbandona Casa
            </button>
          </div>

          {/* Disconnessione */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Disconnessione</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Esci dal tuo account su questo dispositivo.</p>
            </div>
            <button className="btn btn-secondary" onClick={onLogout}>
              <LogOut size={18} />
              Disconnettiti
            </button>
          </div>
        </div>
      </div>

      {/* MODALE CONFERMA ABBANDONA CASA */}
      <Modal 
        isOpen={isLeaveModalOpen} 
        onClose={() => {
          if (!isLeaving) {
            setIsLeaveModalOpen(false);
            setLeaveError(null);
          }
        }} 
        title="Confermi di voler abbandonare la casa?"
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger-soft)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <AlertTriangle size={24} />
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: '12px' }}>
            Stai per uscire da <strong>{house?.name}</strong>.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: leaveError ? '12px' : '24px' }}>
            Se abbandoni la casa non avrai più accesso ai dati condivisi né riceverai notifiche. Potrai comunque creare o accedere a un'altra casa.
          </p>

          {leaveError && (
            <div style={{
              backgroundColor: 'var(--danger-soft)',
              color: 'var(--danger)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '20px',
              textAlign: 'left',
              lineHeight: 1.4
            }}>
              <strong>Attenzione:</strong> {leaveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-secondary btn-block" 
              onClick={() => {
                setIsLeaveModalOpen(false);
                setLeaveError(null);
              }}
              disabled={isLeaving}
            >
              Annulla
            </button>
            <button 
              className="btn btn-danger btn-block" 
              onClick={async () => {
                try {
                  setIsLeaving(true);
                  setLeaveError(null);
                  await onLeaveHouse();
                  setIsLeaveModalOpen(false);
                } catch (err) {
                  console.error('Errore durante abbandono casa:', err);
                  setLeaveError(err.message || 'Si è verificato un errore durante l\'uscita dalla casa. Riprova.');
                } finally {
                  setIsLeaving(false);
                }
              }}
              disabled={isLeaving}
            >
              {isLeaving ? 'Uscita in corso...' : 'Sì, Abbandona'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

