# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import sys
from copy import copy
import flask
from flask import request
from flask_cors import cross_origin, CORS
from google.auth import compute_engine
import shapely
from shapely import wkt
from shapely.geometry import shape
from google.cloud import firestore
import ee

if __name__ == "__main__":
    ee.Initialize()
else:
    credentials = compute_engine.Credentials(scopes=['https://www.googleapis.com/auth/earthengine'])
    ee.Initialize(credentials)

app = flask.Flask(__name__)

CORS(app)

db = firestore.Client()

@app.route('/map/<year>', methods=['GET'])
def get_map(year):
    """
    Returns maps processed by Google Earth Engine
    """

    year = int(year)
    print(year)

    start_time = ee.Date.fromYMD(year, 1, 1)
    end_time = ee.Date.fromYMD(year, 12, 30)

    image = (ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
        .filterDate(start_time, end_time)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
        .map(lambda i: i.resample('bilinear'))
        .select(['B4', 'B3', 'B2'])
        .reduce(ee.Reducer.percentile([20]))
        .visualize(**{ 'min': 600, 'max': [4000, 4000, 6000], 'gamma': 2 })
    )
    
    map_id = image.getMapId()['mapid']
    results = {'map_id': map_id}

    return flask.jsonify(results)

@app.route("/assets/create", methods=['POST', 'GET'])
def asset_create():
    asset_ref = db.collection(u'assets').document()
    
    json = request.get_json()

    # add new asset
    asset = copy(json)
    geom = shape(json['geometry'])
    asset['geometry'] = geom.wkt
    asset['timestamp'] = firestore.SERVER_TIMESTAMP
    asset_ref.set(asset)

    # return added asset
    json['id'] = asset_ref.id

    print(json)

    return flask.jsonify(json)

@app.route("/assets", methods=['GET'])
def asset_read():

    assets = db.collection(u'assets').order_by("timestamp").stream()

    assets_json = []
    for asset in assets:
        json = asset.to_dict()
        json['id'] = asset.id
        json['geometry'] = shapely.wkt.loads(json['geometry']).__geo_interface__
        assets_json.append(json)

    return flask.jsonify(assets_json)

@app.route("/assets/update/<string:id>", methods=['PUT'])
def asset_update(id):
    json = request.get_json()

    asset_ref = db.collection(u'assets').document(id)

    # add new asset
    asset = copy(json)
    geom = shape(json['geometry'])
    asset['geometry'] = geom.wkt
    asset_ref.update(asset)

    return flask.jsonify(json), 200

@app.route("/assets/delete/<string:id>", methods=['DELETE'])
def asset_delete(id):
    asset_ref = db.collection(u'assets').document(id)
    asset = asset_ref.get()
    if asset.exists:
        asset_ref.delete()
    else:
        print(f'No asset with id: {id}')

    return '', 200

@app.route("/assets/clear", methods=['GET'])
def assets_clear():
    assets = db.collection(u'assets').list_documents()

    for asset in assets:
        asset.delete()

    return "ALL ASSETS DELETED"

if __name__ == "__main__":
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    app.run(host="127.0.0.1", port=8085, debug=True)
