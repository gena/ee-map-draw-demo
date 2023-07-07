import { Component, ViewChild, OnInit, Output } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GoogleMap } from '@angular/google-maps';
import { AssetService } from 'src/app/services/asset.service';
import { Keys } from 'src/assets/keys';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarContainer, MatSnackBarRef } from '@angular/material/snack-bar';
import { Asset, assetColorsByType } from '../../entities/Asset'

const MAPS_LIB_URL = 'https://maps.googleapis.com/maps/api/js?key=' + Keys.GoogleMap + '&libraries=drawing,geometry'

let assetStyle = {
  strokeWeight: 1,
  fillOpacity: 0.35,
  editable: false,
  draggable: false
}

function assetToFeature(asset: Asset) {
  return {
    type: 'Feature',
    geometry: asset.geometry,
    properties: {
      id: asset.id,
      type: asset.type,
      commodity: asset.commodity
    }
  }
}

/***
 * Converts Google Maps geometry to GeoJSON geometry
 */
function toGeometry(g: any) {
  let coordinates: any = []
  g.forEachLatLng((coord: any) => {
    coordinates.push([coord.lng(), coord.lat()])
  })
  coordinates.push(coordinates[0])
  return {
    type: g.getType(),
    coordinates: [coordinates]
  }
}

function featureToAsset(feature: any): Asset {
  return {
    geometry: toGeometry(feature.getGeometry()),
    id: feature.getProperty('id'),
    type: feature.getProperty('type'),
    commodity: feature.getProperty('commodity'),
    date: feature.getProperty('date'),
    note: '',
    isEdited: false
  }
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  assets: Asset[] = [];

  fireEvents: boolean = false;

  apiLoaded: Observable<boolean>;
  m: google.maps.Map | any;
  drawingManager: google.maps.drawing.DrawingManager | any;

  selectedFeature: any = null;
  selectedFeatureGeometryOld: any = null;
  assetTypeOld: any = null;
  loading: boolean = false;

  options: google.maps.MapOptions = {
    zoom: 4,
    mapTypeId: 'hybrid',
    center: { lat: 24, lng: 12 }
    // disableDefaultUI: true
  };

  constructor(private assetService: AssetService, private http: HttpClient, private snackBar: MatSnackBar, private changeDetectorRef: ChangeDetectorRef) {
    this.apiLoaded = http.jsonp(MAPS_LIB_URL, 'callback')
      .pipe(
        map(() => {
          console.log("Map loaded!")

          return true;
        }),
        catchError(() => of(false)),
      );
  }

  years = [
    2018, 2019, 2020, 2021, 2022
  ]

  mapTypesPerYear = this.years.map(year => {
    return 'MAP_TYPE_' + year
  })

  setMapOptions() {
    var featureOptions = [
      {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "saturation": 36
          },
          {
            "color": "#000000"
          },
          {
            "lightness": 40
          }
        ]
      },
      {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "visibility": "on"
          },
          {
            "color": "#000000"
          },
          {
            "lightness": 16
          }
        ]
      },
      {
        "featureType": "all",
        "elementType": "labels.icon",
        "stylers": [
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "administrative",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 20
          }
        ]
      },
      {
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 17
          },
          {
            "weight": 1.2
          }
        ]
      },
      {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 20
          }
        ]
      },
      {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 21
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 17
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 29
          },
          {
            "weight": 0.2
          }
        ]
      },
      {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 18
          }
        ]
      },
      {
        "featureType": "road.local",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 16
          }
        ]
      },
      {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 19
          }
        ]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#000000"
          },
          {
            "lightness": 17
          }
        ]
      }
    ]

    for(const mapType of this.mapTypesPerYear) {
      var styledMapOptions = {
        name: mapType.slice(9),
        alt: "Show Sentinel-2 composite image from the last year (Google Earth Engine)",
      };

      var customMapType = new google.maps.StyledMapType(featureOptions, styledMapOptions);

      this.m.mapTypes.set(mapType, customMapType);
    }

    let options = {
      zoom: 4,
      mapTypeControlOptions: {
        mapTypeIds: [
          google.maps.MapTypeId.ROADMAP,
          google.maps.MapTypeId.TERRAIN,
          google.maps.MapTypeId.HYBRID,
          ...this.mapTypesPerYear
        ]
      },
      mapTypeId: google.maps.MapTypeId.HYBRID,
      center: { lat: 24, lng: 12 }
      // disableDefaultUI: true
    };
    this.m.setOptions(options)

    this.initializeRasterLayer()
  }

  ngOnInit(): void {
    this.assetService.DrawNewAsset.subscribe(() => {
      this.onAdd()
    })

    this.assetService.AssetEditStart.subscribe((asset) => {
      if (this.fireEvents) {
        return
      }

      console.log(`Map: asset edit start: ${asset.id}`)
      let feature = this.m.data.getFeatureById(asset.id)
      this.onEdit(feature)
    })

    this.assetService.AssetEditSubmit.subscribe((asset) => {
      this.selectedFeatureGeometryOld = undefined
      this.assetTypeOld = undefined
    })

    this.assetService.AssetEditDiscard.subscribe((asset) => {
      if (this.fireEvents) {
        return
      }

      console.log(`Map: asset edit discard: ${asset.id}`)
      this.onDiscardEdits()
    })

    this.assetService.AssetTypeChaged.subscribe((asset) => {
      if (!this.assetTypeOld) {
        this.assetTypeOld = this.selectedFeature.getProperty('type')
      }

      let assetStyle = this.getAssetStyle(asset.type as string)
      assetStyle.editable = true

      let feature = this.m.data.getFeatureById(asset.id)
      this.m.data.overrideStyle(feature, assetStyle)
    })

    this.assetService.AssetDeleted.subscribe((asset) => {
      let feature = this.m.data.getFeatureById(asset.id)
      this.m.data.remove(feature)
      this.selectedFeature = undefined
    })
  }

  @ViewChild(GoogleMap, { static: false }) set map(m: GoogleMap) {
    if (m == null) {
      return // map = null is set at the beginning
    }

    this.m = m.googleMap;

    this.initDrawingManager()


    this.setMapOptions()

    this.assetService.getAssets().subscribe((assets) => {
      this.assets = assets
      this.loadFromGeoJSON()
      this.zoomToBounds()
      this.addEventListeners()
      this.setFeaturesStyle()

      this.m.data.addListener('setgeometry', (e: any) => {
        console.log(e)
      })

      this.m.data.addListener('addfeature', (e: google.maps.Data.AddFeatureEvent) => {
        if (this.loading) {
          return
        }

        // Switch back to non-drawing mode after drawing a new feature.
        this.drawingManager.setDrawingMode(null);

        let assetStyle = this.getAssetStyle('plantation')
        this.m.data.overrideStyle(e.feature, assetStyle)

        this.drawingManager.setDrawingMode(null)

        let asset = featureToAsset(e.feature)
        asset.commodity = 'palm oil'
        asset.type = 'plantation'
        this.selectedFeature = e.feature
        this.assetService.addAsset(asset).subscribe((asset) => {
          this.assetService.AssetAdded.emit(asset)

          this.assetService.getAssets().subscribe((assets) => {
            this.assets = assets

            this.m.data.forEach((f: any) => this.m.data.remove(f))

            const polyOptions = {
              strokeWeight: 1,
              fillOpacity: 0.35,
              editable: false,
              draggable: false,
              strokeColor: '#ffffff',
              fillColor: '#ffffff'
            };

            this.drawingManager.setStyle(polyOptions)

            this.loadFromGeoJSON()
            this.setFeaturesStyle()

            polyOptions.editable = true
            this.drawingManager.setStyle(polyOptions)

            var feature = this.m.data.getFeatureById(asset.id)
            this.m.data.overrideStyle(feature, { editable: true })
            this.selectedFeature = feature;
            this.assetService.selectedFeature = feature
            this.selectedFeatureGeometryOld = feature.getGeometry()
            this.assetService.assetEditStart(asset)
          })
        })
      })
    })
  }

  loadFromGeoJSON() {
    this.loading = true
    let featureCollection = {
      type: 'FeatureCollection',
      features: this.assets.map(assetToFeature)
    }

    this.m.data.addGeoJson(featureCollection, { idPropertyName: 'id', editable: false })
    this.loading = false
  }

  getAssetStyle(assetType: string): google.maps.Data.StyleOptions {
    let color = (assetColorsByType as any)[assetType]
    let s = {
      strokeColor: color,
      fillColor: color
    }
    Object.assign(s, assetStyle)

    return s
  }

  setFeaturesStyle() {
    this.m.data.forEach((f: google.maps.Data.Feature) => {
      let assetStyle = this.getAssetStyle(f.getProperty('type') as string)

      this.m.data.overrideStyle(f, assetStyle)
    })
  }

  zoomToBounds() {
    let bounds = new google.maps.LatLngBounds();
    this.m.data.forEach((f: google.maps.Data.Feature) => {
      let g = f.getGeometry()
      g?.forEachLatLng(pt => {
        bounds.extend(pt)
      })
    });
    this.m.fitBounds(bounds)
  }

  addEventListeners() {
    this.m.data.addListener('click', (event: any) => {
      this.onDiscardEdits()
      var feature = event.feature;
      this.onEdit(feature)
    });

    this.m.addListener("click", (event: any) => {
      this.onDiscardEdits()
    })

    this.m.addListener('zoom_changed', () => {
      console.log('Map zoom: ' + this.m.getZoom());
      this.onMapZoomChanged();
    });

    this.m.addListener('maptypeid_changed', () => {
      console.log(this.m.getMapTypeId())

      this.updateLayers()
    });
  }

  initDrawingManager() {
    this.drawingManager = this.m.data

    const polyOptions = {
      strokeWeight: 1,
      fillOpacity: 0.35,
      editable: true,
      draggable: true,
      strokeColor: '#ffffff',
      fillColor: '#ffffff'
    };

    this.drawingManager.setStyle(polyOptions)

    this.drawingManager.setControls['Polygon']

    // Clear the current selection when the drawing mode is changed, or when the map is clicked.
    google.maps.event.addListener(this.drawingManager, 'drawingmode_changed', this.onDiscardEdits);
    google.maps.event.addListener(map, 'click', this.onDiscardEdits);

    this.initializeRasterLayer()
  }

  onAdd() {
    this.onDiscardEdits();
    this.drawingManager.setDrawingMode('Polygon');
  }

  onDiscardEdits() {
    if (this.selectedFeature == null) {
      return
    }
    this.m.data.overrideStyle(this.selectedFeature, { editable: false, fillOpacity: 0.25 })

    if (this.selectedFeatureGeometryOld) {
      // discard geometry edits
      this.selectedFeature.setGeometry(this.selectedFeatureGeometryOld)
    }

    if (this.assetTypeOld) {
      let assetStyle = this.getAssetStyle(this.assetTypeOld as string)
      this.m.data.overrideStyle(this.selectedFeature, assetStyle)

      this.assetTypeOld = null
    }

    this.fireEvents = true
    let asset: Asset = featureToAsset(this.selectedFeature)
    this.assetService.assetEditDiscard(asset)
    this.fireEvents = false

    this.selectedFeature = null
  }

  onEdit(feature: google.maps.Data.Feature) {
    this.m.data.overrideStyle(feature, { editable: true, fillOpacity: 0.05 })

    this.selectedFeature = feature;
    this.assetService.selectedFeature = feature
    this.selectedFeatureGeometryOld = feature.getGeometry()

    let asset: Asset = featureToAsset(feature)
    asset.isEdited = true

    this.fireEvents = true
    this.assetService.assetEditStart(asset)
    this.fireEvents = false
  }

  initializeRasterLayer() {
    for(const year of this.years) {
      this.assetService.getMapUrl(year).subscribe((response: any) => {
        console.log(response)

        const imageMapType = new google.maps.ImageMapType({
          getTileUrl: (tile, zoom) => {
            if (zoom < 9 || this.m.getMapTypeId() != `MAP_TYPE_${year}`) {
              return ''
            }

            var baseUrl = 'https://earthengine.googleapis.com/v1alpha'
            var id = response['map_id']
            var url = [baseUrl, id, 'tiles', zoom, tile.x, tile.y].join('/');

            console.log(url)

            return url
          },
          tileSize: new google.maps.Size(256, 256),
          name: `MAP_TYPE_${year}`
        });

        this.m.overlayMapTypes.push(imageMapType);
      })
      }
  }

  updateLayers() {
    // hide all
    // this.m.overlayMapTypes.forEach((overlay: any) => {
    //   overlay.setOpacity(0.00001)
    // });

    // show only the first one if needed

      for(const index in this.years) {
        console.log(index)

        let overlay = this.m.overlayMapTypes.getAt(index)

        if(this.m.getMapTypeId() === this.mapTypesPerYear[index]) {
          console.log(`Visible layer: ${this.mapTypesPerYear[index]}`)
          overlay.setOpacity(1)
        } else {
          overlay.setOpacity(0.001)
        }
      }
  }

  isZoomWarningVisible: boolean = false

  currentZoom: number | undefined = undefined

  onMapZoomChanged() {
    this.currentZoom = this.m.getZoom()

    if(this.m.getMapTypeId().startsWith('MAP_TYPE_') && this.m.getZoom() < 9) {
      this.isZoomWarningVisible = true
    } else {
      this.isZoomWarningVisible = false
    }

    this.changeDetectorRef.detectChanges()

    // function refreshLayerOpacity(map, layer) {
    //   var overlay = map.overlayMapTypes.getAt(layer.index);
    //   if (overlay === undefined) {
    //     console.log('trying to set opacity for undefined overlay', layer, overlay);
    //     return;
    //   }

    //   if (layer.mode === 'static') {
    //     if (mode === 'static') {
    //       overlay.setOpacity(layer.opacity / 100.0);
    //     } else {
    //       overlay.setOpacity(0);
    //     }
    //   }

    //   var appear = layer.opacity / 100 > 0.01 && overlay.getOpacity() < 0.01;
    //   overlay.setOpacity(layer.opacity / 100.0);

    //   // appear hack (is visible, was hidden)
    //   if (appear) {
    //     map.overlayMapTypes.removeAt(layer.index);
    //     map.overlayMapTypes.insertAt(layer.index, overlay);
    //   }
    //   }
  }
}

export { featureToAsset }
