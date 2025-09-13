import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { LngLat, LngLatLike, Map as MaplibreMap, GeoJSONSource } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import type { Feature, Point, Geometry, Polygon } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import "@maptiler/sdk/dist/maptiler-sdk.css";

type MapProps = {
  layersVisibility: { [layerId: string]: boolean };
  filters: FilterState;
  isDarkTheme: boolean;
  onCommunityClick: (communityId: string, communityData: CommunityData) => void;
  onFilterChangeFromMap?: (patch: { entidad?: string; municipio?: string; localidad?: string; pueblo?: string }) => void;
  onDataLoaded?: (data: ExtractedData) => void;
  // NUEVA PROP: Para recibir la comunidad destacada
  highlightedCommunity?: string | null;
};

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
  htmlUrl?: string;
}

interface RouteData {
  id: number;
  startPoint: LngLat;
  endPoint: LngLat;
  geometry: Geometry;
  distance: string;
  duration: string;
}

interface PopupPosition {
  x: number;
  y: number;
  visible: boolean;
}

interface ExtractedData {
  entidades: Set<string>;
  municipiosPorEntidad: Map<string, Set<string>>;
  comunidadesPorMunicipio: Map<string, Set<string>>;
  pueblos: Set<string>;
  features: any[];
}

const ENT_KEY = 'NOM_ENT';
const MUN_KEY = 'NOM_MUN';
const COM_KEY = 'NOM_COM';
const PUE_KEY = 'Pueblo';
const LOC_KEY = 'NOM_LOC';
const ID_KEY = 'ID';

const INPI_SOURCE_ID = 'LocalidadesSedeINPI';
const INPI_LAYER_ID = 'LocalidadesSedeINPI';
const INPI_SOURCE_LAYER = 'inpi_tile';

const get3DIcon = (isOn: boolean) => {
  const color = isOn ? '#007cbf' : '#6c757d';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// FUNCIÓN HELPER para formatear números con comas
const formatNumber = (num: number): string => {
  return num.toLocaleString('es-MX');
};

const Map: React.FC<MapProps> = ({ 
  layersVisibility, 
  filters, 
  isDarkTheme, 
  onCommunityClick,
  onFilterChangeFromMap,
  onDataLoaded,
  highlightedCommunity, // NUEVA PROP
}) => {
  const mapRef = useRef<MaplibreMap | null>(null);
  const minimapRef = useRef<MaplibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const minimapContainerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const blinkAnimationId = useRef<number | null>(null);
  const routeIdCounter = useRef(0);
  const popupRef = useRef(new maplibregl.Popup({ closeButton: true, closeOnClick: false }));
  const extractedDataRef = useRef<ExtractedData | null>(null);

  const enterHandlerRef = useRef<((e:any)=>void) | null>(null);
  const leaveHandlerRef = useRef<((e:any)=>void) | null>(null);
  const clickHandlerRef = useRef<((e:any)=>void) | null>(null);

  const [displayBearing, setDisplayBearing] = useState(0);
  const displayBearingRef = useRef(0);
  const compassAnimId = useRef<number | null>(null);

  const [routePopupPositions, setRoutePopupPositions] = useState<{ [routeId: number]: PopupPosition }>({});
  const [linePopupPositions, setLinePopupPositions] = useState<{ [lineId: number]: PopupPosition }>({});

  // API Key y URLs para 3D
  const apiKey = 'QAha5pFBxf4hGa8Jk5zv';
  const lightStyleUrl = 'https://www.mapabase.atdt.gob.mx/style_3d.json';
  const darkStyleUrl = 'https://www.mapabase.atdt.gob.mx/style_black_3d_places.json';
  const outdoor3DStyleUrl = `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${apiKey}`;
  const satelliteStyleUrl = `https://www.mapabase.atdt.gob.mx/style_satellite.json`;
  const minimapStyleUrl = `https://www.mapabase.atdt.gob.mx/style_white_3d_places.json`;

  const [isSatellite, setIsSatellite] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [isMeasuringLine, setIsMeasuringLine] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<LngLatLike[]>([]);
  const [currentLinePoints, setCurrentLinePoints] = useState<LngLatLike[]>([]);
  const [routesData, setRoutesData] = useState<RouteData[]>([]);
  const [linesData, setLinesData] = useState<RouteData[]>([]);

  const isMeasuringRef = useRef(isMeasuring);
  const isMeasuringLineRef = useRef(isMeasuringLine);
  isMeasuringRef.current = isMeasuring;
  isMeasuringLineRef.current = isMeasuringLine;

  const getCurrentStyleUrl = useCallback(() => {
    if (isSatellite) return satelliteStyleUrl;
    if (is3D) return outdoor3DStyleUrl;
    return isDarkTheme ? darkStyleUrl : lightStyleUrl;
  }, [isDarkTheme, isSatellite, is3D]);

  // NUEVA FUNCIÓN: Para destacar puntos específicos en el mapa
 const highlightCommunityPoints = useCallback((communityName: string | null) => {
  const map = mapRef.current;
  if (!map || !map.getLayer(INPI_LAYER_ID)) return;

  try {
    if (!communityName) {
      map.setPaintProperty(INPI_LAYER_ID, 'circle-radius', [
        'interpolate', ['linear'], ['zoom'], 5, 2, 10, 3, 15, 5
      ]);
      map.setPaintProperty(INPI_LAYER_ID, 'circle-stroke-width', [
        'interpolate', ['linear'], ['zoom'], 5, 0.1, 10, 0.5, 15, 1
      ]);
      map.setPaintProperty(INPI_LAYER_ID, 'circle-stroke-color', '#ffffff');
      map.setPaintProperty(INPI_LAYER_ID, 'circle-opacity', [
        'interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 0.8, 15, 1
      ]);
    } else {
      map.setPaintProperty(INPI_LAYER_ID, 'circle-radius', [
        'case',
        ['any', ['==', ['get', COM_KEY], communityName], ['==', ['get', LOC_KEY], communityName]],
        ['interpolate', ['linear'], ['zoom'], 5, 6, 10, 9, 15, 12],
        ['interpolate', ['linear'], ['zoom'], 5, 1.5, 10, 2, 15, 3] // ← PUNTOS NORMALES VISIBLES
      ]);
      map.setPaintProperty(INPI_LAYER_ID, 'circle-stroke-width', [
        'case',
        ['any', ['==', ['get', COM_KEY], communityName], ['==', ['get', LOC_KEY], communityName]],
        15, 0
      ]);
      map.setPaintProperty(INPI_LAYER_ID, 'circle-stroke-color', [
        'case',
        ['any', ['==', ['get', COM_KEY], communityName], ['==', ['get', LOC_KEY], communityName]],
        '#FFFF00', 'transparent'
      ]);
      map.setPaintProperty(INPI_LAYER_ID, 'circle-color', [
        'case',
        ['any', ['==', ['get', COM_KEY], communityName], ['==', ['get', LOC_KEY], communityName]],
        '#FF0000', 
        ['match', ['get', 'ID_Pueblo'], 
          '1', '#1b9e77', '2', '#d95f02', '3', '#7570b3', '4', '#e7298a', 
          '5', '#66a61e', '6', '#e6ab02', '7', '#a6761d', '#666666'
        ] // ← COLORES ORIGINALES PARA LOS OTROS
      ]);
      map.setPaintProperty(INPI_LAYER_ID, 'circle-opacity', [
        'case',
        ['any', ['==', ['get', COM_KEY], communityName], ['==', ['get', LOC_KEY], communityName]],
        1.0, 0.6  // ← AHORA SON VISIBLES PERO ATENUADOS
      ]);
      console.log(`SUPER HIGHLIGHT: "${communityName}"`);
    }
    map.triggerRepaint();
  } catch (error) {
    console.error('Error aplicando highlight:', error);
  }
}, []);

const highlightWithTemporaryLayer = useCallback((communityName: string | null) => {
  const map = mapRef.current;
  if (!map) return;

  if (map.getLayer('highlight-layer')) {
    map.removeLayer('highlight-layer');
  }
  if (map.getSource('highlight-source')) {
    map.removeSource('highlight-source');
  }

  if (!communityName || !extractedDataRef.current) return;

  const matchingFeatures = extractedDataRef.current.features.filter(feature => {
    const props = feature.properties || {};
    const comunidad = props.NOM_COM || props.NOM_LOC || '';
    return comunidad === communityName;
  });

  if (matchingFeatures.length === 0) return;

  const highlightGeoJSON = {
    type: 'FeatureCollection' as const,
    features: matchingFeatures
  };

  try {
    map.addSource('highlight-source', {
      type: 'geojson',
      data: highlightGeoJSON
    });

    map.addLayer({
      id: 'highlight-layer',
      type: 'circle',
      source: 'highlight-source',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 60, 10, 90, 15, 120],
        'circle-color': '#FF0000',
        'circle-stroke-color': '#FFFF00',
        'circle-stroke-width': 10,
        'circle-opacity': 1.0
      }
    });
  } catch (error) {
    console.error('Error creando capa temporal:', error);
  }
}, []);

  // NUEVO: useEffect para aplicar highlight cuando cambia
useEffect(() => {
  highlightCommunityPoints(highlightedCommunity);
}, [highlightedCommunity, highlightCommunityPoints]);

  const animateTerrainExaggeration = useCallback((map: any, targetExaggeration: number, duration: number = 2000) => {
    const startTime = Date.now();
    const startExaggeration = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentExaggeration = startExaggeration + (targetExaggeration - startExaggeration) * easeOutQuart;
      
      try {
        if (map.getTerrain()) {
          map.setTerrain({ 
            source: 'terrain-rgb', 
            exaggeration: currentExaggeration
          });
        }
      } catch (error) {
        console.warn('Error animating terrain exaggeration:', error);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, []);

  const applyOrRemove3DEffects = useCallback((map: any, is3DActive: boolean, isSatelliteActive: boolean) => {
    if (is3DActive) {
      try {
        if (!map.getSource('terrain-rgb')) {
          map.addSource('terrain-rgb', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${apiKey}`,
            tileSize: 256
          });
        }

        const exaggeration = isSatelliteActive ? 1.2 : 1.5;
        const targetPitch = isSatelliteActive ? 60 : 70;
        const sunIntensity = isSatelliteActive ? 3 : 5;

        map.setTerrain({ 
          source: 'terrain-rgb', 
          exaggeration: 0.1
        });
        
        animateTerrainExaggeration(map, exaggeration, 2500);
        
        if (!map.getLayer('sky')) {
          map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: { 
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 0.0],
              'sky-atmosphere-sun-intensity': sunIntensity,
            }
          } as any);
        }
        
        const currentPitch = map.getPitch();
        if (currentPitch < 5) {
          map.easeTo({ 
            pitch: targetPitch,
            bearing: map.getBearing(),
            duration: 1500,
            easing: (t: number) => t * (2 - t)
          });
        }
        
      } catch (error) {
        console.warn('Error aplicando efectos 3D:', error);
      }
    } else {
      try {
        const currentPitch = map.getPitch();
        if (currentPitch > 0) {
          map.easeTo({ 
            pitch: 0, 
            duration: 1200,
            easing: (t: number) => t * (2 - t)
          }).once('moveend', () => {
            if (map.getLayer('sky')) {
              map.removeLayer('sky');
            }
            if (map.getTerrain()) {
              map.setTerrain(null);
            }
          });
        } else {
          if (map.getLayer('sky')) {
            map.removeLayer('sky');
          }
          if (map.getTerrain()) {
            map.setTerrain(null);
          }
        }
      } catch (error) {
        console.warn('Error quitando efectos 3D:', error);
      }
    }
  }, [animateTerrainExaggeration]);

  const toggle3D = () => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentBearing = map.getBearing();
    const currentPitch = map.getPitch();
    const currentIsSatellite = isSatellite;
    const newIs3D = !is3D;

    if (map.getTerrain()) {
      map.setTerrain(null);
    }
    if (map.getLayer('sky')) {
      map.removeLayer('sky');
    }

    setIs3D(newIs3D);

    let newStyleUrl: string;
    if (currentIsSatellite) {
      newStyleUrl = satelliteStyleUrl;
    } else {
      if (newIs3D) {
        newStyleUrl = outdoor3DStyleUrl;
      } else {
        newStyleUrl = isDarkTheme ? darkStyleUrl : lightStyleUrl;
      }
    }

    const needsStyleChange = (newIs3D && !currentIsSatellite) || (!newIs3D && !currentIsSatellite);
    
    if (needsStyleChange) {
      map.setStyle(newStyleUrl, { diff: false });
      
      map.once('styledata', () => {
        addVectorLayers(map);
        
        if (newIs3D && !map.getSource('terrain-rgb')) {
          map.addSource('terrain-rgb', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${apiKey}`,
            tileSize: 256
          });
        }

        updateLayerVisibility(map);
        routesData.forEach(route => drawSingleRouteOnMap(map, route));
        linesData.forEach(line => drawSingleLineOnMap(map, line));
        attachAllTooltipEvents(map);
        
        setTimeout(() => {
          extractLayerData(map);
          applyMapFilters();
        }, 500);

        if (blinkAnimationId.current) {
          cancelAnimationFrame(blinkAnimationId.current);
        }
        startCommunityAnimation(map);

        map.jumpTo({
          center: currentCenter,
          zoom: currentZoom,
          bearing: currentBearing,
          pitch: 0
        });

        setTimeout(() => {
          applyOrRemove3DEffects(map, newIs3D, currentIsSatellite);
        }, 200);
      });
    } else {
      setTimeout(() => {
        applyOrRemove3DEffects(map, newIs3D, currentIsSatellite);
      }, 100);
    }
  };

  // FUNCIÓN SIMPLIFICADA: extractLayerData - SOLO querySourceFeatures
  const extractLayerData = useCallback((map: MaplibreMap) => {
    if (!map.getLayer(INPI_LAYER_ID)) {
      console.log('Capa no encontrada, reintentando en 2s...');
      setTimeout(() => extractLayerData(map), 2000);
      return;
    }

    try {
      // SOLO usar querySourceFeatures - sin trucos de viewport
      const rawFeatures = map.querySourceFeatures(INPI_SOURCE_ID, {
        sourceLayer: INPI_SOURCE_LAYER
      });

      // Convertir a any[] para evitar problemas de tipos
      const allFeatures = rawFeatures as any[];

      // Deduplicar por ID
      const seen = new Set<string>();
      const uniqueFeatures = allFeatures.filter((f: any) => {
        const idVal = f?.properties?.[ID_KEY] ?? f?.id;
        const id = idVal != null ? String(idVal) : '';
        if (!id) return true;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      console.log(`Extrayendo datos: ${formatNumber(allFeatures.length)} features (únicos: ${formatNumber(uniqueFeatures.length)})...`);

      const entidadesObj: {[key: string]: boolean} = {};
      const municipiosObj: {[key: string]: string[]} = {};
      const comunidadesObj: {[key: string]: string[]} = {};
      const pueblosObj: {[key: string]: boolean} = {};

      uniqueFeatures.forEach((feature: any) => {
        const props = feature.properties || {};
        
        const entidad = String(props[ENT_KEY] || '').trim();
        const municipio = String(props[MUN_KEY] || '').trim();
        const comunidad = String(props[COM_KEY] || props[LOC_KEY] || '').trim();
        const pueblo = String(props[PUE_KEY] || '').trim();

        if (entidad) {
          entidadesObj[entidad] = true;
          
          if (municipio) {
            if (!municipiosObj[entidad]) {
              municipiosObj[entidad] = [];
            }
            if (!municipiosObj[entidad].includes(municipio)) {
              municipiosObj[entidad].push(municipio);
            }

            const key = `${entidad}|${municipio}`;
            if (comunidad) {
              if (!comunidadesObj[key]) {
                comunidadesObj[key] = [];
              }
              if (!comunidadesObj[key].includes(comunidad)) {
                comunidadesObj[key].push(comunidad);
              }
            }
          }
        }

        if (pueblo) {
          pueblosObj[pueblo] = true;
        }
      });

      // Convertir a formato esperado por la interface
      const entidadesSet = new Set(Object.keys(entidadesObj));
      const municipiosMap = new globalThis.Map<string, Set<string>>();
      const comunidadesMap = new globalThis.Map<string, Set<string>>();
      const pueblosSet = new Set(Object.keys(pueblosObj));

      Object.keys(municipiosObj).forEach(ent => {
        municipiosMap.set(ent, new Set(municipiosObj[ent]));
      });

      Object.keys(comunidadesObj).forEach(key => {
        comunidadesMap.set(key, new Set(comunidadesObj[key]));
      });

      const data: ExtractedData = {
        entidades: entidadesSet,
        municipiosPorEntidad: municipiosMap,
        comunidadesPorMunicipio: comunidadesMap,
        pueblos: pueblosSet,
        features: uniqueFeatures
      };

      extractedDataRef.current = data;
      
      if (onDataLoaded && entidadesSet.size > 0) {
        onDataLoaded(data);
        console.log(`Datos enviados al sidebar:`, {
          entidades: entidadesSet.size,
          pueblos: pueblosSet.size,
          totalFeatures: `${formatNumber(uniqueFeatures.length)} registros`
        });
      } else if (entidadesSet.size === 0) {
        console.log('No se encontraron datos. Reintentando...');
        setTimeout(() => extractLayerData(map), 3000);
      }
    } catch (error) {
      console.error('Error extrayendo datos:', error);
      setTimeout(() => extractLayerData(map), 5000);
    }
  }, [onDataLoaded]);

    const applyMapFilters = useCallback(() => {
      const map = mapRef.current;
      if (!map || !map.getLayer(INPI_LAYER_ID)) return;

      let filterArray: any = null;
      const conditions: any[] = [];

      // NUEVO: Verificar si todos los filtros están vacíos
      const allFiltersEmpty = !filters.entidad?.trim() && !filters.municipio?.trim() && 
                            !filters.comunidad?.trim() && !filters.pueblo?.trim();

      if (allFiltersEmpty) {
        // FORZAR: Mostrar todos los registros cuando no hay filtros
        filterArray = null;
        console.log('Todos los filtros vacíos - mostrando TODOS los registros');
      } else {
        // Aplicar filtros específicos como antes
        if (filters.entidad && filters.entidad.trim() !== '') {
          conditions.push(['==', ['get', ENT_KEY], filters.entidad]);
        }

        if (filters.municipio && filters.municipio.trim() !== '') {
          conditions.push(['==', ['get', MUN_KEY], filters.municipio]);
        }

        if (filters.comunidad && filters.comunidad.trim() !== '') {
          conditions.push([
            'any',
            ['==', ['get', COM_KEY], filters.comunidad],
            ['==', ['get', LOC_KEY], filters.comunidad]
          ]);
        }

        if (filters.pueblo && filters.pueblo.trim() !== '') {
          conditions.push(['==', ['get', PUE_KEY], filters.pueblo]);
        }

        if (conditions.length > 0) {
          filterArray = conditions.length === 1 ? conditions[0] : ['all', ...conditions];
        }
      }

      try {
        map.setFilter(INPI_LAYER_ID, filterArray);
        console.log('Filtro aplicado:', filterArray ? 'Con filtros específicos' : 'Sin filtros - mostrando TODO');
        // NUEVO: Forzar repaint para asegurar actualización visual
        setTimeout(() => {
          map.triggerRepaint();
        }, 50);
      } catch (error) {
        console.error('Error aplicando filtro:', error);
        // Fallback: limpiar filtro y mostrar todo
        try {
          map.setFilter(INPI_LAYER_ID, null);
          map.triggerRepaint();
        } catch (secondError) {
          console.error('Error limpiando filtro:', secondError);
        }
      }
    }, [filters]);

  const applyFilterZoom = useCallback(() => {
    const map = mapRef.current;
    if (!map || !extractedDataRef.current) return;

    const features = extractedDataRef.current.features.filter(feature => {
      const props = feature.properties || {};
      
      if (filters.entidad && props[ENT_KEY] !== filters.entidad) return false;
      if (filters.municipio && props[MUN_KEY] !== filters.municipio) return false;
      if (filters.comunidad) {
        const comunidad = props[COM_KEY] || props[LOC_KEY];
        if (comunidad !== filters.comunidad) return false;
      }
      if (filters.pueblo && props[PUE_KEY] !== filters.pueblo) return false;
      
      return true;
    });

    if (features.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    
    features.forEach(feature => {
      if (feature.geometry && feature.geometry.type === 'Point') {
        bounds.extend(feature.geometry.coordinates as [number, number]);
      }
    });

    let padding = { top: 50, bottom: 50, left: 50, right: 350 };
    let maxZoom = 16;

    if (filters.comunidad) {
      maxZoom = 16;
      padding = { top: 100, bottom: 100, left: 100, right: 400 };
    } else if (filters.municipio) {
      maxZoom = 12;
      padding = { top: 80, bottom: 80, left: 80, right: 380 };
    } else if (filters.entidad) {
      maxZoom = 9;
      padding = { top: 60, bottom: 60, left: 60, right: 360 };
    }

    map.fitBounds(bounds, {
      padding,
      maxZoom,
      duration: 1500,
      essential: true
    });
  }, [filters]);

  useEffect(() => {
    applyMapFilters();
    applyFilterZoom();
  }, [filters, applyMapFilters, applyFilterZoom]);

  const updatePopupPositions = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const newRoutePositions: { [routeId: number]: PopupPosition } = {};
    routesData.forEach(route => {
      const projected = map.project(route.endPoint);
      const bounds = map.getBounds();
      const isVisible = bounds.contains(route.endPoint);
      
      newRoutePositions[route.id] = {
        x: projected.x,
        y: projected.y,
        visible: isVisible
      };
    });
    setRoutePopupPositions(newRoutePositions);

    const newLinePositions: { [lineId: number]: PopupPosition } = {};
    linesData.forEach(line => {
      const projected = map.project(line.endPoint);
      const bounds = map.getBounds();
      const isVisible = bounds.contains(line.endPoint);
      
      newLinePositions[line.id] = {
        x: projected.x,
        y: projected.y,
        visible: isVisible
      };
    });
    setLinePopupPositions(newLinePositions);
  }, [routesData, linesData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapChange = () => {
      updatePopupPositions();
    };

    map.on('move', handleMapChange);
    map.on('zoom', handleMapChange);
    map.on('rotate', handleMapChange);
    map.on('pitch', handleMapChange);

    return () => {
      map.off('move', handleMapChange);
      map.off('zoom', handleMapChange);
      map.off('rotate', handleMapChange);
      map.off('pitch', handleMapChange);
    };
  }, [updatePopupPositions]);

  useEffect(() => {
    updatePopupPositions();
  }, [updatePopupPositions]);

  const changeMapStylePreservingPosition = useCallback((newStyleUrl: string) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentBearing = map.getBearing();
    const currentPitch = map.getPitch();
    const was3D = is3D;

    if (map.getTerrain()) map.setTerrain(null);
    if (map.getLayer('sky')) map.removeLayer('sky');

    map.setStyle(newStyleUrl, { diff: false });

    map.once('styledata', () => {
      addVectorLayers(map);
      updateLayerVisibility(map);
      routesData.forEach(route => drawSingleRouteOnMap(map, route));
      linesData.forEach(line => drawSingleLineOnMap(map, line));
      attachAllTooltipEvents(map);
      
      setTimeout(() => {
        extractLayerData(map);
        applyMapFilters();
      }, 500);

      map.jumpTo({ 
        center: currentCenter, 
        zoom: currentZoom, 
        bearing: currentBearing, 
        pitch: was3D ? currentPitch : 0
      });

      if (blinkAnimationId.current) cancelAnimationFrame(blinkAnimationId.current);
      startCommunityAnimation(map);

      if (was3D) {
        if (!map.getSource('terrain-rgb')) {
          map.addSource('terrain-rgb', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${apiKey}`,
            tileSize: 256
          });
        }

        const exaggeration = isSatellite ? 1.2 : 1.5;
        const sunIntensity = isSatellite ? 3 : 5;

        setTimeout(() => {
          map.setTerrain({ source: 'terrain-rgb', exaggeration: 0.1 });
          animateTerrainExaggeration(map, exaggeration, 1500);
        }, 100);

        if (!map.getLayer('sky')) {
          map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0, 0],
              'sky-atmosphere-sun-intensity': sunIntensity
            }
          } as any);
        }
      }
    });
  }, [routesData, linesData, extractLayerData, applyMapFilters, is3D, isSatellite, animateTerrainExaggeration]);

  const clearCurrentPoints = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers = [
      'start-point-current', 'start-point-current-pulse',
      'end-point-current', 'end-point-current-pulse',
      'start-point-line-current', 'start-point-line-current-pulse',
      'end-point-line-current', 'end-point-line-current-pulse'
    ];
    const sources = [
      'start-point-current', 'end-point-current',
      'start-point-line-current', 'end-point-line-current'
    ];
    layers.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
    sources.forEach(id => { if (map.getSource(id)) map.removeSource(id); });
  }, []);

  const drawSingleRouteOnMap = useCallback((map: MaplibreMap, route: RouteData) => {
    const { id, startPoint, endPoint, geometry } = route;
    if (map.getSource(`route-source-${id}`)) return;
    map.addSource(`route-source-${id}`, { type: 'geojson', data: { type: 'Feature', geometry, properties: {} } });
    map.addLayer({
      id: `route-layer-${id}`, type: 'line', source: `route-source-${id}`,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#007cbf', 'line-width': 5, 'line-opacity': 0.8 },
    });
    map.addSource(`start-point-${id}`, { type: 'geojson', data: { type: 'Point', coordinates: [startPoint.lng, startPoint.lat] } });
    map.addLayer({
      id: `start-point-${id}`, type: 'circle', source: `start-point-${id}`,
      paint: { 'circle-radius': 6, 'circle-color': '#007cbf', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
    });
    map.addSource(`end-point-${id}`, { type: 'geojson', data: { type: 'Point', coordinates: [endPoint.lng, endPoint.lat] } });
    map.addLayer({
      id: `end-point-${id}`, type: 'circle', source: `end-point-${id}`,
      paint: { 'circle-radius': 6, 'circle-color': '#007cbf', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
    });
  }, []);

  const drawSingleLineOnMap = useCallback((map: MaplibreMap, line: RouteData) => {
    const { id, startPoint, endPoint } = line;
    if (map.getSource(`line-source-${id}`)) return;
    
    const lineGeometry = { type: 'LineString' as const, coordinates: [[startPoint.lng, startPoint.lat], [endPoint.lng, endPoint.lat]] };
    
    map.addSource(`line-source-${id}`, { type: 'geojson', data: { type: 'Feature', geometry: lineGeometry, properties: {} } });
    map.addLayer({
      id: `line-layer-${id}`, type: 'line', source: `line-source-${id}`,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ff6b35', 'line-width': 4, 'line-opacity': 0.8, 'line-dasharray': [2, 2] },
    });
    map.addSource(`start-line-point-${id}`, { type: 'geojson', data: { type: 'Point', coordinates: [startPoint.lng, startPoint.lat] } });
    map.addLayer({
      id: `start-line-point-${id}`, type: 'circle', source: `start-line-point-${id}`,
      paint: { 'circle-radius': 6, 'circle-color': '#ff6b35', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
    });
    map.addSource(`end-line-point-${id}`, { type: 'geojson', data: { type: 'Point', coordinates: [endPoint.lng, endPoint.lat] } });
    map.addLayer({
      id: `end-line-point-${id}`, type: 'circle', source: `end-line-point-${id}`,
      paint: { 'circle-radius': 6, 'circle-color': '#ff6b35', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
    });
  }, []);

  const clearAllRoutes = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    
    routesData.forEach(route => {
      const { id } = route;
      if (map.getLayer(`route-layer-${id}`)) map.removeLayer(`route-layer-${id}`);
      if (map.getSource(`route-source-${id}`)) map.removeSource(`route-source-${id}`);
      if (map.getLayer(`start-point-${id}`)) map.removeLayer(`start-point-${id}`);
      if (map.getSource(`start-point-${id}`)) map.removeSource(`start-point-${id}`);
      if (map.getLayer(`end-point-${id}`)) map.removeLayer(`end-point-${id}`);
      if (map.getSource(`end-point-${id}`)) map.removeSource(`end-point-${id}`);
    });
    
    linesData.forEach(line => {
      const { id } = line;
      if (map.getLayer(`line-layer-${id}`)) map.removeLayer(`line-layer-${id}`);
      if (map.getSource(`line-source-${id}`)) map.removeSource(`line-source-${id}`);
      if (map.getLayer(`start-line-point-${id}`)) map.removeLayer(`start-line-point-${id}`);
      if (map.getSource(`start-line-point-${id}`)) map.removeSource(`start-line-point-${id}`);
      if (map.getLayer(`end-line-point-${id}`)) map.removeLayer(`end-line-point-${id}`);
      if (map.getSource(`end-line-point-${id}`)) map.removeSource(`end-line-point-${id}`);
    });
    
    setRoutesData([]);
    setLinesData([]);
    setRoutePopupPositions({});
    setLinePopupPositions({});
    clearCurrentPoints();
  }, [routesData, linesData, clearCurrentPoints]);

  const attachAllTooltipEvents = useCallback((map: MaplibreMap) => {
    const popup = popupRef.current;
    const layerId = INPI_LAYER_ID;

    const checkMeasurement = () => isMeasuringRef.current || isMeasuringLineRef.current;

    if (enterHandlerRef.current) map.off('mouseenter', layerId, enterHandlerRef.current);
    if (leaveHandlerRef.current) map.off('mouseleave', layerId, leaveHandlerRef.current);
    if (clickHandlerRef.current) map.off('click', layerId, clickHandlerRef.current);

    const onEnter = () => {
      if (!checkMeasurement()) map.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
      if (!checkMeasurement()) map.getCanvas().style.cursor = '';
    };

    const onClick = (e: maplibregl.MapMouseEvent & { features?: Feature[] }) => {
      if (checkMeasurement() || !e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const props: any = (feature as any).properties || {};

      const NOM_ENT = props[ENT_KEY] ?? '—';
      const NOM_MUN = props[MUN_KEY] ?? '—';
      const NOM_COM = props[COM_KEY] ?? props[LOC_KEY] ?? '—';
      const PUEBLO  = props[PUE_KEY] ?? props.PUEBLO ?? '—';
      const NOM_LOC = props[LOC_KEY] ?? '—';

      const idFichaRaw = props[ID_KEY] || '';
      const idFicha = String(idFichaRaw).trim();
      const fichaUrl = idFicha ? `${process.env.PUBLIC_URL || ''}/fichas/${idFicha}.html` : undefined;

      onFilterChangeFromMap?.({ 
        entidad: String(NOM_ENT), 
        municipio: String(NOM_MUN), 
        localidad: String(NOM_LOC),
        pueblo: String(PUEBLO)
      });

      const communityData: CommunityData = {
        id: idFicha || String(NOM_LOC || NOM_COM || ''),
        nombre: String(NOM_COM || NOM_LOC || 'Comunidad'),
        entidad: String(NOM_ENT),
        municipio: String(NOM_MUN),
        pueblo: String(PUEBLO),
        poblacion: Number(props.POB || props.poblacion || 0),
        latitud: e.lngLat.lat,
        longitud: e.lngLat.lng,
        htmlUrl: fichaUrl
      };

      const html = `
        <div class="community-popup ${isDarkTheme ? 'dark' : 'light'}">
          <div class="popup-header">
            <div class="location-icon">📍</div>
            <div class="title-section">
              <div class="title">${communityData.nombre}</div>
              <div class="subtitle">Entidad: ${NOM_ENT}</div>
              <div class="subtitle">Municipio: ${NOM_MUN},</div>
              <div class="subtitle">Pueblo: ${PUEBLO}</div>
            </div>
          </div>
          
          <div class="popup-footer">
            <button id="btn-ficha" class="ficha-btn ${fichaUrl ? 'enabled' : 'disabled'}" 
                    ${fichaUrl ? '' : 'disabled title="Sin ID válido para ficha"'}>
              <svg class="ficha-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              <span>Ver Resumen</span>
            </button>
          </div>
        </div>
      `;
      popup.setLngLat(e.lngLat).setHTML(html).addTo(map);

      const popupEl = popup.getElement();
      popupEl.addEventListener('mousedown', (ev) => { ev.stopPropagation(); }, { passive: true });
      popupEl.addEventListener('dblclick',  (ev) => { ev.preventDefault(); ev.stopPropagation(); });
      popupEl.addEventListener('wheel',     (ev) => { ev.stopPropagation(); }, { passive: true });

      const el = popup.getElement().querySelector<HTMLButtonElement>('#btn-ficha');
      if (el) {
        el.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          popup.remove();

          if (communityData.htmlUrl) {
            window.dispatchEvent(new CustomEvent('open-ficha', { detail: { id: communityData.id, url: communityData.htmlUrl }}));
          }
          onCommunityClick(communityData.id, communityData);
        });
      }
    };

    enterHandlerRef.current = onEnter;
    leaveHandlerRef.current = onLeave;
    clickHandlerRef.current = onClick;

    map.on('mouseenter', layerId, onEnter);
    map.on('mouseleave', layerId, onLeave);
    map.on('click',      layerId, onClick);
  }, [isDarkTheme, onCommunityClick, onFilterChangeFromMap]);

  const addVectorLayers = (map: maplibregl.Map) => {
    if (!map.getSource(INPI_SOURCE_ID)) {
      map.addSource(INPI_SOURCE_ID, { type: 'vector', url: 'pmtiles://data/inpi.pmtiles' });
    }
    
    const palette = ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'];
    const pueblosMatch: (string | number)[] = [];
    for (let i = 1; i <= 72; i++) pueblosMatch.push(i.toString(), palette[i % palette.length]);
    const puebloExpression = ['match', ['get', 'ID_Pueblo'], ...pueblosMatch, '#666666'] as any;

    if (!map.getLayer(INPI_LAYER_ID)) {
      map.addLayer({
        id: INPI_LAYER_ID,
        type: 'circle',
        source: INPI_SOURCE_ID,
        'source-layer': INPI_SOURCE_LAYER,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 
            5, 2,
            10, 3,
            15, 5
          ],
          'circle-color': puebloExpression,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'],
            5, 0.1,
            10, 0.5,
            15, 1
          ],
          'circle-opacity': ['interpolate', ['linear'], ['zoom'],
            5, 0.6,
            10, 0.8,
            15, 1
          ]
        }
      });
    }
  };

  const updateLayerVisibility = useCallback((map: maplibregl.Map) => {
    Object.entries(layersVisibility).forEach(([id, visible]) => {
      const vis = visible ? 'visible' : 'none';
      try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis); } catch {}
    });
  }, [layersVisibility]);

  const startCommunityAnimation = (map: maplibregl.Map) => {
    const animatePulse = (timestamp: number) => {
      const t = (Math.sin(timestamp / 200) + 1) / 2;
      const baseRadius = map.getZoom() < 10 ? 2.5 : (map.getZoom() < 15 ? 3 : 5);
      const maxRadius = baseRadius + 0.7;
      const radius = baseRadius + (maxRadius - baseRadius) * t;
      if (map.getLayer(INPI_LAYER_ID)) {
        if (!filters.entidad && !filters.municipio && !filters.comunidad && !filters.pueblo) {
          map.setPaintProperty(INPI_LAYER_ID, 'circle-radius', ['interpolate', ['linear'], ['zoom'], 
            5, radius * 0.8,
            10, radius * 1.2,
            15, radius * 2
          ]);
        }
      }
      blinkAnimationId.current = requestAnimationFrame(animatePulse);
    };
    animatePulse(0);
  };

  const addRouteToMap = useCallback(async (points: LngLatLike[]) => {
    const map = mapRef.current;
    if (!map) return;
    const [startPoint, endPoint] = points.map(p => LngLat.convert(p));
    const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.code !== 'Ok' || data.routes.length === 0) throw new Error('No se pudo encontrar una ruta.');
      const route = data.routes[0];
      const km = (route.distance / 1000).toFixed(2);
      const s = route.duration;
      const h = Math.floor(s / 3600);
      const m = Math.round((s % 3600) / 60);
      const duration = `${h ? `${h} h ` : ''}${m} min`;
      const newRoute: RouteData = { id: routeIdCounter.current++, startPoint, endPoint, geometry: route.geometry, distance: km, duration };
      drawSingleRouteOnMap(map, newRoute);
      setRoutesData(prev => [...prev, newRoute]);
    } catch (e) {
      alert('No se pudo calcular la ruta.');
    } finally {
      clearCurrentPoints();
      setCurrentPoints([]);
    }
  }, [clearCurrentPoints, drawSingleRouteOnMap]);

  const addLineToMap = useCallback((points: LngLatLike[]) => {
    const map = mapRef.current; if (!map) return;
    const [a, b] = points.map(p => LngLat.convert(p));
    const R = 6371;
    const toRad = (x:number)=> x * Math.PI/180;
    const d = Math.acos(Math.sin(toRad(a.lat))*Math.sin(toRad(b.lat)) + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.cos(toRad(b.lng-a.lng))) * R;
    const km = d.toFixed(2);
    const newLine: RouteData = {
      id: routeIdCounter.current++,
      startPoint: a, endPoint: b,
      geometry: { type: 'LineString', coordinates: [[a.lng,a.lat],[b.lng,b.lat]] },
      distance: km, duration: 'Línea recta'
    };
    drawSingleLineOnMap(map, newLine);
    setLinesData(prev => [...prev, newLine]);
    clearCurrentPoints();
    setCurrentLinePoints([]);
  }, [clearCurrentPoints, drawSingleLineOnMap]);

  const toggleMeasurement = () => {
    const was = isMeasuring;
    setIsMeasuring(!was);
    setIsMeasuringLine(false);
    if (was) clearAllRoutes();
    setCurrentPoints([]); setCurrentLinePoints([]);
  };

  const toggleLineMeasurement = () => {
    const was = isMeasuringLine;
    setIsMeasuringLine(!was);
    setIsMeasuring(false);
    if (was) clearAllRoutes();
    setCurrentPoints([]); setCurrentLinePoints([]);
  };

  const resetNorth = () => {
    const map = mapRef.current; 
    if (!map) return;
    map.easeTo({ 
      bearing: 0, 
      pitch: is3D ? map.getPitch() : 0,
      duration: 1000, 
      easing: (t) => t * (2 - t) 
    });
  };

  const toggleSatellite = () => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentBearing = map.getBearing();
    const currentPitch = map.getPitch();
    const was3D = is3D;
    const newIsSatellite = !isSatellite;

    if (map.getTerrain()) map.setTerrain(null);
    if (map.getLayer('sky')) map.removeLayer('sky');

    setIsSatellite(newIsSatellite);

    let newStyleUrl: string;
    if (was3D) {
      newStyleUrl = newIsSatellite ? satelliteStyleUrl : outdoor3DStyleUrl;
    } else {
      newStyleUrl = newIsSatellite ? satelliteStyleUrl : (isDarkTheme ? darkStyleUrl : lightStyleUrl);
    }

    map.setStyle(newStyleUrl, { diff: false });

    map.once('styledata', () => {
      addVectorLayers(map);
      updateLayerVisibility(map);
      routesData.forEach(route => drawSingleRouteOnMap(map, route));
      linesData.forEach(line => drawSingleLineOnMap(map, line));
      attachAllTooltipEvents(map);
      
      setTimeout(() => {
        extractLayerData(map);
        applyMapFilters();
      }, 500);

      if (blinkAnimationId.current) cancelAnimationFrame(blinkAnimationId.current);
      startCommunityAnimation(map);

      map.jumpTo({
        center: currentCenter,
        zoom: currentZoom,
        bearing: currentBearing,
        pitch: was3D ? currentPitch : 0
      });

      if (was3D) {
        if (!map.getSource('terrain-rgb')) {
          map.addSource('terrain-rgb', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${apiKey}`,
            tileSize: 256
          });
        }

        const exaggeration = newIsSatellite ? 1.2 : 1.5;
        const sunIntensity = newIsSatellite ? 3 : 5;

        setTimeout(() => {
          map.setTerrain({ source: 'terrain-rgb', exaggeration: 0.1 });
          animateTerrainExaggeration(map, exaggeration, 1500);
        }, 100);

        if (!map.getLayer('sky')) {
          map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0, 0],
              'sky-atmosphere-sun-intensity': sunIntensity
            }
          } as any);
        }
      }
    });
  };

  const prevIsDarkTheme = useRef(isDarkTheme);
  useEffect(() => {
    if (prevIsDarkTheme.current !== isDarkTheme && !isSatellite) {
      const newStyleUrl = isDarkTheme ? darkStyleUrl : lightStyleUrl;
      changeMapStylePreservingPosition(newStyleUrl);
    }
    prevIsDarkTheme.current = isDarkTheme;
  }, [isDarkTheme, isSatellite, changeMapStylePreservingPosition]);

  const animateCompass = useCallback(() => {
    const map = mapRef.current;
    if (!map) { compassAnimId.current = requestAnimationFrame(animateCompass); return; }
    const target = map.getBearing();
    const current = displayBearingRef.current;
    const diff = ((target - current + 540) % 360) - 180;
    const next = current + diff * 0.15;
    displayBearingRef.current = next;
    setDisplayBearing(next);
    compassAnimId.current = requestAnimationFrame(animateCompass);
  }, []);

  // RESIZE DINÁMICO DEL MAPA PARA ADAPTARSE A LA VENTANA
  useEffect(() => {
    const map = mapRef.current;
    const minimap = minimapRef.current;
    if (!map) return;

    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        try {
          // Redimensionar el mapa principal
          map.resize();
          
          // Redimensionar el minimapa si existe
          if (minimap) {
            minimap.resize();
          }
          
          // Pequeño delay para que el mapa se ajuste completamente
          setTimeout(() => {
            // Trigger repaint para asegurar que todos los tiles se carguen correctamente
            map.triggerRepaint();
            
            // Re-extraer datos después del resize para asegurar cobertura completa
            if (extractedDataRef.current) {
              console.log('Mapa redimensionado, actualizando datos...');
              extractLayerData(map);
            }
          }, 200);
          
        } catch (error) {
          console.warn('Error durante resize del mapa:', error);
        }
      }, 300); // Debounce de 300ms para evitar llamadas excesivas
    };

    // Escuchar eventos de resize
    window.addEventListener('resize', handleResize);
    
    // También escuchar cambios de orientación en móviles
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [extractLayerData]);

  // INICIALIZACIÓN MEJORADA DEL MAPA
  useEffect(() => {
    if (mapRef.current) return;
    const container = containerRef.current; if (!container) return;
    
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    const mexicoBounds: [LngLatLike, LngLatLike] = [[-121, 14], [-84, 33.5]];

    const map = new maplibregl.Map({
      container, 
      style: getCurrentStyleUrl(),
      center: [-100.22696, 23.45928], 
      zoom: 5,
      pitch: 0, 
      bearing: 0, 
      attributionControl: false, 
      maxBounds: mexicoBounds,
      maxPitch: 85
    });
    mapRef.current = map;

    map.on('load', () => {
      console.log('Mapa cargado, inicializando...');
      
      map.addControl(new maplibregl.AttributionControl({ 
        customAttribution: 'Secretaría de Gobernación', 
        compact: true 
      }), 'bottom-right');
      
      addVectorLayers(map);

      if (map.getLayer(INPI_LAYER_ID)) {
        map.setLayoutProperty(INPI_LAYER_ID, 'visibility', 'visible');
        console.log('Capa INPI visible');
      }

      // INICIALIZACIÓN SIMPLIFICADA CON EXTRACCIÓN DIRECTA
      let extractAttempts = 0;
      const tryExtractData = () => {
        extractAttempts++;
        console.log(`Intento ${extractAttempts} de extracción de datos...`);
        
        if (extractAttempts <= 10) {
          setTimeout(() => extractLayerData(map), 1000);
        } else {
          console.error('No se pudieron cargar los datos después de 10 intentos');
        }
      };

      setTimeout(tryExtractData, 2000);

      map.once('idle', () => {
        setTimeout(() => {
          if (!extractedDataRef.current) {
            console.log('Mapa idle, reintentando extracción...');
            extractLayerData(map);
          }
        }, 1000);
      });

      // Minimapa
      const minimap = new maplibregl.Map({
        container: minimapContainerRef.current as HTMLDivElement,
        style: minimapStyleUrl, 
        center: map.getCenter(),
        zoom: map.getZoom() - 3, 
        interactive: false,
        attributionControl: false
      });
      minimapRef.current = minimap;
      
      minimap.on('load', () => {
        minimap.addSource('viewport-bounds', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: {} } });
        minimap.addLayer({ id: 'viewport-bounds-fill', type: 'fill', source: 'viewport-bounds', paint: { 'fill-color': '#007cbf', 'fill-opacity': 0.2 } });
        minimap.addLayer({ id: 'viewport-bounds-outline', type: 'line', source: 'viewport-bounds', paint: { 'line-color': '#007cbf', 'line-width': 2 } });
      });

      const syncMaps = () => {
        if (!minimapRef.current) return;
        const mainBounds = map.getBounds();
        const boundsPolygon: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              mainBounds.getSouthWest().toArray(), mainBounds.getNorthWest().toArray(),
              mainBounds.getNorthEast().toArray(), mainBounds.getSouthEast().toArray(),
              mainBounds.getSouthWest().toArray()
            ]]
          },
          properties: {}
        };
        const source = minimapRef.current.getSource('viewport-bounds') as GeoJSONSource;
        if (source) source.setData(boundsPolygon);
        const mainZoom = map.getZoom();
        const minimapZoom = Math.max(0, mainZoom - 3);
        minimapRef.current.setCenter(map.getCenter());
        minimapRef.current.setZoom(minimapZoom);
      };

      map.on('move', syncMaps);
      map.on('zoom', syncMaps);
      syncMaps();

      attachAllTooltipEvents(map);
      startCommunityAnimation(map);

      if (!compassAnimId.current) {
        compassAnimId.current = requestAnimationFrame(animateCompass);
      }
    });

    return () => {
      if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if(blinkAnimationId.current) cancelAnimationFrame(blinkAnimationId.current);
      if(compassAnimId.current) cancelAnimationFrame(compassAnimId.current);
      compassAnimId.current = null;
      if(mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      if (minimapRef.current) { minimapRef.current.remove(); minimapRef.current = null; }
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current; 
    if (!map) return;
    if (map.isStyleLoaded()) updateLayerVisibility(map);
    else map.once('styledata', () => updateLayerVisibility(map));
  }, [layersVisibility, updateLayerVisibility]);

  useEffect(() => {
    if (currentPoints.length === 2) addRouteToMap(currentPoints);
  }, [currentPoints, addRouteToMap]);

  useEffect(() => {
    if (currentLinePoints.length === 2) addLineToMap(currentLinePoints);
  }, [currentLinePoints, addLineToMap]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const addOrUpdateAnimatedPoint = (id: 'start' | 'end', lngLat: LngLat, isLine: boolean = false) => {
      const prefix = isLine ? 'line-' : '';
      const sourceId = `${id}-point-${prefix}current`;
      const pointFeature: Feature<Point> = { type: 'Feature', geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] }, properties: {} };
      const color = isLine ? '#ff6b35' : '#009f81';
      if (map.getSource(sourceId)) (map.getSource(sourceId) as GeoJSONSource).setData(pointFeature);
      else {
        map.addSource(sourceId, { type: 'geojson', data: pointFeature });
        map.addLayer({ id: `${sourceId}-pulse`, type: 'circle', source: sourceId, paint: { 'circle-radius': 10, 'circle-color': color, 'circle-opacity': 0.8 }});
        map.addLayer({ id: sourceId, type: 'circle', source: sourceId, paint: { 'circle-radius': 6, 'circle-color': color, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }});
      }
    };
    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (isMeasuring) {
        if (currentPoints.length >= 2) return;
        const p = e.lngLat;
        addOrUpdateAnimatedPoint(currentPoints.length === 0 ? 'start' : 'end', p, false);
        setCurrentPoints(prev => [...prev, p]);
      } else if (isMeasuringLine) {
        if (currentLinePoints.length >= 2) return;
        const p = e.lngLat;
        addOrUpdateAnimatedPoint(currentLinePoints.length === 0 ? 'start' : 'end', p, true);
        setCurrentLinePoints(prev => [...prev, p]);
      }
    };
    if (isMeasuring || isMeasuringLine) {
      map.getCanvas().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    }
    return () => { map.getCanvas().style.cursor = ''; map.off('click', handleMapClick); };
  }, [isMeasuring, isMeasuringLine, currentPoints, currentLinePoints, addRouteToMap, addLineToMap]);

  const controlStackStyle: React.CSSProperties = { position: 'absolute', top: 20, left: 20, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 10 };
  const controlButtonStyle: React.CSSProperties = { width: 40, height: 40, borderRadius: 9999, background: isDarkTheme ? '#1f2937' : '#fff', border: `1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'}`, padding: 6, boxShadow: '0 6px 16px rgba(0,0,0,.08)', cursor: 'pointer', color: isDarkTheme ? '#fff' : '#000' };
  const buttonIconStyle: React.CSSProperties = { width: 24, height: 24, display: 'block' };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

<style>{`
  .community-popup { 
    font-family: 'Inter', system-ui, sans-serif; 
    max-width: 300px;
    position: relative;
  }
  .community-popup.dark .title { color: #e5e7eb; }
  .community-popup.light .title{ color: #111827; }
  
  /* Reposicionar el botón de cerrar del popup */
  .maplibregl-popup-close-button {
    position: absolute !important;
    top: 8px !important;
    right: 1px !important;
    width: 24px !important;
    height: 24px !important;
    font-size: 16px !important;
    line-height: 22px !important;
    background: #9b2247 !important;
    color: white !important;
    border-radius: 50% !important;
    border: none !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 1000 !important;
    transition: all 0.2s ease !important;
  }
  
  .maplibregl-popup-close-button:hover {
    background: #611232 !important;
    transform: scale(1.1) !important;
  }
  
  /* Asegurar que el popup tenga espacio para el botón */
  .community-popup {
    padding-top: 10px !important;
  }
  
  .popup-header {
    padding-top: 20px !important;
  }
`}</style>

      <div className="custom-popup-container">
        {routesData.map(route => {
          const position = routePopupPositions[route.id];
          if (!position || !position.visible) return null;
          
          return (
            <div 
              key={route.id} 
              style={{ 
                position: 'absolute', 
                left: `${position.x}px`, 
                top: `${position.y}px`, 
                background:'#111827', 
                color:'#fff', 
                padding:'6px 8px', 
                borderRadius:8,
                transform: 'translate(10px, -50%)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                zIndex: 15
              }}
            >
              <strong>Distancia:</strong> {route.distance} km<br/>
              <strong>Tiempo:</strong> {route.duration}
            </div>
          );
        })}
        {linesData.map(line => {
          const position = linePopupPositions[line.id];
          if (!position || !position.visible) return null;
          
          return (
            <div 
              key={`line-${line.id}`} 
              style={{ 
                position: 'absolute', 
                left:`${position.x}px`, 
                top:`${position.y}px`, 
                background:'#ff6b35', 
                color:'#fff', 
                padding:'6px 8px', 
                borderRadius:8,
                transform: 'translate(10px, -50%)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                zIndex: 15
              }}
            >
              <strong>Distancia:</strong> {line.distance} km<br/>
              <strong>Tipo:</strong> {line.duration}
            </div>
          );
        })}
      </div>

      <div style={controlStackStyle}>
        {/* 1. Vista satélite */}
        <button onClick={toggleSatellite} title={isSatellite ? 'Volver a mapa' : 'Vista satélite'} aria-label="Cambiar vista" style={controlButtonStyle}>
          <img src={isSatellite ? `${process.env.PUBLIC_URL}/satelitec.png` : `${process.env.PUBLIC_URL}/satelitebw.png`} alt="Cambiar vista" style={buttonIconStyle}/>
        </button>
        
        {/* 2. Cálculo de ruta */}
        <button onClick={toggleMeasurement} title={isMeasuring ? 'Terminar medición' : 'Medir ruta'} aria-label="Medir ruta" style={controlButtonStyle}>
          <img src={isMeasuring ? `${process.env.PUBLIC_URL}/rutac.png` : `${process.env.PUBLIC_URL}/rutabw.png`} alt="Medir ruta" style={buttonIconStyle}/>
        </button>
        
        {/* 3. Medición lineal */}
        <button onClick={toggleLineMeasurement} title={isMeasuringLine ? 'Terminar línea recta' : 'Medir línea recta'} aria-label="Medir línea recta" style={controlButtonStyle}>
          <div style={{ ...buttonIconStyle, display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:'bold',color: isDarkTheme ? '#fff' : '#6c757d' }}>⟷</div>
        </button>

        {/* 4. Vista 3D */}
        <button 
          className={`map-control-button ${is3D ? 'active' : ''}`} 
          onClick={toggle3D} 
          title={is3D ? 'Desactivar vista 3D' : 'Activar vista 3D'} 
          aria-label="Vista 3D"
          style={controlButtonStyle}
        >
          <img src={get3DIcon(is3D)} alt="Vista 3D" style={buttonIconStyle}/>
        </button>
        
        {/* 5. Restaurar norte */}
        <button onClick={resetNorth} title="Restaurar norte" aria-label="Restaurar norte" style={{ ...controlButtonStyle, padding:0 }}>
          <svg viewBox="0 0 100 100" style={{ display:'block', width:'100%', height:'100%' }}>
            <circle cx="50" cy="50" r="46" fill={isDarkTheme ? '#1f2937' : '#fff'} stroke={isDarkTheme ? '#374151' : '#e5e7eb'} strokeWidth="4" />
            <circle cx="50" cy="50" r="42" fill={isDarkTheme ? '#111827' : '#f9fafb'} stroke={isDarkTheme ? '#4b5563' : '#d1d5db'} strokeWidth="1" />
            <text x="50" y="18" textAnchor="middle" fontSize="12" fontFamily="Inter, system-ui" fill={isDarkTheme ? '#9ca3af' : '#6b7280'}>N</text>
            <g style={{ transformOrigin:'50px 50px', transform:`rotate(${-displayBearing}deg)` }}>
              <polygon points="50,12 44,50 56,50" fill="#ef4444" />
              <polygon points="50,88 44,50 56,50" fill="#374151" />
              <circle cx="50" cy="50" r="4" fill="#111827" />
            </g>
          </svg>
        </button>
      </div>

      <div ref={minimapContainerRef} className="minimap-container" />
    </div>
  );
};

export default Map;