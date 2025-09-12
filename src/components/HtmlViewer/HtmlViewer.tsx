import React, { useState, useEffect, useMemo } from 'react';
import './HtmlViewer.css';

interface HtmlViewerProps {
  isOpen: boolean;
  communityId: string;
  communityName: string;
  onClose: () => void;
  isDarkTheme: boolean;
}

interface SectionData {
  id: string;
  title: string;
  content: string;
}

interface CommunityHeader {
  nombreComunidad: string;
  pueblo: string;
  region: string;
  numeroRegistro: string;
  entidadFederativa: string;
  municipio: string;
  localidad: string;
  unidadAdministrativa: string;
}

const HtmlViewer: React.FC<HtmlViewerProps> = ({
  isOpen,
  communityId,
  communityName,
  onClose,
  isDarkTheme
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    if (isOpen && communityId) {
      loadHtmlContent();
    }
  }, [isOpen, communityId]);

  const loadHtmlContent = async () => {
    setLoading(true);
    setError('');
    
    try {
      const fichaUrl = `${process.env.PUBLIC_URL || ''}/fichas/${communityId}.html`;
      const response = await fetch(fichaUrl);
      
      if (!response.ok) {
        throw new Error(`No se encontró la ficha para el ID: ${communityId}`);
      }
      
      const htmlText = await response.text();
      setHtmlContent(htmlText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la ficha');
      console.error('Error loading HTML:', err);
    } finally {
      setLoading(false);
    }
  };

  // Procesar HTML y extraer información
  const { sections, processedContent, headerInfo } = useMemo(() => {
    if (!htmlContent) {
      return { sections: [], processedContent: '', headerInfo: null };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // 1. EXTRAER INFORMACIÓN DEL ENCABEZADO
      const headerInfo: CommunityHeader = {
        nombreComunidad: '',
        pueblo: '',
        region: '',
        numeroRegistro: '',
        entidadFederativa: '',
        municipio: '',
        localidad: '',
        unidadAdministrativa: ''
      };

      // Buscar en la sección fixed-div que contiene la información básica
      const fixedDiv = doc.querySelector('.fixed-div');
      if (fixedDiv) {
        const rows = fixedDiv.querySelectorAll('.row');
        
        rows.forEach(row => {
          const h6Elements = row.querySelectorAll('h6');
          const pElements = row.querySelectorAll('p');

          h6Elements.forEach((h6, index) => {
            const label = h6.textContent?.trim().toLowerCase() || '';
            const value = pElements[index]?.textContent?.trim() || '';

            if (label.includes('nombre de la comunidad')) {
              headerInfo.nombreComunidad = value;
            } else if (label.includes('pueblo')) {
              headerInfo.pueblo = value;
            } else if (label.includes('región')) {
              headerInfo.region = value;
            } else if (label.includes('número registro')) {
              headerInfo.numeroRegistro = value;
            } else if (label.includes('entidad federativa')) {
              headerInfo.entidadFederativa = value;
            } else if (label.includes('municipio')) {
              headerInfo.municipio = value;
            } else if (label.includes('localidad')) {
              headerInfo.localidad = value;
            } else if (label.includes('unidad administrativa')) {
              headerInfo.unidadAdministrativa = value;
            }
          });
        });
      }

      // 2. CORREGIR DESFASE DE DATOS
      const allRows = doc.querySelectorAll('.row');
      allRows.forEach(row => {
        const columns = Array.from(row.children) as HTMLElement[];
        
        // Buscar columnas con order-lg-* que tienen desfase
        const columnsWithOrder = columns.filter(col => 
          col.className.includes('order-lg-')
        );

        if (columnsWithOrder.length >= 4) {
          // Separar etiquetas (h6) y valores (p)
          const labelColumns: HTMLElement[] = [];
          const valueColumns: HTMLElement[] = [];

          columnsWithOrder.forEach(col => {
            if (col.querySelector('h6')) {
              labelColumns.push(col);
            } else if (col.querySelector('p')) {
              valueColumns.push(col);
            }
          });

          // Si hay desfase, reorganizar
          if (labelColumns.length === valueColumns.length && labelColumns.length > 1) {
            // Limpiar el row
            row.innerHTML = '';
            
            // Crear pares correctos: etiqueta + valor
            for (let i = 0; i < labelColumns.length; i++) {
              const labelCol = labelColumns[i].cloneNode(true) as HTMLElement;
              const valueCol = valueColumns[i].cloneNode(true) as HTMLElement;
              
              // Limpiar clases order problemáticas
              labelCol.className = labelCol.className.replace(/order-lg-\d+|order-\d+/g, '').trim();
              valueCol.className = valueCol.className.replace(/order-lg-\d+|order-\d+/g, '').trim();
              
              // Añadir clases Bootstrap básicas
              labelCol.className = `${labelCol.className} col-12 col-lg-6`.trim();
              valueCol.className = `${valueCol.className} col-12 col-lg-6`.trim();
              
              row.appendChild(labelCol);
              row.appendChild(valueCol);
            }
          }
        }
      });

      // 3. EXTRAER SECCIONES DE NAVEGACIÓN
      const navLinks = doc.querySelectorAll('.nav-link');
      const sectionsArray: SectionData[] = [];

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        const title = link.textContent?.trim();
        
        if (href && title) {
          const sectionId = href.replace('#tab', '').toLowerCase();
          const tabContent = doc.querySelector(href);
          
          sectionsArray.push({
            id: sectionId,
            title: title,
            content: tabContent ? tabContent.innerHTML : ''
          });
        }
      });

      // Remover navegación original
      const cardHeader = doc.querySelector('.card-header');
      if (cardHeader) {
        cardHeader.remove();
      }

      // Remover fixed-div del contenido principal ya que lo mostramos en el header
      if (fixedDiv) {
        fixedDiv.remove();
      }

      return {
        sections: sectionsArray,
        processedContent: doc.body.innerHTML,
        headerInfo: headerInfo
      };

    } catch (err) {
      console.error('Error procesando HTML:', err);
      return { sections: [], processedContent: htmlContent, headerInfo: null };
    }
  }, [htmlContent]);

  // Establecer sección activa inicial
  useEffect(() => {
    if (sections.length > 0 && !activeSection) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  // Obtener contenido de la sección activa
  const currentSectionContent = useMemo(() => {
    const section = sections.find(s => s.id === activeSection);
    return section ? section.content : processedContent;
  }, [sections, activeSection, processedContent]);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  if (!isOpen) return null;

  return (
    <div className={`html-viewer ${isDarkTheme ? 'dark' : 'light'} ${isMinimized ? 'minimized' : ''}`}>
      <div className="html-viewer-header">
        <div className="header-left">
          <h3>{communityName}</h3>
        </div>
        <div className="header-controls">
          <button 
            className="minimize-btn" 
            onClick={toggleMinimize}
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
          </button>
          <button 
            className="close-btn" 
            onClick={onClose}
            title="Cerrar ficha"
          >
            ✖️
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="html-viewer-content">
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Cargando ficha...</p>
            </div>
          )}

          {error && (
            <div className="error-container">
              <h4>⚠️ Error al cargar la ficha</h4>
              <p>{error}</p>
              <button className="retry-btn" onClick={loadHtmlContent}>
                🔄 Reintentar
              </button>
            </div>
          )}

          {!loading && !error && htmlContent && (
            <>
              {/* Información del encabezado de la ficha */}
              {headerInfo && (
                <div className="community-header">
                  <div className="header-grid">
                    {headerInfo.nombreComunidad && (
                      <div className="header-item full-width">
                        <span className="header-label">Nombre de la comunidad:</span>
                        <span className="header-value">{headerInfo.nombreComunidad}</span>
                      </div>
                    )}
                    {headerInfo.pueblo && (
                      <div className="header-item">
                        <span className="header-label">Pueblo:</span>
                        <span className="header-value">{headerInfo.pueblo}</span>
                      </div>
                    )}
                    {headerInfo.region && (
                      <div className="header-item">
                        <span className="header-label">Región:</span>
                        <span className="header-value">{headerInfo.region}</span>
                      </div>
                    )}
                    {headerInfo.numeroRegistro && (
                      <div className="header-item">
                        <span className="header-label">Número registro:</span>
                        <span className="header-value">{headerInfo.numeroRegistro}</span>
                      </div>
                    )}
                    {headerInfo.entidadFederativa && (
                      <div className="header-item">
                        <span className="header-label">Entidad federativa:</span>
                        <span className="header-value">{headerInfo.entidadFederativa}</span>
                      </div>
                    )}
                    {headerInfo.municipio && (
                      <div className="header-item">
                        <span className="header-label">Municipio:</span>
                        <span className="header-value">{headerInfo.municipio}</span>
                      </div>
                    )}
                    {headerInfo.localidad && (
                      <div className="header-item">
                        <span className="header-label">Localidad:</span>
                        <span className="header-value">{headerInfo.localidad}</span>
                      </div>
                    )}
                    {headerInfo.unidadAdministrativa && (
                      <div className="header-item full-width">
                        <span className="header-label">Unidad administrativa:</span>
                        <span className="header-value">{headerInfo.unidadAdministrativa}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navegación por secciones */}
              {sections.length > 1 && (
                <div className="sections-navigation">
                  <div className="sections-buttons">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        className={`section-btn ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => handleSectionChange(section.id)}
                      >
                        {section.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contenido de la sección */}
              <div 
                className="html-content"
                dangerouslySetInnerHTML={{ __html: currentSectionContent }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default HtmlViewer;