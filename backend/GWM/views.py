from raster_visual.models import RasterVisual
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import FileResponse, Http404
from django.conf import settings
import os
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

class rasters_get(APIView):
    def get(self,request,format=None):
        raster_objects = RasterVisual.objects.values_list('organisation', flat=True).distinct()
        resp=[{"id":val+1,"name":x} for val,x in enumerate(raster_objects)]
        print('resp',resp)
        return Response(resp,status=status.HTTP_200_OK)

    def post(self,request,format=None):
        org=request.data['organisation']
        resp = RasterVisual.objects.values_list('id','name').filter(organisation=org)
        resp=map(lambda x:{"id":x[0],"name":x[1]},resp)
        return Response(resp,status=status.HTTP_200_OK)
    
@method_decorator(csrf_exempt, name='dispatch')
class rasters_file(APIView):
    def get(self, request, id, format=None):
        try:
            result = RasterVisual.objects.values('file_location').filter(id=id).first()
            if not result:
                raise Http404("Raster file not found")
            
            file_path = result['file_location']
            BASE_DIR = os.path.join(settings.BASE_DIR, 'media', file_path)
            
            print(f"Attempting to serve file from: {BASE_DIR}")
            print(f"File exists: {os.path.exists(BASE_DIR)}")
            
            if not os.path.exists(BASE_DIR):
                return Response({"error": f"File does not exist at path: {BASE_DIR}"}, 
                               status=status.HTTP_404_NOT_FOUND)
            
            # Set correct content type for GeoTIFF
            response = FileResponse(
                open(BASE_DIR, 'rb'),
                content_type='image/tiff'
            )
            
            # Add CORS headers
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            
            # Add cache control headers to prevent caching issues
            response["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response["Pragma"] = "no-cache"
            response["Expires"] = "0"
            
            return response
            
        except Exception as e:
            print(f"Error serving raster file: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
