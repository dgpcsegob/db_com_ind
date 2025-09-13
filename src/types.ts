// types.ts - Definiciones de tipos para el proyecto

export interface FilterState {
  entidad: string;
  municipio: string;
  comunidad: string;
}

export interface CommunityData {
  id: string;
  nombre: string;
  entidad: string;
  municipio: string;
  localidad: string;
  pueblo: string;
  region: string;
  numeroRegistro: string;
  unidadAdministrativa: string;
  poblacion: number;
  latitud: number;
  longitud: number;
  altitud: number;
}

export interface EntityData {
  id: string;
  nombre: string;
  codigo?: string;
}

export interface MunicipalityData extends EntityData {
  entidadId: string;
}

export interface LayerVisibility {
  [layerId: string]: boolean;
}

export interface RouteData {
  id: number;
  startPoint: {
    lat: number;
    lng: number;
  };
  endPoint: {
    lat: number;
    lng: number;
  };
  geometry: GeoJSON.Geometry;
  distance: string;
  duration: string;
}

export interface MapBounds {
  southwest: [number, number];
  northeast: [number, number];
}

export interface EntityBounds {
  [entityId: string]: MapBounds;
}

export interface CommunityTabContent {
  title: string;
  icon: string;
  content?: any;
}

export interface CommunityTabsData {
  [tabKey: string]: CommunityTabContent;
}

// Interfaces para los datos del HTML de comunidades
export interface CommunityGeneralData {
  nombreLenguaIndigena: string;
  significadoNombre: string;
  pueblosQueConforman: string[];
  autodenominacion: string;
  tipoComunidad: {
    segunPueblo: string;
    porAsentamientos: string;
    porHabitat: string;
    porAntiguedad: string;
  };
  localidadSede: {
    entidad: string;
    municipio: string;
    localidad: string;
    latitud: number;
    longitud: number;
    altitud: number;
  };
  numeroAsentamientos: {
    [tipo: string]: number;
  };
  poblacionTotal: number;
  perteneceAsociacion: boolean;
}

export interface CommunityTerritorioData {
  formasTenencia: Array<{
    forma: string;
    certificacion: boolean;
    tipoDocumento: string;
  }>;
  lugaresSagrados: {
    existe: boolean;
    enTerritorio: boolean;
    fueraTerritorio: boolean;
  };
  descripcionTerritorio: string;
}

export interface CommunityCulturaData {
  rasgosIdentitarios: string[];
  documentoOrigen: boolean;
  documentos?: string[];
  religion: {
    practica: boolean;
    nombre?: string;
  };
  practicasEspirituales: {
    existe: boolean;
    descripcion?: string;
  };
  fiestas: Array<{
    nombre: string;
    responsables: string;
    fecha: string;
  }>;
  lenguas: Array<{
    nombre: string;
    espacios: {
      casa: boolean;
      mercado: boolean;
      espacioPublico: boolean;
      asamblea: boolean;
      reuniones: boolean;
      escuela: boolean;
      otro: boolean;
      otroEspecifique?: string;
    };
  }>;
  artesOficios: Array<{
    arte: string;
    realizadoPor: {
      nina: boolean;
      nino: boolean;
      jovenM: boolean;
      jovenH: boolean;
      adulta: boolean;
      adulto: boolean;
      adultaMayor: boolean;
      adultoMayor: boolean;
    };
    transmite: string;
  }>;
}

export interface CommunityPoliticoData {
  descripcionGobierno: string;
  instituciones: Array<{
    nombre: string;
    funciones: string;
  }>;
  autoridades: Array<{
    autoridad: string;
    duracion: string;
    formaEleccion: string;
  }>;
  formaAcuerdos: string[];
  mujeresEnCargos: {
    pueden: boolean;
    cargos?: string[];
  };
}

export interface CommunityJuridicoData {
  ciudadania: string[];
  requerimientosPertenencia: string[];
  sistemaNormativo: Array<{
    norma: string;
    autoridadResponsable: string;
    sancion: string;
    autoridadResuelve: string;
  }>;
  documentoEscrito: {
    existe: boolean;
    razon?: string;
  };
  principiosValores: string[];
  encargadosTransmitir: string[];
  mujeresHeredan: boolean;
}

export interface CommunitySocialData {
  numeroFamilias: number;
  migracion: {
    existe: boolean;
    datos?: Array<{
      personas: string;
      destino: {
        otroMunicipio: boolean;
        mismaEntidad: boolean;
        otraEntidad: boolean;
        otroPais: boolean;
      };
      actividades: string;
      formasParticipacion: string;
      temporalidad: string;
      motivo: string;
    }>;
  };
  atencionSalud: string[];
  medicosTradicionles: {
    existe: boolean;
    tipos?: Array<{
      tipo: string;
      padecimientos: string;
    }>;
  };
}

export interface CommunityEconomiaData {
  actividadesEconomicas: Array<{
    actividad: string;
    realizadoPor: {
      nina: boolean;
      nino: boolean;
      jovenM: boolean;
      jovenH: boolean;
      adulta: boolean;
      adulto: boolean;
      adultaMayor: boolean;
      adultoMayor: boolean;
    };
    cantidadDinero: string;
    formasRetribucion: string;
  }>;
  trabajosComunitarios: Array<{
    nombre: string;
    actividades: string;
    quienRealiza: string;
    temporalidad: string;
  }>;
  trabajosFamiliares: Array<{
    nombre: string;
    actividades: string;
    realizadoPor: {
      nina: boolean;
      nino: boolean;
      jovenM: boolean;
      jovenH: boolean;
      adulta: boolean;
      adulto: boolean;
      adultaMayor: boolean;
      adultoMayor: boolean;
    };
  }>;
}

export interface CommunityObservacionesData {
  observaciones: string;
  fuentesConsultadas: string[];
}

export interface CommunityRegistralesData {
  numeroCedula: string;
  fechaRegistro: string;
  nombreAutoridad: string;
  cargoAutoridad: string;
  presentoActa: boolean;
  dioConsentimiento: boolean;
  firmo: boolean;
  sello: boolean;
}

export interface CommunityCompleteData extends CommunityData {
  general: CommunityGeneralData;
  territorio: CommunityTerritorioData;
  cultura: CommunityCulturaData;
  politico: CommunityPoliticoData;
  juridico: CommunityJuridicoData;
  social: CommunitySocialData;
  economia: CommunityEconomiaData;
  observaciones: CommunityObservacionesData;
  registrales: CommunityRegistralesData;
}

// Props para componentes
export interface SidebarProps {
  layersVisibility: LayerVisibility;
  onToggle: (id: string) => void;
  onFilterChange: (filters: FilterState) => void;
  selectedCommunity: CommunityData | null;
  isDarkTheme: boolean;
  onThemeToggle: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export interface MapProps {
  layersVisibility: LayerVisibility;
  filters: FilterState;
  isDarkTheme: boolean;
  onCommunityClick: (communityId: string, communityData: CommunityData) => void;
}

export interface CommunityCardProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  isDarkTheme: boolean;
}

// Extensiones de tipos de librerías externas
declare global {
  interface Window {
    viewCommunityDetails: (id: string) => void;
  }
}

// Tipos para MapLibre GL
export interface MapLibreStyleSpecification {
  version: number;
  name?: string;
  metadata?: any;
  sources: { [id: string]: any };
  layers: any[];
  glyphs?: string;
  sprite?: string;
}

// Tipos para configuración de capas
export interface LayerConfig {
  id: string;
  name: string;
  type: 'vector' | 'raster' | 'geojson';
  url?: string;
  data?: any;
  style: {
    type: 'fill' | 'line' | 'circle' | 'symbol';
    paint: { [property: string]: any };
    layout?: { [property: string]: any };
  };
  sourceLayer?: string;
  visible: boolean;
  interactive: boolean;
}

export interface ProjectConfig {
  title: string;
  subtitle?: string;
  initialView: {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
  };
  bounds: MapBounds;
  layers: LayerConfig[];
  entities: EntityData[];
  municipalities: { [entityId: string]: MunicipalityData[] };
  communities: { [municipalityId: string]: CommunityData[] };
}