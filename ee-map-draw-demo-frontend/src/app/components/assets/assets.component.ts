import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { FormControl } from '@angular/forms';
import { Asset, assetColorsByType } from '../../entities/Asset'
import { AssetService } from 'src/app/services/asset.service';
import { faCheck, faTimes, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss']
})
export class AssetsComponent implements OnInit {
  assets: Asset[] = [];
  fireEvents: boolean = false;
  assetColorsByType: any = assetColorsByType;

  displayedColumns: string[] = ['type', 'commodity', 'date', 'isEdited'];
  faTimes = faTimes;
  faTrash = faTrash;
  faPenToSquare = faPenToSquare;
  faCheck = faCheck;

  editedAsset?: Asset;
  assetType: string = 'plantation';
  assetCommodity: string = 'cotton';
  assetDate: string = '';

  assetTypes: string[] = ['plantation', 'cattle', 'crops'];
  commodityTypes: string[] = ['cows', 'cotton', 'palm oil', 'fruit trees', 'cocoa'];

  formDate = new FormControl(new Date())

  @ViewChild('btn', {read: ElementRef}) btn?: ElementRef

  constructor(private assetService: AssetService) {
  }

  addEvent(type: string, event: MatDatepickerInputEvent<Date>) {
    let date = event.value as Date

    // Get year, month, and day part from the date
    var year = date.toLocaleString("default", { year: "numeric" });
    var month = date.toLocaleString("default", { month: "2-digit" });
    var day = date.toLocaleString("default", { day: "2-digit" });

    // Generate yyyy-mm-dd date string
    var formattedDate = `${year}-${month}-${day}`;

    this.assetDate = formattedDate
  }

  ngOnInit(): void {
    this.assetService.getAssets().subscribe((assets) => {
      this.assets = assets
    })

    this.assetService.AssetAdded.subscribe((asset) => {
      asset.type = 'plantation'
      asset.commodity = 'palm oil'
      this.editedAsset = asset
      this.assets.push(asset)
      this.assets = [...this.assets]
      this.fireToggleCurrent()
    })

    this.assetService.AssetEditStart.subscribe((asset) => {
      if(this.fireEvents) {
        return
      }

      this.assets.forEach(a => {
        if(a.id == asset.id) {
          this.editedAsset = a
          this.assetCommodity = a.commodity
          this.assetDate = a.date
          this.assetType = a.type
        }
      })

      this.fireToggleCurrent()
    })

    this.assetService.AssetEditDiscard.subscribe((asset) => {
      if(this.fireEvents) {
        return
      }

      this.assets.forEach(a => {
        if(a.id == asset.id) {
          this.editedAsset = a
          this.assetCommodity = a.commodity
          this.assetDate = a.date
          this.assetType = a.type
        }
      })

      this.fireToggleCurrent()
    })
  }


  onEdit(asset: Asset) {
    if(this.editedAsset) {
      this.onDiscardEdits(this.editedAsset)
    }

    if(!this.fireEvents) {
      this.fireEvents = true
      this.assetService.assetEditStart(asset)
      this.fireEvents = false
    }

    asset.isEdited = true

    this.editedAsset = asset

    this.assetType = asset.type;
    this.assetCommodity = asset.commodity;
    this.assetDate = asset.date;
    this.formDate = new FormControl(new Date(Date.parse(asset.date))) as FormControl
  }

  onSubmitEdits(asset: Asset) {
    asset.type = this.assetType
    asset.commodity = this.assetCommodity;
    asset.date = this.assetDate
    asset.isEdited = false

    this.fireEvents = true
    this.assetService.updateAsset(asset).subscribe(() => {
      this.onDiscardEdits(asset)
    })
    this.fireEvents = false
  }

  onDiscardEdits(asset: Asset) {
    asset.isEdited = false
    this.editedAsset = undefined

    if(!this.fireEvents) {
      this.fireEvents = true
      this.assetService.assetEditDiscard(asset)
      this.fireEvents = false
    }
  }

  onDelete(asset: Asset) {
    this.assetService.AssetDeleted.emit(asset)
    this.assetService.deleteAsset(asset).subscribe()

    this.assets = this.assets.filter((a) => a.id !== asset.id)
    this.editedAsset = undefined
  }

  onAssetTypeChanged(asset: Asset) {
    let assetNew: Asset = {
      id: asset.id,
      type: this.assetType,
      commodity: asset.commodity,
      date: asset.date,
      geometry: asset.geometry,
      note: '',
      isEdited: true
    }

    this.assetService.assetTypeChanged(assetNew)
  }

  fireToggleCurrent() {
    this.btn?.nativeElement.click()
  }

  toggleCurrent() {
    this.editedAsset!.isEdited = !this.editedAsset?.isEdited
  }
 }
