import React from 'react';
import { 
  Home, 
  CreditCard, 
  Calendar, 
  CheckSquare, 
  ShoppingBag, 
  Bath, 
  Users, 
  FileText, 
  MessageSquare, 
  Settings,
  Home as HomeIcon,
  LogOut
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  houseName, 
  features = {}, 
  isOpen, 
  onClose,
  currentUser,
  onLogout
}) {
  // Configurazione di tutte le voci di menu nell'ordine esatto richiesto
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, isAlwaysVisible: true },
    { id: 'expenses', label: 'Spese', icon: CreditCard, isAlwaysVisible: true },
    { id: 'deadlines', label: 'Scadenze', icon: Calendar, isAlwaysVisible: true },
    { id: 'tasks', label: 'Turni', icon: CheckSquare, isAlwaysVisible: true },
    { id: 'shopping_list', label: 'Lista della spesa', icon: ShoppingBag, featureKey: 'shopping_list' },
    { id: 'bathroom', label: 'Bagno', icon: Bath, featureKey: 'bathroom' },
    { id: 'guests', label: 'Ospiti', icon: Users, featureKey: 'guests' },
    { id: 'rules', label: 'Regole', icon: FileText, featureKey: 'rules' },
    { id: 'board', label: 'Bacheca', icon: MessageSquare, isAlwaysVisible: true },
    { id: 'settings', label: 'Impostazioni', icon: Settings, isAlwaysVisible: true },
  ];

  // Filtra le voci in base ai feature flag attivati nelle impostazioni della casa
  const visibleMenuItems = menuItems.filter(item => {
    if (item.isAlwaysVisible) return true;
    return features[item.featureKey] !== false; // Di default true se non specificato diversamente
  });

  const handleSelectTab = (tabId) => {
    setCurrentTab(tabId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Overlay scuro semi-trasparente per schermate responsive (<1100px) */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="app-brand">
            <div className="app-brand-icon">
              <HomeIcon size={20} />
            </div>
            <div>
              <div className="app-title">Coinquilini</div>
              <div className="house-subtitle">{houseName || 'La tua casa'}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectTab(item.id)}
              >
                <span className="nav-item-icon">
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-mini-card">
            <div className="avatar accent-1" style={{ width: '32px', height: '32px', fontSize: '0.78rem' }}>
              {(currentUser?.full_name || currentUser?.user_metadata?.full_name || currentUser?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="user-mini-info">
              <div className="user-mini-name">{currentUser?.full_name || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Utente'}</div>
              <div className="user-mini-email">{currentUser?.email || ''}</div>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={onLogout} 
              title="Disconnetti"
              style={{ padding: '6px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
