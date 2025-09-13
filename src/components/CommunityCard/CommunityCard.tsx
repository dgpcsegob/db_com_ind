import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import './CommunityCard.css';
import type { CommunityData } from '../../types';

interface CommunityCardProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  isDarkTheme: boolean;
}

// Datos mock basados en el HTML proporcionado
const communityData: { [key: string]: CommunityData } = {
  '20220705201690001': {
    id: '20220705201690001',
    nombre: 'Santa Rita Sonora',
    entidad: '(07) Chiapas',
    municipio: '(052) Las Margaritas',
    localidad: '(0169) Santa Rita Sonora',
    pueblo: 'Tojolabal',
    region: 'Región Tojolabal',
    numeroRegistro: '20220705201690001',
    unidadAdministrativa: 'C.C.P.I. Las Margaritas',
    poblacion: 1075,
    latitud: 16.519952774048,
    longitud: -92.017471313477,
    altitud: 1574
  }
};

const tabContent = {
  general: {
    title: 'Datos Generales',
    icon: '📋'
  },
  territorio: {
    title: 'Territorio',
    icon: '🗺️'
  },
  cultura: {
    title: 'Cultura e Identidad',
    icon: '🎭'
  },
  politico: {
    title: 'Político',
    icon: '🏛️'
  },
  juridico: {
    title: 'Jurídico',
    icon: '⚖️'
  },
  social: {
    title: 'Social',
    icon: '👥'
  },
  economia: {
    title: 'Economía',
    icon: '💰'
  },
  observaciones: {
    title: 'Observaciones',
    icon: '📝'
  },
  registrales: {
    title: 'Datos Registrales',
    icon: '📄'
  }
};

const CommunityCard: React.FC<CommunityCardProps> = ({
  isOpen,
  onClose,
  communityId,
  isDarkTheme
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const cardRef = useRef<HTMLDivElement>(null);
  
  const community = communityData[communityId];

  if (!isOpen || !community) return null;

  const exportToPDF = async () => {
    if (!cardRef.current) return;

    const element = cardRef.current.cloneNode(true) as HTMLElement;
    
    // Remove close button and export button from clone
    const closeBtn = element.querySelector('.close-btn');
    const exportBtn = element.querySelector('.export-btn');
    if (closeBtn) closeBtn.remove();
    if (exportBtn) exportBtn.remove();

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `ficha_${community.nombre.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true 
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        putOnlyUsedFonts: true
      }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intente de nuevo.');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="tab-content-section">
            <div className="info-grid">
              <div className="info-row">
                <strong>Nombre en lengua indígena:</strong>
                <span>No tiene</span>
              </div>
              <div className="info-row">
                <strong>Significado del nombre:</strong>
                <span>No aplica</span>
              </div>
              <div className="info-row">
                <strong>Pueblos que la conforman:</strong>
                <span>{community.pueblo}</span>
              </div>
              <div className="info-row">
                <strong>Autodenominación:</strong>
                <span>Tojol winik</span>
              </div>
            </div>
            
            <div className="table-section">
              <h4>Tipo de comunidad</h4>
              <table>
                <thead>
                  <tr>
                    <th>Según el pueblo</th>
                    <th>Por asentamientos</th>
                    <th>Por hábitat</th>
                    <th>Por antigüedad</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Indígena</td>
                    <td>Nuclear</td>
                    <td>Rural</td>
                    <td>Asentamiento antiguo</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="table-section">
              <h4>Localidad sede</h4>
              <table>
                <thead>
                  <tr>
                    <th>Entidad</th>
                    <th>Municipio</th>
                    <th>Localidad</th>
                    <th>Latitud</th>
                    <th>Longitud</th>
                    <th>Altitud</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{community.entidad}</td>
                    <td>{community.municipio}</td>
                    <td>{community.localidad}</td>
                    <td>{community.latitud}</td>
                    <td>{community.longitud}</td>
                    <td>{community.altitud}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      
      case 'territorio':
        return (
          <div className="tab-content-section">
            <div className="table-section">
              <h4>Formas de tenencia de la tierra</h4>
              <table>
                <thead>
                  <tr>
                    <th>Forma de tenencia</th>
                    <th>Certificación</th>
                    <th>Tipo de documento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ejido</td>
                    <td>Sí</td>
                    <td>Carpeta Básica (resolución presidencial, acta de posesión, deslinde y plano definitivo)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="info-section">
              <h4>Lugares sagrados</h4>
              <p><strong>¿Hay lugares sagrados?:</strong> Sí</p>
              <p><strong>En el territorio:</strong> Sí</p>
              <p><strong>Fuera del territorio:</strong> No</p>
            </div>

            <div className="description-section">
              <h4>Descripción del territorio</h4>
              <p>Santa Rita, Sonora, se localiza dentro de la región socioeconómica Meseta Comiteca Tojolabal y en la región fisiográfica Montañas del Oriente. Su clima es templado. En ella podemos encontrar árboles silvestres como el ocote, el roble, ch'umix, cipres y chakaj, pajulul, chiki nib', suk, ich taj y k'an te'. Animales silvestres: el venado, el armadillo, jabalí, conejo, tlacuache, ardilla, coyote, gato de monte y tepescuintle.</p>
            </div>
          </div>
        );

      case 'cultura':
        return (
          <div className="tab-content-section">
            <div className="table-section">
              <h4>Rasgos identitarios</h4>
              <table>
                <tbody>
                  <tr><td>Lengua que hablan: Tojolabal</td></tr>
                  <tr><td>Vestimenta: Vestidos con listones (mujeres), trajes de manta blanca (hombres)</td></tr>
                  <tr><td>Celebraciones: Fiesta patronal (4 días de fiesta)</td></tr>
                  <tr><td>Autoridades: Se basan en reglamento interno o usos y costumbres</td></tr>
                </tbody>
              </table>
            </div>

            <div className="info-section">
              <h4>Religión y prácticas espirituales</h4>
              <p><strong>Religión:</strong> Católicos</p>
              <p><strong>Prácticas espirituales:</strong> Celebración de la Santa Patrona del lugar, rezos, oraciones, canto en la iglesia y tocar tambor alrededor de la Cruz.</p>
            </div>

            <div className="table-section">
              <h4>Principales fiestas</h4>
              <table>
                <thead>
                  <tr>
                    <th>Fiesta</th>
                    <th>Responsables</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Virgen de Santa Rita</td>
                    <td>Catequista de la Iglesia Católica</td>
                    <td>22 de mayo</td>
                  </tr>
                  <tr>
                    <td>Virgen de Guadalupe</td>
                    <td>Catequista de la Iglesia Católica</td>
                    <td>12 de diciembre</td>
                  </tr>
                  <tr>
                    <td>Nacimiento del Niño Dios</td>
                    <td>Catequista de la Iglesia Católica</td>
                    <td>25 de diciembre</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'politico':
        return (
          <div className="tab-content-section">
            <div className="description-section">
              <h4>Sistema de gobierno</h4>
              <p>La Asamblea Comunitaria de Santa Rita Sonora es el espacio donde se analiza, discute y toman acuerdos sobre diversos asuntos relacionados con la vida comunitaria. El Comisariado Ejidal tiene duración de 3 años e incluye Presidente, Secretario, Tesorero y vocales.</p>
            </div>

            <div className="table-section">
              <h4>Autoridades</h4>
              <table>
                <thead>
                  <tr>
                    <th>Autoridad</th>
                    <th>Duración</th>
                    <th>Forma de elección</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Presidente del Comisariado Ejidal</td>
                    <td>3 años</td>
                    <td>Asamblea de ejidatarios por mayoría de voto a mano alzada</td>
                  </tr>
                  <tr>
                    <td>Consejo de Vigilancia</td>
                    <td>3 años</td>
                    <td>Asamblea de ejidatarios por mayoría de voto a mano alzada</td>
                  </tr>
                  <tr>
                    <td>Agente Municipal</td>
                    <td>1 año</td>
                    <td>Asamblea de ejidatarios por mayoría de voto a mano alzada</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="info-section">
              <h4>Participación de mujeres</h4>
              <p><strong>¿Pueden ocupar cargos?:</strong> Sí</p>
              <p><strong>Cargos disponibles:</strong> Suplente del Agente Municipal y Comité de Educación</p>
            </div>
          </div>
        );

      case 'juridico':
        return (
          <div className="tab-content-section">
            <div className="table-section">
              <h4>Ciudadanía comunitaria</h4>
              <table>
                <tbody>
                  <tr><td>Personas con padres y madres de la comunidad</td></tr>
                  <tr><td>Personas que nacen en la comunidad</td></tr>
                </tbody>
              </table>
            </div>

            <div className="list-section">
              <h4>Requerimientos para formar parte de la comunidad</h4>
              <ol>
                <li>Participar en el sistema de cargos</li>
                <li>Pertenecer a algún comité</li>
                <li>Hablar la lengua</li>
                <li>Pertenecer a una familia</li>
                <li>Compartir las fiestas y tradiciones</li>
                <li>Vivir en la comunidad</li>
                <li>Reconocer a la autoridad</li>
              </ol>
            </div>

            <div className="list-section">
              <h4>Principios y valores</h4>
              <ul>
                <li>Respeto a los adultos mayores</li>
                <li>Respeto a las mujeres</li>
                <li>Respeto y cuidado del territorio</li>
                <li>Ayuda mutua y solidaridad</li>
                <li>Honestidad</li>
                <li>Participación y organización</li>
              </ul>
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="tab-content-section">
            <div className="info-section">
              <h4>Estructura social</h4>
              <p><strong>Número de familias:</strong> 600 aproximadamente</p>
              <p><strong>Población total:</strong> {community.poblacion.toLocaleString()}</p>
            </div>

            <div className="table-section">
              <h4>Atención a la salud</h4>
              <table>
                <thead>
                  <tr>
                    <th>Tipo de atención</th>
                    <th>Disponibilidad</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Médicos particulares</td><td>Sí</td></tr>
                  <tr><td>Casa de Salud</td><td>Sí</td></tr>
                  <tr><td>Partera</td><td>Sí</td></tr>
                </tbody>
              </table>
            </div>

            <div className="table-section">
              <h4>Medicina tradicional</h4>
              <table>
                <thead>
                  <tr>
                    <th>Especialista</th>
                    <th>Padecimientos que atiende</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Partera</td>
                    <td>Seguimiento a mujeres embarazadas, mal de ojo y dolor de estómago</td>
                  </tr>
                  <tr>
                    <td>Huesero</td>
                    <td>Acomodar huesos fracturados, luxaciones y golpes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'economia':
        return (
          <div className="tab-content-section">
            <div className="table-section">
              <h4>Actividades económicas principales</h4>
              <table>
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th>Participantes</th>
                    <th>Ingresos</th>
                    <th>Uso</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Cultivo de Maíz</td>
                    <td>Niños, jóvenes, adultos</td>
                    <td>Poco</td>
                    <td>Alimentos y venta para gastos escolares</td>
                  </tr>
                  <tr>
                    <td>Cultivo de Frijol</td>
                    <td>Toda la familia</td>
                    <td>Nada</td>
                    <td>Alimento y gastos del hogar</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="table-section">
              <h4>Trabajos comunitarios</h4>
              <table>
                <thead>
                  <tr>
                    <th>Trabajo</th>
                    <th>Actividades</th>
                    <th>Frecuencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Faena</td>
                    <td>Mantenimiento de casa ejidal, escuelas y áreas verdes</td>
                    <td>1 vez al mes</td>
                  </tr>
                  <tr>
                    <td>Bacheo</td>
                    <td>Componer caminos, bacheos y veredas</td>
                    <td>Cada 5 meses</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'observaciones':
        return (
          <div className="tab-content-section">
            <div className="description-section">
              <h4>Observaciones</h4>
              <p><strong>Pueblo Indígena:</strong> Tojolabal</p>
              
              <h5>Fuentes consultadas:</h5>
              <p>Gómez Abadía, Eliver (2019). Aproximación a la Antropología del clima en el universo tojol-ab'al del ejido Veracruz, en Las Margaritas, Chiapas, Tesis de Licenciatura, UNICH.</p>
              
              <p>Entrevista telefónica: Mario López Gómez, Secretario del Presidente del Comisariado Ejidal, Santa Rita Sonora, Las Margaritas, 25 de mayo de 2024</p>
            </div>
          </div>
        );

      case 'registrales':
        return (
          <div className="tab-content-section">
            <div className="info-grid">
              <div className="info-row">
                <strong>Número de cédula:</strong>
                <span>29-0001</span>
              </div>
              <div className="info-row">
                <strong>Fecha de registro:</strong>
                <span>10/10/2022</span>
              </div>
              <div className="info-row">
                <strong>Autoridad que registra:</strong>
                <span>Mario López Gómez</span>
              </div>
              <div className="info-row">
                <strong>Cargo:</strong>
                <span>Secretario del Presidente del Comisariado Ejidal</span>
              </div>
              <div className="info-row">
                <strong>Presentó acta:</strong>
                <span>Sí</span>
              </div>
              <div className="info-row">
                <strong>Dio consentimiento:</strong>
                <span>Sí</span>
              </div>
              <div className="info-row">
                <strong>Firmó la cédula:</strong>
                <span>Sí</span>
              </div>
              <div className="info-row">
                <strong>Selló la cédula:</strong>
                <span>Sí</span>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Contenido no disponible</div>;
    }
  };

  return (
    <div className={`community-card-overlay ${isDarkTheme ? 'dark' : 'light'}`}>
      <div className="community-card" ref={cardRef}>
        <div className="card-header">
          <div className="header-info">
            <h2>{community.nombre}</h2>
            <div className="basic-info">
              <span>{community.pueblo}</span>
              <span>•</span>
              <span>{community.municipio}</span>
              <span>•</span>
              <span>{community.entidad}</span>
            </div>
            <div className="administrative-info">
              <p><strong>Unidad administrativa:</strong> {community.unidadAdministrativa}</p>
              <p><strong>Número de registro:</strong> {community.numeroRegistro}</p>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="export-btn" 
              onClick={exportToPDF}
              title="Exportar a PDF"
            >
              📄 PDF
            </button>
            <button 
              className="close-btn" 
              onClick={onClose}
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="card-tabs">
          {Object.entries(tabContent).map(([key, tab]) => (
            <button
              key={key}
              className={`tab-button ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.title}</span>
            </button>
          ))}
        </div>

        <div className="card-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default CommunityCard;