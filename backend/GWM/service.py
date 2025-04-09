import requests
from requests.auth import HTTPBasicAuth
import os
from django.conf import settings

geoserver_url = settings.GEOSERVER_URL
username = settings.GEOSERVER_USERNAME
password = settings.GEOSERVER_PASSWORD  


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
    

def publish_geotiff(workspace_name, store_name, geotiff_path, layer_name=None):
    if not layer_name:
        layer_name = store_name
    
    # Create a new coveragestore
    coveragestore_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/coveragestores"
    headers = {"Content-type": "application/json"}
    data = {
        "coverageStore": {
            "name": store_name,
            "type": "GeoTIFF",
            "enabled": True,
            "url": f"file:{geotiff_path}"
        }
    }
    
    response = requests.post(
        coveragestore_url,
        auth=HTTPBasicAuth(username, password),
        json=data,
        headers=headers
    )
    
    if response.status_code == 201:
        # Publish the layer
        layer_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/coveragestores/{store_name}/coverages"
        layer_data = {
            "coverage": {
                "name": layer_name,
                "enabled": True
            }
        }
        
        layer_response = requests.post(
            layer_url,
            auth=HTTPBasicAuth(username, password),
            json=layer_data,
            headers=headers
        )
        
        return layer_response.status_code == 201
    
    return False