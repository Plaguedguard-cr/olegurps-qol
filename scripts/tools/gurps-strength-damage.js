// Printed B16 rows stay authoritative. Unlisted 41-99 values follow GCS BasicSet progression,
// the producer of GGA's imported damage (GCS v5.30.0/model/gurps/enums/progression/option.go).
// This is a compatibility extension of the sparse table, not a newly published B16 row.
export const BASIC_ST_DAMAGE = Object.freeze({
  "1": [
    "1d-6",
    "1d-5"
  ],
  "2": [
    "1d-6",
    "1d-5"
  ],
  "3": [
    "1d-5",
    "1d-4"
  ],
  "4": [
    "1d-5",
    "1d-4"
  ],
  "5": [
    "1d-4",
    "1d-3"
  ],
  "6": [
    "1d-4",
    "1d-3"
  ],
  "7": [
    "1d-3",
    "1d-2"
  ],
  "8": [
    "1d-3",
    "1d-2"
  ],
  "9": [
    "1d-2",
    "1d-1"
  ],
  "10": [
    "1d-2",
    "1d"
  ],
  "11": [
    "1d-1",
    "1d+1"
  ],
  "12": [
    "1d-1",
    "1d+2"
  ],
  "13": [
    "1d",
    "2d-1"
  ],
  "14": [
    "1d",
    "2d"
  ],
  "15": [
    "1d+1",
    "2d+1"
  ],
  "16": [
    "1d+1",
    "2d+2"
  ],
  "17": [
    "1d+2",
    "3d-1"
  ],
  "18": [
    "1d+2",
    "3d"
  ],
  "19": [
    "2d-1",
    "3d+1"
  ],
  "20": [
    "2d-1",
    "3d+2"
  ],
  "21": [
    "2d",
    "4d-1"
  ],
  "22": [
    "2d",
    "4d"
  ],
  "23": [
    "2d+1",
    "4d+1"
  ],
  "24": [
    "2d+1",
    "4d+2"
  ],
  "25": [
    "2d+2",
    "5d-1"
  ],
  "26": [
    "2d+2",
    "5d"
  ],
  "27": [
    "3d-1",
    "5d+1"
  ],
  "28": [
    "3d-1",
    "5d+1"
  ],
  "29": [
    "3d",
    "5d+2"
  ],
  "30": [
    "3d",
    "5d+2"
  ],
  "31": [
    "3d+1",
    "6d-1"
  ],
  "32": [
    "3d+1",
    "6d-1"
  ],
  "33": [
    "3d+2",
    "6d"
  ],
  "34": [
    "3d+2",
    "6d"
  ],
  "35": [
    "4d-1",
    "6d+1"
  ],
  "36": [
    "4d-1",
    "6d+1"
  ],
  "37": [
    "4d",
    "6d+2"
  ],
  "38": [
    "4d",
    "6d+2"
  ],
  "39": [
    "4d+1",
    "7d-1"
  ],
  "40": [
    "4d+1",
    "7d-1"
  ],
  "45": [
    "5d",
    "7d+1"
  ],
  "50": [
    "5d+2",
    "8d-1"
  ],
  "55": [
    "6d",
    "8d+1"
  ],
  "60": [
    "7d-1",
    "9d"
  ],
  "65": [
    "7d+1",
    "9d+2"
  ],
  "70": [
    "8d",
    "10d"
  ],
  "75": [
    "8d+2",
    "10d+2"
  ],
  "80": [
    "9d",
    "11d"
  ],
  "85": [
    "9d+2",
    "11d+2"
  ],
  "90": [
    "10d",
    "12d"
  ],
  "95": [
    "10d+2",
    "12d+2"
  ],
  "100": [
    "11d",
    "13d"
  ]
});
export function basicStrengthDamage(st, mode) {
  if(!Number.isSafeInteger(st)||st<1||!['swing','thrust'].includes(mode))return null;
  if(st<=100){
    const printed=BASIC_ST_DAMAGE[st]?.[mode==='thrust'?0:1];
    if(printed)return printed;
    let value;
    if(mode==='thrust'){
      value=st-11;
      if(st>50)value-=1+(st>79?1+Math.floor((st-80)/5):0);
    }else value=st-Math.floor((st-40)/5)+(st>59?1:0)+9;
    const dice=Math.floor(value/8)+1,adds=Math.floor(value%8/2)-1;
    return dice+'d'+(adds?(adds>0?'+':'')+adds:'');
  }
  return String((mode==='thrust'?11:13)+Math.floor((st-100)/10))+'d';
}
