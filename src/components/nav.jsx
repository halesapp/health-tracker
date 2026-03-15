const tabs = [
  { id: 'dashboard', label: 'Home', icon: '\u25A2' },
  { id: 'weight', label: 'Weight', icon: '\u2696' },
  { id: 'exercise', label: 'Exercise', icon: '\u269B' },
  { id: 'medication', label: 'Meds', icon: '+' },
  { id: 'vitals', label: 'Vitals', icon: '\u2665' },
  { id: 'settings', label: 'Settings', icon: '\u2699' },
]

export default function Nav({ active, onNavigate }) {
  return (
    <div class="nav-inner">
      <div class="nav-brand">Health Tracker</div>
      {tabs.map(t => (
        <button
          key={t.id}
          class={`nav-tab ${t.id === active ? 'active' : ''}`}
          onClick={() => onNavigate(t.id)}
        >
          <span class="nav-icon">{t.icon}</span>
          <span class="nav-label">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
