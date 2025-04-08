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
import GeoTIFF from 'ol/source/GeoTIFF';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import 'ol/ol.css';

// Define interfaces for the raster layer and pixel info
interface RasterLayerProps {
  id: string;
  visible: boolean;
  url?: string;
  opacity?: number;
  name?: string;
  extent?: [number, number, number, number]; // [minX, minY, maxX, maxY] in lon/lat
  type?: 'geotiff' | 'wms'; // Add type to distinguish between GeoTIFF and WMS
  workspace?: string;      // Optional - for GeoServer workspace
  layerName?: string;      // Optional - for GeoServer layer name
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
  } = useMapContext() as {
    selectedRasterLayers: RasterLayerProps[];
    pixelInfo: Record<string, PixelInfoValue>;
    setPixelInfo: (info: Record<string, PixelInfoValue>) => void;
  };
  
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
    
    // Handle map clicks to get pixel info
    initialMap.on('click', async (event) => {
      const [lon, lat] = toLonLat(event.coordinate);
      
      // Process each visible layer to get pixel information
      for (const layerId in layersRef.current) {
        const layer = layersRef.current[layerId];
        
        if (layer.getVisible()) {
          try {
            setPixelInfo(prev => ({
              ...prev,
              [layerId]: {
                coords: [lon, lat],
                value: null,
                loading: true
              }
            }));
            
            const source = layer.getSource();
            
            // Handle WMS GetFeatureInfo
            if (source instanceof ImageWMS) {
              const viewResolution = initialMap.getView().getResolution();
              const url = source.getFeatureInfoUrl(
                event.coordinate, 
                viewResolution || 1, 
                'EPSG:3857',
                {'INFO_FORMAT': 'application/json'}
              );
              
              if (url) {
                const response = await fetch(url);
                const data = await response.json();
                
                // Extract value from GetFeatureInfo response
                // This is simplified - you'll need to adapt to your actual GeoServer response format
                const value = data.features?.[0]?.properties?.GRAY_INDEX;
                
                setPixelInfo(prev => ({
                  ...prev,
                  [layerId]: {
                    coords: [lon, lat],
                    value: value !== undefined ? value : null,
                    loading: false
                  }
                }));
              } else {
                setPixelInfo(prev => ({
                  ...prev,
                  [layerId]: {
                    coords: [lon, lat],
                    value: null,
                    loading: false,
                    error: 'GetFeatureInfo not available'
                  }
                }));
              }
            } 
            // Handle GeoTIFF sources
            else if (source instanceof GeoTIFF) {
              // Note: OpenLayers GeoTIFF handling is different from georaster
              // This is a simplified example - you may need to adapt based on your needs
              console.log(`Clicked at coordinates [${lon}, ${lat}] for layer ${layerId}`);
              
              setPixelInfo(prev => ({
                ...prev,
                [layerId]: {
                  coords: [lon, lat],
                  value: null, // Would need additional logic to extract value from GeoTIFF
                  loading: false,
                  error: 'Direct value extraction not implemented'
                }
              }));
            } else {
              setPixelInfo(prev => ({
                ...prev,
                [layerId]: {
                  coords: [lon, lat],
                  value: null,
                  loading: false,
                  error: 'Unsupported layer type for value extraction'
                }
              }));
            }
          } catch (error) {
            console.error(`Error getting value for layer ${layerId}:`, error);
            setPixelInfo(prev => ({
              ...prev,
              [layerId]: {
                coords: [lon, lat],
                value: null,
                loading: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }));
          }
        }
      }
    });
    
    return () => {
      initialMap.setTarget(undefined);
    };
  }, [setPixelInfo]);
  
  // Handle raster layers changes
  useEffect(() => {
    if (!map) return;
    
    // Remove layers that are no longer in the selected list
    Object.entries(layersRef.current).forEach(([id, layer]) => {
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
        
        // Update visibility
        layer.setVisible(rasterLayer.visible);
        
        // Update opacity
        layer.setOpacity(rasterLayer.opacity ?? 1.0);
      } 
      // Create new layer if it doesn't exist yet
      else if (rasterLayer.url) {
        let layer;
        
        // Different handling based on layer type
        if (rasterLayer.type === 'wms' || rasterLayer.url.includes('geoserver')) {
          // Create WMS layer for GeoServer
          const workspace = rasterLayer.workspace || '';
          const layerName = rasterLayer.layerName || rasterLayer.id;
          
          // If workspace is provided, use it in the layer name
          const fullLayerName = workspace ? `${workspace}:${layerName}` : layerName;
          
          layer = new ImageLayer({
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
          
          console.log(`Created WMS layer for ${rasterLayer.id} connecting to GeoServer at ${rasterLayer.url}`);
        } else {
          // For GeoTIFF files
          try {
            // Convert extent from lon/lat to Web Mercator if provided
            let extent;
            if (rasterLayer.extent) {
              const lowerLeft = fromLonLat([rasterLayer.extent[0], rasterLayer.extent[1]]);
              const upperRight = fromLonLat([rasterLayer.extent[2], rasterLayer.extent[3]]);
              extent = [lowerLeft[0], lowerLeft[1], upperRight[0], upperRight[1]];
            }
            
            // Use the GeoTIFF source
            layer = new ImageLayer({
              source: new GeoTIFF({
                sources: [{
                  url: rasterLayer.url
                }]
              }),
              visible: rasterLayer.visible,
              opacity: rasterLayer.opacity ?? 1.0
            });
            
            console.log(`Created GeoTIFF layer for ${rasterLayer.id}`);
          } catch (error) {
            console.error(`Error creating GeoTIFF layer for ${rasterLayer.id}:`, error);
            return; // Skip this layer
          }
        }
        
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