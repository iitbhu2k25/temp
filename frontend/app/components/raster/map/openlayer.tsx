'use client';
import { useEffect, useRef, useState } from 'react';
import { useMapContext } from '@/app/contexts/MapContext';

// OpenLayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import OSM from 'ol/source/OSM';
import ImageWMS from 'ol/source/ImageWMS';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import 'ol/ol.css';

// Basic interfaces
interface RasterLayerProps {
  id: string;
  visible: boolean;
  url?: string;
  opacity?: number;
  name?: string;
  workspace?: string;
  layerName?: string;
}

interface PixelInfoValue {
  coords: [number, number];
  value: number | null;
  loading: boolean;
  error?: string;
}

const MapComponent = () => {
  const {
    selectedRasterLayers,
    pixelInfo,
    setPixelInfo
  } = useMapContext();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const layersRef = useRef<Record<string, TileLayer<any> | ImageLayer<any>>>({});
  
  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;
    
    // Initialize the OpenLayers map
    const initialMap = new Map({
      target: mapRef.current,
      controls: defaultControls(),
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]), // Center on India
        zoom: 5
      })
    });
    
    setMap(initialMap);
    
    // Simple click handler
    initialMap.on('click', (event) => {
      const [lon, lat] = toLonLat(event.coordinate);
      
      // Just capture coordinates for now
      for (const layerId in layersRef.current) {
        const layer = layersRef.current[layerId];
        
        if (layer.getVisible()) {
          setPixelInfo(prev => ({
            ...prev,
            [layerId]: {
              coords: [lon, lat],
              value: Math.random() * 100, // Dummy value for testing
              loading: false
            }
          }));
        }
      }
    });
    
    return () => {
      initialMap.setTarget(undefined);
    };
  }, [setPixelInfo]);
  
  // Auto-load the default WMS layer when map is initialized
  useEffect(() => {
    if (!map) return;
    
    // Create default WMS layer on component mount
    const defaultLayer = new ImageLayer({
      source: new ImageWMS({
        url: "http://localhost:9090/geoserver/GWM/wms",
        params: {
          'LAYERS': "raster_1744449072",
          'TILED': true,
          'FORMAT': 'image/png'
        },
        ratio: 1,
        serverType: 'geoserver'
      }),
      visible: true,
      opacity: 1.0
    });
    
    // Generate a unique ID for this default layer
    const defaultLayerId = 'default-wms-layer';
    
    // Store the layer reference
    layersRef.current[defaultLayerId] = defaultLayer;
    
    // Add layer to map
    map.addLayer(defaultLayer);
    
    console.log('Auto-loaded default WMS layer');
    
  }, [map]); // Only run when map is initialized
  
  // Handle raster layers changes from context
  useEffect(() => {
    if (!map) return;
    
    // Remove layers that are no longer in the selected list
    Object.entries(layersRef.current).forEach(([id, layer]) => {
      // Skip removing the default layer
      if (id === 'default-wms-layer') return;
      
      if (!selectedRasterLayers.some(rasterLayer => rasterLayer.id === id)) {
        map.removeLayer(layer);
        delete layersRef.current[id];
      }
    });
    
    // Add or update layers based on the selected list
    selectedRasterLayers.forEach(rasterLayer => {
      // Update existing layer properties if it exists
      if (layersRef.current[rasterLayer.id]) {
        const layer = layersRef.current[rasterLayer.id];
        layer.setVisible(rasterLayer.visible);
        layer.setOpacity(rasterLayer.opacity ?? 1.0);
      } 
      // Create new layer if it doesn't exist yet
      else if (rasterLayer.url) {
        // Create WMS layer for GeoServer
        const workspace = rasterLayer.workspace || '';
        const layerName = rasterLayer.layerName || rasterLayer.id;
        
        // If workspace is provided, use it in the layer name
        const fullLayerName = workspace ? `${workspace}:${layerName}` : layerName;
        
        const layer = new ImageLayer({
          source: new ImageWMS({
            url: rasterLayer.url,
            params: {
              'LAYERS': fullLayerName,
              'TILED': true,
              'FORMAT': 'image/png'
            },
            ratio: 1,
            serverType: 'geoserver'
          }),
          visible: rasterLayer.visible,
          opacity: rasterLayer.opacity ?? 1.0
        });
        
        // Store the layer reference
        layersRef.current[rasterLayer.id] = layer;
        
        // Add layer to map
        map.addLayer(layer);
      }
    });
  }, [map, selectedRasterLayers]);
  
  return (
    <div 
      ref={mapRef} 
      className="w-full h-full border rounded-lg shadow-sm"
      style={{ minHeight: '500px' }}
    />
  );
};

export default MapComponent;