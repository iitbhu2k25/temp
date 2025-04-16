<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld
http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" version="1.0.0">
<UserLayer>
	<Name>raster_layer</Name>
	<UserStyle>
		<Name>raster</Name>
		<Title>8-Class Raster Style</Title>
		<Abstract>A style for rasters with 8 distinct classes</Abstract>
		<FeatureTypeStyle>
	        <FeatureTypeName>Feature</FeatureTypeName>
			<Rule>
				<RasterSymbolizer>
				    <Opacity>1.0</Opacity>
				    <ColorMap type="">
				        <ColorMapEntry color="#0000FF" quantity="1" label="Class 1"/>
                      	<ColorMapEntry color="#4346FF" quantity="2" label="Class 2"/>
				     
				    </ColorMap>
				</RasterSymbolizer>
			</Rule>
		</FeatureTypeStyle>
	</UserStyle>
</UserLayer>
</StyledLayerDescriptor>
