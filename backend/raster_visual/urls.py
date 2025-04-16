from django.urls import path
from .views import rasters_get,rasters_file
urlpatterns = [
    path('categories/',rasters_get.as_view(),name="raster_categories"),
    path('rasters/files/<int:id>/',rasters_file.as_view(),name="raster_files"),
    path('rasters/generate-legends/',rasters_get.as_view(),name="raster_legends"),
]
