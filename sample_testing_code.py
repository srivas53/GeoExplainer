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


    

#Establish a connecton to Mongo


from pymongo import MongoClient
import pandas as pd
import geopandas as gp
from shapely.geometry import MultiPoint
from shapely.geometry import shape
import json

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


for row in montanaData.itertuples():
    montanaData.at[row.Index, "geometry"] = shape(row.geometry)
    #row.geometry = shape(row.geometry)
    #listOfCentroids.append((row.x,row.y))
    
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
        
        
    
# sampleGeojson['x']=sampleGeojson["geometry"].centroid.x
# sampleGeojson['y']=sampleGeojson["geometry"].centroid.y

# listOfCentroids = []


# for row in sampleGeojson.itertuples():
#     listOfCentroids.append((row.x,row.y))

# finalPoints = MultiPoint(listOfCentroids)
# print(finalPoints.centroid.x)
# print(finalPoints.centroid.y)

# finalCenter = [finalPoints.centroid.x,finalPoints.centroid.y]
#sampleGeojson.to_file('user_session_polygon.geojson', driver='GeoJSON')

#sortColumn
montanaData['sortColumn'] = montanaData['x'] + montanaData['y']
montanaData = montanaData.sort_values('sortColumn',ascending = 'True')

montanaDataSubSet = montanaData.iloc[0:4000,]

montanaDataSubSet['PARCELID'] = ''
montanaDataSubSet['SHAPE_Leng'] = ''
montanaDataSubSet['roadAver'] = ''
montanaDataSubSet['cost'] = ''

for row in montanaDataSubSet.itertuples():
    montanaDataSubSet.at[row.Index, "PARCELID"] = row.properties['PARCELID']
    montanaDataSubSet.at[row.Index, "SHAPE_Leng"] = row.properties['SHAPE_Leng']
    montanaDataSubSet.at[row.Index, "roadAver"] = row.properties['roadAver']
    montanaDataSubSet.at[row.Index, "cost"] = row.properties['cost']

montanaDataSubSet['cost'] = montanaDataSubSet['cost'].astype(int)
montanaDataSubSet['roadAver'] = montanaDataSubSet['roadAver'].astype(float)
montanaDataSubSet['SHAPE_Leng'] = montanaDataSubSet['SHAPE_Leng'].astype(float)

montanaDataSubSet[['geometry',
 'PARCELID',
 'SHAPE_Leng',
 'roadAver',
 'cost']].to_file('MT_Parcel_Layer_Sample.geojson', driver='GeoJSON')

#Make this work for Mapbox


sampleGeojson = gp.read_file(r"C:\Users\vsriva11\Desktop\VADER Lab\GeoExplainer\static\data\MT_Parcel_Layer_Sample.geojson")
























