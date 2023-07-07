import { Component } from '@angular/core';
import { AssetService } from './services/asset.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';

  constructor(private assetService: AssetService) {
  }

  addNewAsset() {
    this.assetService.DrawNewAsset.emit()
  }
}
