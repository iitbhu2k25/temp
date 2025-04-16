import requests
import os 
from requests.auth import HTTPBasicAuth
username = "admin"
password = "geoserver"

layer="raster_1744772355"
geoserver_url = (
            "http://localhost:9090/geoserver/wcs"
            f"?service=WCS"
            f"&version=2.0.1"
            f"&request=GetCoverage"
            f"&coverageId={layer}"
            f"&format=image/geotiff"
        )
r = requests.get(geoserver_url
            , auth=HTTPBasicAuth(username, password),
            cookies={})
print(r.status_code)
if r.status_code == 200:
    filename = layer.split(":")[-1] + ".tif"
    media_dir = os.path.join("media", "rasters")
    os.makedirs(media_dir, exist_ok=True)
    print(media_dir)
    file_path = os.path.join(media_dir, filename)
    with open(file_path, "wb") as f:
        f.write(r.content)
