import { SERVICES, money } from '../lib/services';

export default function ServicesList({ selectedId, onSelect }) {
  return (
    <div className="service-grid">
      {SERVICES.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`service-card${selectedId === s.id ? ' selected' : ''}`}
          onClick={() => onSelect(s.id)}
        >
          <span className="service-name">{s.name}</span>
          <span className="service-price">
            {money(s.price)} <small>{s.unit}</small>
          </span>
          <span className="service-blurb">{s.blurb}</span>
        </button>
      ))}
    </div>
  );
}
