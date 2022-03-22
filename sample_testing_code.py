# -*- coding: utf-8 -*-
"""
Created on Fri Mar 11 13:20:12 2022

@author: vsriva11
"""

import geopandas

from werkzeug.utils import secure_filename

#Import a generic Arizona Dataset, which has county subdivision data, along with total land area, and total water area

myshpfile = geopandas.read_file(r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer-dev-main\static\data\cb_2020_04_cousub_500k\cb_2020_04_cousub_500k.shp")
myshpfile.rename(columns={'GEOID': 'UID', 'NAME': 'county_name', 'NAMELSADCO': 'county','STATE_NAME': 'state_name'}, inplace=True)

myshpfile=myshpfile[['UID','county_name','county','state_name','ALAND','AWATER','geometry']]
myshpfile['UID']=myshpfile['UID'].astype(int)



#Convert the polygon type geometry to point type geometry by calculating centroids
points = myshpfile.copy()
points['geometry'] = points['geometry'].centroid

points['Long_'] = points.geometry.x
points['Lat'] = points.geometry.y

points.to_file('arizona_counties_point.geojson', driver='GeoJSON')
points.drop('geometry',axis=1).to_csv('arizona_counties.csv',index=False)

myshpfile = myshpfile.merge(points[['UID','Long_','Lat']],on='UID')

myshpfile.to_file('arizona_counties_polygon.geojson', driver='GeoJSON')

# georgia = geopandas.read_file(r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer-dev-main\static\data\georgia_shape\G_utm.shp")
# chicago = geopandas.read_file(r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer-dev-main\static\data\airbnb_shape\airbnb_Chicago 2015.shp")

#Import biodiversity related data of the entire USA
us_tree_priorities= geopandas.read_file(r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer-dev-main\static\data\biodiversity_layers_data_USA\GeoTIFFs_and_shapefiles\Trees_priorities.shp")



#Import tif file for tree richness
#filter it to contain only data in Arizona (figure out how to filter raster data by latitude and longitue values)
#Need tofigure out how to send filtered raster data with improved resolution to FE for as it is dislay
import geopandas
import rasterio as rio
from rasterio.plot import show
from shapely.geometry import Point
import numpy as np
from rasterio.warp import transform
from rasterio.crs import CRS




treeRichnessUSA = rio.open(r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer-dev-main\static\data\biodiversity_layers_data_USA\GeoTIFFs_and_shapefiles\Trees_total_richness_mercator.tif")


treeRichnessUSA.meta #Raster/cell/grid dimensions: 10000X10000 (implies 10000m X10000m/10km X10km in spatial extent)
#check the coordinate reference system 
treeRichnessUSA.crs

#check bounds(the numbers define the map’s bounding box in units of meters relative to some origin that is defined by the cr,#left, bottom, right, or top (corresponding to xmin, ymin, xmax, and ymax, respectively)s)
treeRichnessUSA.bounds

#Check pixel size (by convention, the origin is defined as the top-left corner )
treeRichnessUSA.transform

#In this case, 1 different band is available; each band represents a grayscale map for a specific wavelength region
treeRichnessUSA.indexes

img = treeRichnessUSA.read(1)


#show(imgdata*3)  # factor 3 to increase brightness
show(treeRichnessUSA)





#Try changing the coordinate system

#Done in Command line, using rio warp --resampling bilinear --dst-crs EPSG:3857 landsat5_stack.tif landsat5_mercator.tif
 

from os import listdir
from os.path import isfile, join
UPLOAD_FOLDER = 'static/uploads'
mypath = r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer-dev-main\static\uploads"
onlyfiles = [f for f in listdir(mypath) if isfile(join(mypath, f))]



myshpfile2 = geopandas.read_file(r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer-dev-main\static\data\cb_2020_04_cousub_500k\cb_2020_04_cousub_500k.shp")































