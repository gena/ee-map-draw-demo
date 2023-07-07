export interface Asset {
  id: number;
  type: string;
  commodity: string;
  note: string;
  date: string;
  isEdited: boolean;
  geometry?: any
}

export let assetColorsByType = {
'plantation': '#00ff00',
'cattle': '#ffff00',
'crops': '#00a0ff'
}
