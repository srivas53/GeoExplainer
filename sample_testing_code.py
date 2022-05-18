# -*- coding: utf-8 -*-
"""
Created on Fri Mar 11 13:20:12 2022

@author: vsriva11
"""

import geopandas as gp
from shapely.geometry import MultiPoint


myshpfile = gp.read_file(r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer\static\uploads\NHDArea.shp")


myshpfileCopy = myshpfile.copy()


#Loop through each row, record centrouid of each polygon, and the, calculate cnetroid ofall the resultant piounts, retun to the api as a response

#Create new columns x and y, which will contain x and y coords of centroid of each polygon

myshpfileCopy['x']=myshpfileCopy["geometry"].centroid.x
myshpfileCopy['y']=myshpfileCopy["geometry"].centroid.y

#create an empty list that will contain the set of centroid coordinate points

listOfCentroids = []


for row in myshpfileCopy.itertuples():
    listOfCentroids.append((row.x,row.y))

finalPoints = MultiPoint(listOfCentroids)
print(finalPoints.centroid.x)
print(finalPoints.centroid.y)

finalCenter = [finalPoints.centroid.x,finalPoints.centroid.y]
    
finalCenter  


    

#MT Parcel Layer Data: 
#Establish a connecton to Mongo


from pymongo import MongoClient
import geopandas as gp
from shapely.geometry import MultiPoint
from shapely.geometry import shape
import mapclassify
import pandas as pd
import numpy as np

def _connect_mongo(host, port, username, password, db):
    """ A util for making a connection to mongo """

    if username and password:
        mongo_uri = 'mongodb://%s:%s@%s:%s/%s' % (username, password, host, port, db)
        conn = MongoClient(mongo_uri)
    else:
        conn = MongoClient(host, port)


    return conn[db]


def read_mongo(db, collection, query={}, host='localhost', port=27017, username=None, password=None, no_id=True):
    """ Read from Mongo and Store into DataFrame """

    # Connect to MongoDB
    db = _connect_mongo(host=host, port=port, username=username, password=password, db=db)

    # Make a query to the specific DB and Collection
    cursor = db[collection].find(query)

    # Expand the cursor and construct the DataFrame
    df =  gp.GeoDataFrame(list(cursor))

    # Delete the _id
    # if no_id:
    #     del df['_id']

    return df


#db = client.eco_region
#collection = db.MTParcel_layer1and2

montanaData = read_mongo("eco_region", "MTParcel_layer1and2")


#montanaData2 = montanaData.iloc[0:4000,]

#Convert JSON type to Geometry data type

for row in montanaData.itertuples():
    montanaData.at[row.Index, "geometry"] = shape(row.geometry)
    #row.geometry = shape(row.geometry)
    #listOfCentroids.append((row.x,row.y))


###Written for testing while extrcting cnetroid information, and to sort data later on    ##############


montanaData['x'] = ''
montanaData['y'] = ''
issue_id = []

for row in montanaData.itertuples():
    try:
        montanaData.at[row.Index, "x"] = row.geometry.centroid.x
        montanaData.at[row.Index, "y"] = row.geometry.centroid.y
    except AttributeError:
        issue_id.append(row._id)
        continue
        
        


#sortColumn
montanaData['sortColumn'] = montanaData['x'] + montanaData['y']
montanaData = montanaData.sort_values('sortColumn',ascending = 'True')

montanaDataSubSet = montanaData.iloc[0:4000,]

montanaDataSubSet['PARCELID'] = None
montanaDataSubSet['SHAPE_Leng'] = None
montanaDataSubSet['roadAver'] = None
montanaDataSubSet['cost'] = None
montanaDataSubSet['area'] = None
#montanaDataSubSet['center'] = None
montanaDataSubSet['averagebird'] = None
montanaDataSubSet['averagefish'] = None
montanaDataSubSet['averagereptile'] = None
montanaDataSubSet['averagetree'] = None
montanaDataSubSet['averageamphibian'] = None
montanaDataSubSet['costAver'] = None
montanaDataSubSet['layer1paDist'] = None
montanaDataSubSet['layer2paDist'] = None
montanaDataSubSet['paAver'] = None
montanaDataSubSet['averHyDist'] = None
montanaDataSubSet['averagemammal'] = None

issue_id_2 = []
montanaDataSubSet = montanaDataSubSet.reset_index(drop = True)

for row in montanaDataSubSet.itertuples():
    try:
        montanaDataSubSet.at[row.Index, "PARCELID"] = row.properties['PARCELID']
        montanaDataSubSet.at[row.Index, "SHAPE_Leng"] = row.properties['SHAPE_Leng']
        montanaDataSubSet.at[row.Index, "roadAver"] = row.properties['roadAver']
        montanaDataSubSet.at[row.Index, "cost"] = row.properties['cost']
        montanaDataSubSet.at[row.Index, "area"] = row.properties['area']
        #montanaDataSubSet.at[row.Index, "center"] = row.properties['center']
        montanaDataSubSet.at[row.Index, "averagebird"] = row.properties['averagebird']
        montanaDataSubSet.at[row.Index, "averagefish"] = row.properties['averagefish'] 
        montanaDataSubSet.at[row.Index, "averagereptile"] = row.properties['averagereptile']
        montanaDataSubSet.at[row.Index, "averagetree"] = row.properties['averagetree']
        montanaDataSubSet.at[row.Index, "averageamphibian"] = row.properties['averageamphibian']
        montanaDataSubSet.at[row.Index, "costAver"] = row.properties['costAver']      
        montanaDataSubSet.at[row.Index, "layer1paDist"] = row.properties['layer1paDist']
        montanaDataSubSet.at[row.Index, "layer2paDist"] = row.properties['layer2paDist']
        montanaDataSubSet.at[row.Index, "paAver"] = row.properties['paAver']          
        montanaDataSubSet.at[row.Index, "averHyDist"] = row.properties['averHyDist'] 
        montanaDataSubSet.at[row.Index, "averagemammal"] = row.properties['averagemammal'] 
    except KeyError:
        issue_id_2.append(row.Index)
        continue        
        


#montanaDataSubSet = montanaDataSubSet.fillna(method='ffill',axis = 1)
montanaDataSubSet['cost'] = montanaDataSubSet['cost'].astype(int)
montanaDataSubSet['roadAver'] = montanaDataSubSet['roadAver'].astype(float)
montanaDataSubSet['SHAPE_Leng'] = montanaDataSubSet['SHAPE_Leng'].astype(float)
montanaDataSubSet['area'] = montanaDataSubSet['area'].astype(float)
montanaDataSubSet["averagebird"] = montanaDataSubSet['averagebird'].astype(float)
montanaDataSubSet["averagefish"] = montanaDataSubSet['averagefish'].astype(float)
montanaDataSubSet["averagereptile"] = montanaDataSubSet['averagereptile'].astype(float)
montanaDataSubSet["averagetree"] = montanaDataSubSet['averagetree'].astype(float)
montanaDataSubSet["averageamphibian"] = montanaDataSubSet['averageamphibian'].astype(float)
montanaDataSubSet["costAver"] = montanaDataSubSet['costAver'].astype(float)
montanaDataSubSet["layer1paDist"] = montanaDataSubSet['layer1paDist'].astype(float)
montanaDataSubSet["layer2paDist"] = montanaDataSubSet['layer2paDist'].astype(float)
montanaDataSubSet["paAver"] = montanaDataSubSet['paAver'].astype(float)    
montanaDataSubSet["averHyDist"] = montanaDataSubSet['averHyDist'].astype(float)  
montanaDataSubSet["averagemammal"] = montanaDataSubSet['averagemammal'].astype(float)  
 

#montanaDataSubSet['averagefish'] = montanaDataSubSet['averagefish'].interpolate()


montanaDataSubSet[['geometry',
 'PARCELID',
 'SHAPE_Leng',
 'roadAver',
 'cost', 'area',
 'averagebird',
 'averagefish',
 'averagereptile',
 'averagetree',
 'averageamphibian',
 'costAver',
 'layer1paDist',
 'layer2paDist',
 'paAver',
 'averHyDist','averagemammal']].to_file('MT_Parcel_Layer_Sample.geojson', driver='GeoJSON')

#Make this work for Mapbox


sampleGeojson = gp.read_file(r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer\static\data\MT_Parcel_Layer_Sample.geojson")


#Classes for "Cost" layer choropleth map

fj5 = mapclassify.FisherJenks(sampleGeojson['cost'], k=3)
sampleGeojson["averagetree"] = sampleGeojson["averagetree"].replace(np.nan, -1000)
fj3 = mapclassify.FisherJenks(sampleGeojson['averagetree'], k=5)










#averagemammal








