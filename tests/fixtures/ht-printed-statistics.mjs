// Independent expectations transcribed from HT tables and named variants.
export const printedAccuracyZero = {
  'W6bfzGQAngvdHu-iw':'HT91', WHDjicfM33QKdP30o:'HT91', W7i4ZauQl8q2o5nTt:'HT91',
  WlalvGJfGaAfR_YFJ:'HT98', WHmfXni9O7QkIO36y:'HT97,101', WW1fVT2VBDy4d6fe6:'HT88',
  'W-XOyXGVN7aug_D_r':'HT98,101', 'WBpX1soaGNjp-7TDQ':'HT101', WzR7GE1ZY6PB7velA:'HT148',
  WbiMQvLGw4VhGQmTc:'HT148', WUUPnRzYsh54XEY7W:'HT101', WhyC2rpq5gO7kJvPq:'HT147,148',
  WhGAE0Z1tyyGl34FX:'HT101', Wd25u9Begix9h_smN:'HT89,90', WCkWdl3YZOTZX7SwG:'HT91',
  WMj5eviUtsrGfgUyQ:'HT91', WTxOUBfDLkJZPyxQ6:'HT94', WsRdm1ykv3AFJUMGr:'HT89,90',
  WhZTKRbxWw3dUNLFi:'HT89', W5gRSZbBIrYN9XoUY:'HT89,90', WBUF21Cjj4FcgwAM2:'HT89',
  Wr_7MnorYDlPSb2qW:'HT91', WL0SlLUJxX2V_3KVh:'HT98', 'WaIDKb3cN40p-9pJu':'HT98'
};
export function expectedPrintedFields(id) {
  return {accuracy:'0', ...(id==='WhyC2rpq5gO7kJvPq'?{recoil:'1'}:{}),
    ...(['WL0SlLUJxX2V_3KVh','WaIDKb3cN40p-9pJu'].includes(id)?{bulk:'0'}:{})};
}
