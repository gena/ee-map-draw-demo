import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Asset } from '../entities/Asset';
import { featureToAsset } from '../components/map/map.component'

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
}

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  // private apiUrl = 'http://localhost:8085'
  // private apiUrl = 'https://backend-dot-dgena-demo1.uc.r.appspot.com'
  private apiUrl = 'https://ee-map-draw-demo-backend-kqwfv5ushq-uc.a.run.app'
  // private apiUrl = 'http://127.0.0.1:8085'

  AssetEditStart = new EventEmitter<Asset>()
  AssetEditDiscard = new EventEmitter<Asset>()
  AssetEditSubmit = new EventEmitter<Asset>()
  AssetTypeChaged = new EventEmitter<Asset>()
  AssetAdded = new EventEmitter<Asset>()
  AssetDeleted = new EventEmitter<Asset>()
  DrawNewAsset = new EventEmitter()

  // HACK: Google Maps has no on edited event?
  selectedFeature: any = null

  constructor(private http: HttpClient) { }

  assetEditStart(asset: Asset) {
    this.AssetEditStart.emit(asset)
  }

  assetEditDiscard(asset: Asset) {
    this.AssetEditDiscard.emit(asset)
  }

  assetTypeChanged(asset: Asset) {
    this.AssetTypeChaged.emit(asset)
  }
  getMapUrl(year: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/map/${year}`)
  }

  getAssets(): Observable<Asset[]> {
    return this.http.get<Asset[]>(`${this.apiUrl}/assets`)
  }

  addAsset(asset: Asset): Observable<Asset> {
    return this.http.post<Asset>(`${this.apiUrl}/assets/create`, asset, httpOptions)
  }

  deleteAsset(asset: Asset): Observable<Asset> {
    return this.http.delete<Asset>(`${this.apiUrl}/assets/delete/${asset.id}`)
  }

  updateAsset(asset: Asset): Observable<Asset> {
    this.AssetEditSubmit.emit(asset)

    let assetNew = featureToAsset(this.selectedFeature)
    asset.geometry = assetNew.geometry

    const url = `${this.apiUrl}/assets/update/${asset.id}`
    return this.http.put<Asset>(url, asset, httpOptions)
  }
}
