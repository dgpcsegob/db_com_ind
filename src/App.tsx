import React, { useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Map from './components/Map/Map';
import CommunityCard from './components/CommunityCard/CommunityCard';
import HtmlViewer from './components/HtmlViewer/HtmlViewer';
import './App.css';

interface FilterState {
  entidad: string;
  municipio: string;
  comunidad: string;
  pueblo: string;
}

interface CommunityData {
  id: string;
  nombre: string;
  entidad: string;
  municipio: string;
  pueblo: string;
  poblacion: number;
  latitud: number;
  longitud: number;
}

interface ExtractedData {
  entidades: Set<string>;
  municipiosPorEntidad: Map<string, Set<string>>;
  comunidadesPorMunicipio: Map<string, Set<string>>;
  pueblos: Set<string>;
  features: any[];
}

const App: React.FC = () => {
  const [layersVisibility, setLayersVisibility] = useState<Record<string, boolean>>({
    LocalidadesSedeINPI: true,
  });

  const [filters, setFilters] = useState<FilterState>({
    entidad: '',
    municipio: '',
    comunidad: '',
    pueblo: ''
  });

  const [selectedCommunity, setSelectedCommunity] = useState<CommunityData | null>(null);
  const [showCommunityCard, setShowCommunityCard] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Estados para el visor HTML
  const [showHtmlViewer, setShowHtmlViewer] = useState(false);
  const [htmlViewerCommunityId, setHtmlViewerCommunityId] = useState('');
  const [htmlViewerCommunityName, setHtmlViewerCommunityName] = useState('');

  // Estado para datos extraídos del mapa
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  // NUEVO: Estado para destacar comunidades
  const [highlightedCommunity, setHighlightedCommunity] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setLayersVisibility(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    
    // Limpiar comunidad seleccionada si se cambian los filtros
    if (newFilters.comunidad !== filters.comunidad) {
      setSelectedCommunity(null);
      setShowCommunityCard(false);
    }
  };

  const handleCommunityClick = (communityId: string, communityData: CommunityData) => {
    setSelectedCommunity(communityData);
    setShowCommunityCard(true);
  };

  const handleCloseCommunityCard = () => {
    setShowCommunityCard(false);
  };

  const handleThemeToggle = () => {
    setIsDarkTheme(prev => !prev);
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const handleOpenHtmlViewer = (communityId: string, communityName: string) => {
    setHtmlViewerCommunityId(communityId);
    setHtmlViewerCommunityName(communityName);
    setShowHtmlViewer(true);
  };

  const handleCloseHtmlViewer = () => {
    setShowHtmlViewer(false);
    setHtmlViewerCommunityId('');
    setHtmlViewerCommunityName('');
  };

  const handleClearSelectedCommunity = () => {
    setSelectedCommunity(null);
    setShowCommunityCard(false);
    if (showHtmlViewer) {
      setShowHtmlViewer(false);
      setHtmlViewerCommunityId('');
      setHtmlViewerCommunityName('');
    }
  };

  const handleDataLoaded = (data: ExtractedData) => {
    setExtractedData(data);
    console.log('Datos cargados en App:', {
      entidades: data.entidades.size,
      pueblos: data.pueblos.size,
      totalFeatures: data.features.length
    });
  };

  const handleFilterChangeFromMap = (patch: { 
    entidad?: string; 
    municipio?: string; 
    localidad?: string; 
    pueblo?: string;
  }) => {
    if (extractedData && patch.entidad) {
      const entidadMatch = Array.from(extractedData.entidades).find(e => e === patch.entidad);
      if (entidadMatch) {
        setFilters(prev => ({
          ...prev,
          entidad: entidadMatch,
          municipio: patch.municipio || '',
          comunidad: patch.localidad || '',
          pueblo: patch.pueblo || ''
        }));
      }
    }
  };

  // NUEVAS: Funciones para manejar highlight de comunidades
  const handleCommunityHighlight = (communityName: string) => {
    setHighlightedCommunity(communityName);
    console.log(`Destacando comunidad: "${communityName}"`);
  };

  const handleCommunityUnhighlight = () => {
    setHighlightedCommunity(null);
    console.log('Quitando destaque de comunidad');
  };

  return (
    <div className={`App ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      {/* Sidebar derecho */}
      <Sidebar
        layersVisibility={layersVisibility}
        onToggle={handleToggle}
        onFilterChange={handleFilterChange}
        selectedCommunity={selectedCommunity}
        isDarkTheme={isDarkTheme}
        onThemeToggle={handleThemeToggle}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarToggle}
        onOpenHtmlViewer={handleOpenHtmlViewer}
        onClearSelectedCommunity={handleClearSelectedCommunity}
        extractedData={extractedData}
        // NUEVAS PROPS: Para manejar highlight
        onCommunityHighlight={handleCommunityHighlight}
        onCommunityUnhighlight={handleCommunityUnhighlight}
      />

      {/* Mapa con estado de highlight */}
      <div 
        className={`map-container ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
        style={{ 
          height: showHtmlViewer ? 'calc(100vh - 300px)' : '100vh',
          transition: 'height 0.3s ease'
        }}
      >
        <Map 
          layersVisibility={layersVisibility}
          filters={filters}
          isDarkTheme={isDarkTheme}
          onCommunityClick={handleCommunityClick}
          onFilterChangeFromMap={handleFilterChangeFromMap}
          onDataLoaded={handleDataLoaded}
          // NUEVA PROP: Para recibir la comunidad a destacar
          highlightedCommunity={highlightedCommunity}
        />
      </div>

      {/* Ficha de comunidad */}
      {showCommunityCard && selectedCommunity && (
        <CommunityCard
          isOpen={showCommunityCard}
          onClose={handleCloseCommunityCard}
          communityId={selectedCommunity.id}
          isDarkTheme={isDarkTheme}
        />
      )}

      {/* Visor HTML en la parte inferior */}
      <HtmlViewer
        isOpen={showHtmlViewer}
        communityId={htmlViewerCommunityId}
        communityName={htmlViewerCommunityName}
        onClose={handleCloseHtmlViewer}
        isDarkTheme={isDarkTheme}
      />

      {/* Overlay para sidebar en modo móvil */}
      {!sidebarCollapsed && (
        <div 
          className="sidebar-overlay mobile-only"
          onClick={handleSidebarToggle}
        />
      )}
    </div>
  );
};

export default App;