import React, { useMemo, useState } from 'react';
import './InfoBox.css';

type LegendItem = {
  id: string;
  label: string;
  color?: string;
  shape?: 'circle' | 'square';
  size?: number;
  switch?: boolean;   // si lleva switch
  checked?: boolean;  // estado desde el padre
};

export type InfoBoxSection = {
  title: string;
  items: LegendItem[];
};

type InfoBoxProps = {
  title: string;
  subtitle?: string;
  sections: InfoBoxSection[];
  onToggle?: (id: string) => void;
  initialOpen?: boolean;
};

/** Toggle “gooey” (Uiverse) convertido a componente controlado */
const GooToggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}> = ({ checked, onChange, ariaLabel }) => {
  const id = useMemo(() => `goo-${Math.random().toString(36).slice(2, 9)}`, []);
  return (
    <div className="toggle-container" aria-label={ariaLabel}>
      <input
        id={id}
        type="checkbox"
        className="toggle-input"
        checked={checked}
        onChange={onChange}
        aria-checked={checked}
        role="switch"
      />
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 292 142" className="toggle" aria-hidden="true">
        <path
          d="M71 142C31.7878 142 0 110.212 0 71C0 31.7878 31.7878 0 71 0C110.212 0 119 30 146 30C173 30 182 0 221 0C260 0 292 31.7878 292 71C292 110.212 260.212 142 221 142C181.788 142 173 112 146 112C119 112 110.212 142 71 142Z"
          className="toggle-background"
        />
        <rect rx="6" height="64" width="12" y="39" x="64" className="toggle-icon on" />
        <path
          d="M221 91C232.046 91 241 82.0457 241 71C241 59.9543 232.046 51 221 51C209.954 51 201 59.9543 201 71C201 82.0457 209.954 91 221 91ZM221 103C238.673 103 253 88.6731 253 71C253 53.3269 238.673 39 221 39C203.327 39 189 53.3269 189 71C189 88.6731 203.327 103 221 103Z"
          fillRule="evenodd"
          className="toggle-icon off"
        />
        <g filter="url(#goo)">
          <rect fill="#fff" rx="29" height="58" width="116" y="42" x="13" className="toggle-circle-center" />
          <rect fill="#fff" rx="58" height="114" width="114" y="14" x="14" className="toggle-circle left" />
          <rect fill="#fff" rx="58" height="114" width="114" y="14" x="164" className="toggle-circle right" />
        </g>
        <filter id="goo">
          <feGaussianBlur stdDeviation="10" result="blur" in="SourceGraphic" />
          <feColorMatrix result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" in="blur" type="matrix" />
        </filter>
      </svg>
    </div>
  );
};

const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  subtitle,
  sections,
  onToggle,
  initialOpen = true,
}) => {
  const [open, setOpen] = useState(initialOpen);

  return (
    <>
      {/* Botón flotante cuando el panel está oculto */}
      {!open && (
        <button
          className="floating-reveal-btn blink"
          onClick={() => setOpen(true)}
          aria-label="Mostrar panel"
          title="Mostrar panel"
        >
          {/* Chevron hacia la izquierda (entra desde la izquierda) */}
          <span className="chev right" />
        </button>
      )}

      <aside className={`info-box ${open ? 'open' : 'closed'}`} aria-hidden={!open}>
        <header className="info-header">
          <div className="titles">
            <h2 className="info-title">{title}</h2>
            {subtitle && <p className="info-subtitle">{subtitle}</p>}
          </div>

          {/* Botón para ocultar (empuja a la derecha) */}
          <button
            className="side-toggle"
            onClick={() => setOpen(false)}
            aria-label="Ocultar panel"
            title="Ocultar panel"
          >
            {/* Chevron hacia la derecha */}
            <span className="chev left" />
          </button>
        </header>

        <div className="info-content">
          {sections.map((section, sIdx) => (
            <section className="legend-section" key={sIdx}>
              <div className="legend-title">{section.title}</div>

              {section.items.map((item) => (
                <div className="legend-row" key={item.id}>
                  {item.shape && item.color && (
                    <span
                      className={`shape ${item.shape}`}
                      style={{ backgroundColor: item.color, width: 12, height: 12 }}
                    />
                  )}

                  <span className="legend-label">{item.label}</span>

                  {item.switch && (
                    <GooToggle
                      checked={!!item.checked}
                      onChange={() => onToggle && onToggle(item.id)}
                      ariaLabel={`Activar/Desactivar ${item.label}`}
                    />
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </aside>
    </>
  );
};

export default InfoBox;
