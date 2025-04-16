'use client'
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import OSM from 'ol/source/OSM';
import GeoTIFF from 'ol/source/GeoTIFF';
import ImageWMS from 'ol/source/ImageWMS';
import { fromLonLat } from 'ol/proj';

// Interface definitions
interface RasterLayerProps {
  id: string;
  visible: boolean;
  url?: string;
  opacity?: number;
  name?: string;
  extent?: [number, number, number, number];
  type?: 'geotiff' | 'wms'; // Add type to distinguish between GeoTIFF and WMS
  workspace?: string;      // For GeoServer workspace
  layerName?: string;      // For GeoServer layer name
  storeName?: string;      // For GeoServer store name
}

interface PixelInfoValue {
  coords: [number, number];
  value: number | null;
  loading: boolean;
  error?: string;
}

interface Organisation {
  id: string;
  name: string;
}

interface RasterFile {
  id: string;
  name: string;
  url?: string;
}

// New interface for processed raster with legends
interface ProcessedRaster {
  id: string;
  name: string;
  url?: string;
  legendCount: number;
  createdAt: string;
  legends?: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
}

interface MapContextType {
  // State
  organisations: Organisation[];
  rasterFiles: RasterFile[];
  selectedOrganisation: string;
  selectedRasterFile: string;
  selectedRasterLayers: RasterLayerProps[];
  pixelInfo: Record<string, PixelInfoValue>;
  isOrganisationsLoading: boolean;
  isRasterFilesLoading: boolean;
  organisationsError: string | null;
  rasterFilesError: string | null;
  organisationDropdownOpen: boolean;
  rasterFileDropdownOpen: boolean;
  
  // New state for legend generation
  legendCount: number;
  isProcessingLegends: boolean;
  processedRaster: ProcessedRaster | null;
  legendGenerationError: string | null;
  
  // Functions
  setPixelInfo: (info: Record<string, PixelInfoValue>) => void;
  handleOrganisationSelect: (organisationName: string) => void;
  handleRasterFileSelect: (rasterFileId: string) => void;
  toggleRasterVisibility: (rasterId: string) => void;
  updateRasterOpacity: (rasterId: string, opacity: number) => void;
  removeRasterLayer: (rasterId: string) => void;
  setOrganisationDropdownOpen: (isOpen: boolean) => void;
  setRasterFileDropdownOpen: (isOpen: boolean) => void;
  getOrganisationName: (id: string) => string;
  getRasterFileName: (id: string) => string;
  
  // New functions for legend generation
  setLegendCount: (count: number) => void;
  generateRasterLegends: () => Promise<void>;
  resetProcessedRaster: () => void;
}

// Helper interfaces for managing OpenLayers references
interface MapRefs {
  map: Map | null;
  layers: Record<string, ImageLayer<any>>;
}

// Create the context with a default undefined value
const MapContext = createContext<MapContextType | undefined>(undefined);

// Provider component
interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  // OpenLayers map references
  const mapRefs = useRef<MapRefs>({
    map: null,
    layers: {}
  });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  
  // State for Organisations and raster files
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [rasterFiles, setRasterFiles] = useState<RasterFile[]>([]);
  
  // State for selected items
  const [selectedOrganisation, setSelectedOrganisation] = useState<string>('');
  const [selectedRasterFile, setSelectedRasterFile] = useState<string>('');
  const [selectedRasterLayers, setSelectedRasterLayers] = useState<RasterLayerProps[]>([]);
  const [pixelInfo, setPixelInfo] = useState<Record<string, PixelInfoValue>>({});

  // UI state
  const [isOrganisationsLoading, setIsOrganisationsLoading] = useState<boolean>(true);
  const [isRasterFilesLoading, setIsRasterFilesLoading] = useState<boolean>(false);
  const [organisationsError, setOrganisationsError] = useState<string | null>(null);
  const [rasterFilesError, setRasterFilesError] = useState<string | null>(null);
  
  // Dropdown state
  const [organisationDropdownOpen, setOrganisationDropdownOpen] = useState<boolean>(false);
  const [rasterFileDropdownOpen, setRasterFileDropdownOpen] = useState<boolean>(false);
  
  // New state for legend generation
  const [legendCount, setLegendCount] = useState<number>(5); // Default to 5 legends
  const [isProcessingLegends, setIsProcessingLegends] = useState<boolean>(false);
  const [processedRaster, setProcessedRaster] = useState<ProcessedRaster | null>(null);
  const [legendGenerationError, setLegendGenerationError] = useState<string | null>(null);

  // Initialize the map
  useEffect(() => {
    // Create the map if it doesn't exist yet and the container is available
    if (mapContainerRef.current && !mapRefs.current.map) {
      mapRefs.current.map = new Map({
        target: mapContainerRef.current,
        layers: [
          new TileLayer({
            source: new OSM()
          })
        ],
        view: new View({
          center: fromLonLat([80.0, 22.0]), // Center on India
          zoom: 5
        })
      });

      // Add click handler for pixel info
      mapRefs.current.map.on('click', (event) => {
        const map = mapRefs.current.map;
        if (!map) return;

        const coordinate = map.getCoordinateFromPixel(event.pixel);
        
        // Collect pixel info for each visible layer
        selectedRasterLayers.forEach(layer => {
          if (layer.visible && layer.id) {
            const olLayer = mapRefs.current.layers[layer.id];
            if (olLayer) {
              // In a real implementation, you would get actual pixel values
              // For now, we'll use a mock implementation
              setPixelInfo(prev => ({
                ...prev,
                [layer.id]: {
                  coords: coordinate as [number, number],
                  value: Math.random() * 100, // Mock value
                  loading: false
                }
              }));
            }
          }
        });
      });
    }

    // Cleanup on unmount
    return () => {
      if (mapRefs.current.map) {
        mapRefs.current.map.setTarget(undefined);
        mapRefs.current.map = null;
      }
    };
  }, []);

  // Sync raster layers with OpenLayers when they change
  useEffect(() => {
    const map = mapRefs.current.map;
    if (!map) return;

    // This effect syncs the state of selectedRasterLayers with the actual OpenLayers layers
    selectedRasterLayers.forEach(layer => {
      const olLayer = mapRefs.current.layers[layer.id];
      
      if (olLayer) {
        // Update existing layer properties
        olLayer.setVisible(layer.visible);
        olLayer.setOpacity(layer.opacity || 1.0);
      } else if (layer.url) {
        let newOlLayer;
        
        // Different handling based on layer type
        if (layer.type === 'wms' || layer.layerName) {
          // Create WMS layer for GeoServer
          const workspace = layer.workspace || '';
          const layerName = layer.layerName || layer.id;
          
          // If workspace is provided, use it in the layer name
          const fullLayerName = workspace ? `${workspace}:${layerName}` : layerName;
          
          newOlLayer = new ImageLayer({
            source: new ImageWMS({
              url: layer.url,
              params: {
                'LAYERS': fullLayerName,
                'TILED': true,
                'FORMAT': 'image/png'
              },
              ratio: 1,
              serverType: 'geoserver'
            }),
            visible: layer.visible,
            opacity: layer.opacity ?? 1.0
          });
          
          console.log(`Created WMS layer for ${layer.name} with layer ${fullLayerName} connecting to GeoServer at ${layer.url}`);
        } else {
          // For GeoTIFF files (fallback)
          try {
            newOlLayer = new ImageLayer({
              source: new GeoTIFF({
                sources: [{
                  url: layer.url
                }]
              }),
              visible: layer.visible,
              opacity: layer.opacity || 1.0
            });
            
            console.log(`Created GeoTIFF layer for ${layer.name}`);
          } catch (error) {
            console.error(`Error creating GeoTIFF layer for ${layer.name}:`, error);
            return; // Skip this layer
          }
        }
        
        // Set extent if available
        if (layer.extent) {
          newOlLayer.setExtent(layer.extent);
        }
        
        // Add layer to map
        map.addLayer(newOlLayer);
        
        // Store reference
        mapRefs.current.layers[layer.id] = newOlLayer;
      }
    });

    // Check for layers to remove (layers in refs but not in selectedRasterLayers)
    const currentLayerIds = selectedRasterLayers.map(l => l.id);
    Object.keys(mapRefs.current.layers).forEach(layerId => {
      if (!currentLayerIds.includes(layerId)) {
        // Remove layer from map
        map.removeLayer(mapRefs.current.layers[layerId]);
        // Remove reference
        delete mapRefs.current.layers[layerId];
      }
    });
  }, [selectedRasterLayers]);

  // Fetch Organisations on component mount
  useEffect(() => {
    const fetchOrganisations = async () => {
      try {
        setIsOrganisationsLoading(true);
        setOrganisationsError(null);
        const response = await fetch('http://localhost:9000/api/raster_visual/categories/');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Organisations: ${response.statusText}`);
        }      
          
        const data = await response.json();
        console.log("Organizations data:", data);
        setOrganisations(data);
      } catch (error) {
        console.error('Error fetching Organisations:', error);
        setOrganisationsError(error instanceof Error ? error.message : 'Failed to load Organisations');
      } finally {
        setIsOrganisationsLoading(false);
      }
    };

    fetchOrganisations();
  }, []);

  // Fetch raster files when Organisation is selected
  useEffect(() => {
    if (!selectedOrganisation) return;
    
    const fetchRasterFiles = async () => {
      try {
        setIsRasterFilesLoading(true);
        setRasterFilesError(null);
        console.log("Fetching files for organization:", selectedOrganisation);
        
        // Change endpoint to specifically fetch files for selected organization
        const response = await fetch(`http://localhost:9000/api/raster_visual/categories/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ organisation: selectedOrganisation }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch raster files: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Raster files received:', data);
        
        if (Array.isArray(data)) {
          setRasterFiles(data);
        } else {
          console.error('Expected array of raster files but got:', data);
          setRasterFiles([]);
          setRasterFilesError('Invalid response format for raster files');
        }
      } catch (error) {
        console.error('Error fetching raster files:', error);
        setRasterFilesError(error instanceof Error ? error.message : 'Failed to load raster files');
      } finally {
        setIsRasterFilesLoading(false);
      }
    };

    fetchRasterFiles();
    
    // Reset processed raster when organization changes
    setProcessedRaster(null);
  }, [selectedOrganisation]);

  // Reset processed raster when raster file changes
  useEffect(() => {
    if (selectedRasterFile) {
      setProcessedRaster(null);
    }
  }, [selectedRasterFile]);

  // Handle Organisation selection
  const handleOrganisationSelect = (organisationId: string) => {
    console.log("Selecting organization with ID:", organisationId);
    setSelectedOrganisation(organisationId);
    setSelectedRasterFile(''); // Reset raster file selection
    
    // Remove all layers when changing organisation
    const map = mapRefs.current.map;
    if (map) {
      // Remove all existing layers from the map
      Object.values(mapRefs.current.layers).forEach(layer => {
        map.removeLayer(layer);
      });
      
      // Clear layer references
      mapRefs.current.layers = {};
    }
    
    // Clear states
    setSelectedRasterLayers([]);
    setPixelInfo({});
    setOrganisationDropdownOpen(false);
    setProcessedRaster(null);
  };

  // Handle raster file selection
  const handleRasterFileSelect = async (rasterFileId: string) => {
    setSelectedRasterFile(rasterFileId);
    setRasterFileDropdownOpen(false);
    console.log("Selected raster file ID:", rasterFileId);
    
    // Find the selected raster file
    const selectedFile = rasterFiles.find(file => file.id === rasterFileId);
    
    if (selectedFile) {
      try {
        const response = await fetch(`http://localhost:9000/api/raster_visual/rasters/files/${rasterFileId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch raster file: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Raster file data:", data);
        
        // Handle GeoServer response
        if (data.success && data.layer_name) {
          // Create a WMS layer for GeoServer
          const rasterLayer: RasterLayerProps = {
            id: selectedFile.id,
            name: selectedFile.name,
            visible: true,
            opacity: 1.0,
            type: 'wms',
            url: 'http://localhost:9090/geoserver/wms', // Adjust this URL to your GeoServer if needed
            layerName: data.layer_name,
            storeName: data.store_name,
            workspace: 'GWM' // Adjust workspace as needed based on your GeoServer configuration
          };

          // Make all other layers invisible
          const updatedLayers = selectedRasterLayers.map(layer => ({
            ...layer,
            visible: false
          }));

          // Add this layer to existing layers
          setSelectedRasterLayers([...updatedLayers, rasterLayer]);
        } else {
          // Fallback to previous implementation for non-GeoServer responses
          console.error('Invalid response format or GeoServer data not available');
        }
      } catch (error) {
        console.error('Error fetching raster details:', error);
      }
    }
    
    // Reset processed raster when selecting a new raster file
    setProcessedRaster(null);
  };

  // Toggle raster layer visibility
  const toggleRasterVisibility = (rasterId: string) => {
    setSelectedRasterLayers(prevLayers => {
      // First make all layers invisible
      const updatedLayers = prevLayers.map(layer => ({
        ...layer,
        visible: layer.id === rasterId ? !layer.visible : false
      }));
      
      // Update OpenLayers layers' visibility
      updatedLayers.forEach(layer => {
        const olLayer = mapRefs.current.layers[layer.id];
        if (olLayer) {
          olLayer.setVisible(layer.visible);
        }
      });
      
      return updatedLayers;
    });
  };

  // Update raster layer opacity
  const updateRasterOpacity = (rasterId: string, opacity: number) => {
    // First update the state
    setSelectedRasterLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === rasterId ? { ...layer, opacity } : layer
      )
    );
    
    // Then directly update the OpenLayers layer
    const olLayer = mapRefs.current.layers[rasterId];
    if (olLayer) {
      olLayer.setOpacity(opacity);
    }
  };

  // Remove raster layer
  const removeRasterLayer = (rasterId: string) => {
    // First, remove from OpenLayers
    const map = mapRefs.current.map;
    const layerToRemove = mapRefs.current.layers[rasterId];
    
    if (map && layerToRemove) {
      map.removeLayer(layerToRemove);
      delete mapRefs.current.layers[rasterId];
    }
    
    // Then update the state
    setSelectedRasterLayers(prevLayers => 
      prevLayers.filter(layer => layer.id !== rasterId)
    );
    
    // Also clear any pixel info for this layer
    setPixelInfo(prevInfo => {
      const newInfo = { ...prevInfo };
      delete newInfo[rasterId];
      return newInfo;
    });
  };

  // Get Organisation name by ID
  const getOrganisationName = (id: string) => {
    const org = organisations.find(org => org.id === id);
    return org ? org.name : 'Select an Organisation';
  };

  // Get raster file name by ID
  const getRasterFileName = (id: string) => {
    const file = rasterFiles.find(file => file.id === id);
    return file ? file.name : 'Select a raster file';
  };
  
  // New function to generate raster legends
  const generateRasterLegends = async () => {
    if (!selectedRasterFile || !selectedOrganisation) {
      setLegendGenerationError('No raster file or organisation selected');
      return;
    }
    
    setIsProcessingLegends(true);
    setLegendGenerationError(null);
    
    try {
      // Call backend API to generate legends
      const response = await fetch('http://localhost:9000/api/raster_visual/rasters/generate-legends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rasterId: selectedRasterFile,
          geo_organisation:,
          legendCount: legendCount
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate legends: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Generated legends response:', data);
      
      // Set the processed raster with generated legends
      setProcessedRaster({
        id: data.id || `processed-${Date.now()}`, // Use returned ID or generate temporary one
        name: data.name || `${getRasterFileName(selectedRasterFile)} (Processed)`,
        url: data.url,
        legendCount: legendCount,
        createdAt: data.createdAt || new Date().toISOString(),
        legends: data.legends || []
      });
      
      // If the response includes a new raster layer, add it to the map
      if (data.url) {
        const newRasterLayer: RasterLayerProps = {
          id: data.id,
          name: data.name || `${getRasterFileName(selectedRasterFile)} (Processed)`,
          visible: true,
          url: data.url,
          opacity: 1.0,
          extent: data.extent || [68.0, 6.0, 98.0, 36.0] // Use returned extent or default to India
        };
        
        // Make all other layers invisible and add the new one
        const updatedLayers = selectedRasterLayers.map(layer => ({
          ...layer,
          visible: false
        }));
        
        setSelectedRasterLayers([...updatedLayers, newRasterLayer]);
      }
      
    } catch (error) {
      console.error('Error generating legends:', error);
      setLegendGenerationError(error instanceof Error ? error.message : 'Failed to generate legends');
    } finally {
      setIsProcessingLegends(false);
    }
  };
  
  // Reset processed raster
  const resetProcessedRaster = () => {
    setProcessedRaster(null);
  };

  // Creating the context value object
  const contextValue: MapContextType = {
    // State
    organisations,
    rasterFiles,
    selectedOrganisation,
    selectedRasterFile,
    selectedRasterLayers,
    pixelInfo,
    isOrganisationsLoading,
    isRasterFilesLoading,
    organisationsError,
    rasterFilesError,
    organisationDropdownOpen,
    rasterFileDropdownOpen,
    
    // New state for legend generation
    legendCount,
    isProcessingLegends,
    processedRaster,
    legendGenerationError,
    
    // Functions
    setPixelInfo,
    handleOrganisationSelect,
    handleRasterFileSelect,
    toggleRasterVisibility,
    updateRasterOpacity,
    removeRasterLayer,
    setOrganisationDropdownOpen,
    setRasterFileDropdownOpen,
    getOrganisationName,
    getRasterFileName,
    
    // New functions for legend generation
    setLegendCount,
    generateRasterLegends,
    resetProcessedRaster
  };

  return (
    <MapContext.Provider value={contextValue}>
      {children}
    </MapContext.Provider>
  );
}

// Custom hook to use the map context
export function useMapContext() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}