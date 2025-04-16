import requests
from requests.auth import HTTPBasicAuth
import os
from django.conf import settings

geoserver_url = settings.GEOSERVER_URL
username = settings.GEOSERVER_USERNAME
password = settings.GEOSERVER_PASSWORD  
geoserver_extenal_url=settings.GEOSERVER_EX_URL
wcs_url=f"{geoserver_extenal_url}+/wcs"
input_path=f"{settings.BASE_DIR}"+"/temp/input"
output_path=f"{settings.BASE_DIR}"+"/temp/output"

def create_workspace(workspace_name):
    # First check if workspace already exists
    check_url = f"{geoserver_url}/rest/workspaces/{workspace_name}"
    check_response = requests.get(
        check_url,
        auth=HTTPBasicAuth(username, password)
    )
    print("check_response",check_response)
    if check_response.status_code == 200:
        print(f"Workspace '{workspace_name}' already exists")
        return True
    
  
    workspace_url = f"{geoserver_url}/rest/workspaces"
    headers = {"Content-type": "application/json"}
    data = {"workspace": {"name": workspace_name}}
    
    response = requests.post(
        workspace_url,
        auth=HTTPBasicAuth(username, password),
        json=data,
        headers=headers
    )
    
    if response.status_code == 201:
        print(f"Workspace '{workspace_name}' created successfully")
        return True
        
    else:
        print(f"Failed to create workspace: {response.status_code}, {response.text}")
        return False

def publish_geotiff(workspace_name, store_name, geotiff_path):
    # Upload the file directly (this will auto-create a layer)
    upload_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/coveragestores/{store_name}/file.geotiff"
    
    with open(geotiff_path, 'rb') as file:
        upload_headers = {'Content-type': 'image/tiff'}
        response = requests.put(
            upload_url,
            auth=HTTPBasicAuth(username, password),
            data=file,
            headers=upload_headers
        )
    
    print(f"Upload response: {response.status_code}")
    
    if response.status_code in [200, 201]:
        # Get information about the coveragestore to find the associated layer
        coverage_info_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/coveragestores/{store_name}/coverages.json"
        
        info_response = requests.get(
            coverage_info_url,
            auth=HTTPBasicAuth(username, password)
        )
        
        if info_response.status_code == 200:
            coverages_data = info_response.json()
            
            # Extract coverage/layer names
            if 'coverages' in coverages_data and 'coverage' in coverages_data['coverages']:
                # Multiple coverages case
                layer_names = [coverage['name'] for coverage in coverages_data['coverages']['coverage']]
                print(f"Auto-created layer names: {layer_names}")
                
                # Usually there's just one layer per GeoTIFF
                layer_name = layer_names[0] if layer_names else store_name
                
                return {
                    "success": True,
                    "store_name": store_name,
                    "layer_name": layer_name,
                    "all_layers": layer_names
                }
            else:
                # If we can't get layer info, default to store name (common case)
                print("No coverage information found, using store name as layer name")
                return {
                    "success": True,
                    "store_name": store_name,
                    "layer_name": store_name  # Usually layer name = store name for auto-created layers
                }
    
    return {
        "success": False,
        "store_name": store_name,
        "upload_status": response.status_code
    }

def raster_download(workspace_name,store_name,layer_name):
    print("workspace",workspace_name)
    print("store_name",store_name)
    print("layer_name",layer_name)
    print(settings.BASE_DIR)
    
    geoserver_wcs_url = (
                "http://geoserver:8080/geoserver/wcs"
                f"?service=WCS"
                f"&version=2.0.1"
                f"&request=GetCoverage"
                f"&coverageId={layer_name}"
                f"&format=image/geotiff"
            )
    r = requests.get(geoserver_wcs_url
                , auth=HTTPBasicAuth(username, password),
                cookies={})
    print(r.status_code)
    if r.status_code == 200:
        filename = layer_name.split(":")[-1] + ".tif"
        os.makedirs(input_path, exist_ok=True)
        file_path = os.path.join(input_path, filename)
        with open(file_path, "wb") as f:
            f.write(r.content)

    pass
def raster_legends():
    pass
