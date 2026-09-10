export const BODYPLAN_DEFINITIONS = Object.freeze({
  humanoid: {
    id: "humanoid",
    image: "modules/olegurps-qol/assets/humanoid-zone.png",
    zones: [
      { id: "silhouette", label: "Силуэт / случайная зона", modifierLabel: "Random Location", penalty: 0, color: "#8A8A8A", random: true },
      { id: "torso", label: "Торс", modifierLabel: "Torso", ggaKeys: ["Torso"], fallbackPenalty: 0, color: "#584F39" },
      { id: "arm", label: "Рука", modifierLabel: "Arm", ggaKeys: ["Right Arm", "Left Arm", "Arm"], fallbackPenalty: -2, color: "#3F6088" },
      { id: "leg", label: "Нога", modifierLabel: "Leg", ggaKeys: ["Right Leg", "Left Leg", "Leg"], fallbackPenalty: -2, color: "#587252" },
      { id: "groin", label: "Пах", modifierLabel: "Groin", ggaKeys: ["Groin"], fallbackPenalty: -3, color: "#795A60" },
      { id: "vitals", label: "Жизненно важные органы", modifierLabel: "Vitals", ggaKeys: ["Vitals"], fallbackPenalty: -3, color: "#944246", precisionOnly: true },
      { id: "hand", label: "Кисть", modifierLabel: "Hand", ggaKeys: ["Hand"], fallbackPenalty: -4, color: "#584A73" },
      { id: "foot", label: "Ступня", modifierLabel: "Foot", ggaKeys: ["Foot"], fallbackPenalty: -4, color: "#624E3E" },
      { id: "face", label: "Лицо", modifierLabel: "Face", ggaKeys: ["Face"], fallbackPenalty: -5, color: "#849AA7" },
      { id: "neck", label: "Шея", modifierLabel: "Neck", ggaKeys: ["Neck"], fallbackPenalty: -5, color: "#806A44" },
      { id: "skull", label: "Череп", modifierLabel: "Skull", ggaKeys: ["Skull"], fallbackPenalty: -7, color: "#727276" },
      { id: "eye", label: "Глаз", modifierLabel: "Eye", ggaKeys: ["Eye", "Eyes"], fallbackPenalty: -9, color: "#CB252F", precisionOnly: true }
    ],
    regions: [
      {
        id: "skull", zoneId: "skull",
        geometry: [
          { type: "polygon", points: [
            [0.4293, 0.0377], [0.4272, 0.0431], [0.4272, 0.0472], [0.4346, 0.0556], [0.4378, 0.0628], [0.4421, 0.0628],
            [0.4474, 0.061], [0.4644, 0.0586], [0.4825, 0.0598], [0.4878, 0.061], [0.5037, 0.061], [0.5271, 0.0586],
            [0.5282, 0.0592], [0.5345, 0.0592], [0.5494, 0.0628], [0.5547, 0.0628], [0.5558, 0.0574], [0.5622, 0.0484],
            [0.5611, 0.0389], [0.5526, 0.0299], [0.5409, 0.0233], [0.5345, 0.0209], [0.5186, 0.0173], [0.508, 0.0161],
            [0.4803, 0.0161], [0.4697, 0.0173], [0.457, 0.0203], [0.4474, 0.0239], [0.4389, 0.0287]
          ] }
        ]
      },
      {
        id: "face", zoneId: "face",
        geometry: [
          { type: "polygon", points: [
            [0.4304, 0.0891], [0.4304, 0.0921], [0.4346, 0.0999], [0.4368, 0.1089], [0.4421, 0.1172], [0.4485, 0.1226],
            [0.4612, 0.1298], [0.4729, 0.1346], [0.4803, 0.1364], [0.5133, 0.1358], [0.5175, 0.1352], [0.5292, 0.1304],
            [0.5441, 0.122], [0.5515, 0.1142], [0.5558, 0.1047], [0.5558, 0.1017], [0.5611, 0.0921], [0.5611, 0.0891],
            [0.5569, 0.0891], [0.5484, 0.0921], [0.543, 0.0921], [0.526, 0.0885], [0.5154, 0.0855], [0.509, 0.0819],
            [0.5048, 0.0778], [0.4857, 0.0778], [0.4835, 0.0807], [0.4761, 0.0849], [0.4485, 0.0921], [0.4431, 0.0921],
            [0.4378, 0.0909], [0.4346, 0.0891]
          ] }
        ]
      },
      {
        id: "eyes", zoneId: "eye",
        geometry: [
          { type: "polygon", points: [
            [0.4421, 0.0724], [0.4421, 0.0789], [0.4474, 0.0819], [0.4495, 0.0819], [0.4506, 0.0825], [0.4527, 0.0825],
            [0.4538, 0.0831], [0.4676, 0.0831], [0.4687, 0.0825], [0.4718, 0.0825], [0.4729, 0.0819], [0.474, 0.0819],
            [0.475, 0.0813], [0.4761, 0.0813], [0.4793, 0.0795], [0.4793, 0.0789], [0.4803, 0.0783], [0.4803, 0.0724],
            [0.4761, 0.07], [0.475, 0.07], [0.474, 0.0694], [0.4718, 0.0694], [0.4708, 0.0688], [0.4527, 0.0688],
            [0.4516, 0.0694], [0.4485, 0.0694], [0.4474, 0.07], [0.4463, 0.07], [0.4453, 0.0706], [0.4442, 0.0706],
            [0.4442, 0.0712]
          ] },
        { type: "polygon", points: [
            [0.5112, 0.073], [0.5112, 0.0783], [0.5122, 0.0789], [0.5122, 0.0795], [0.5165, 0.0819], [0.5175, 0.0819],
            [0.5186, 0.0825], [0.5207, 0.0825], [0.5218, 0.0831], [0.5409, 0.0831], [0.542, 0.0825], [0.5441, 0.0825],
            [0.5462, 0.0813], [0.5473, 0.0813], [0.5484, 0.0807], [0.5484, 0.0801], [0.5494, 0.0795], [0.5494, 0.0789],
            [0.5505, 0.0783], [0.5505, 0.0748], [0.5494, 0.0742], [0.5494, 0.073], [0.5484, 0.0724], [0.5484, 0.0718],
            [0.5462, 0.0706], [0.5452, 0.0706], [0.5441, 0.07], [0.542, 0.07], [0.5409, 0.0694], [0.5377, 0.0694],
            [0.5367, 0.0688], [0.5239, 0.0688], [0.5228, 0.0694], [0.5197, 0.0694], [0.5186, 0.07], [0.5165, 0.07],
            [0.5154, 0.0706], [0.5143, 0.0706], [0.5122, 0.0718], [0.5122, 0.0724]
          ] }
        ]
      },
      {
        id: "upper-torso", zoneId: "torso", label: "Грудь", modifierLabel: "Torso", selectWholeZone: true,
        geometry: [
          { type: "path", fillRule: "evenodd", rings: [
            [
              [0.4463, 0.1328], [0.4453, 0.1525], [0.4368, 0.1651], [0.4208, 0.1728], [0.3666, 0.1878], [0.3656, 0.2051],
              [0.3443, 0.2374], [0.3422, 0.25], [0.3688, 0.2877], [0.3815, 0.2943], [0.4028, 0.2949], [0.4017, 0.2913],
              [0.3719, 0.2799], [0.3677, 0.2542], [0.3783, 0.2309], [0.4049, 0.2087], [0.4283, 0.2028], [0.5037, 0.2057],
              [0.5579, 0.2022], [0.5887, 0.2093], [0.6036, 0.2189], [0.6164, 0.2344], [0.6238, 0.2518], [0.6174, 0.2811],
              [0.5866, 0.2919], [0.5898, 0.2949], [0.6142, 0.2931], [0.627, 0.2823], [0.6493, 0.2494], [0.6472, 0.2374],
              [0.6249, 0.2022], [0.6238, 0.1866], [0.5728, 0.1734], [0.5547, 0.1651], [0.5462, 0.1531], [0.5441, 0.1334],
              [0.5197, 0.1417], [0.491, 0.1441], [0.4729, 0.1417]
            ],
            [
              [0.4463, 0.1328], [0.4453, 0.1525], [0.4368, 0.1651], [0.4208, 0.1728], [0.431, 0.1765], [0.443, 0.1802],
              [0.456, 0.1843], [0.47, 0.188], [0.482, 0.1905], [0.4955, 0.192], [0.509, 0.1905], [0.522, 0.188],
              [0.536, 0.1843], [0.549, 0.1802], [0.561, 0.1765], [0.5728, 0.1734], [0.5547, 0.1651], [0.5462, 0.1531],
              [0.5441, 0.1334], [0.5197, 0.1417], [0.491, 0.1441], [0.4729, 0.1417]
            ],
            [
              [0.3826, 0.2261], [0.3709, 0.247], [0.3688, 0.2644], [0.3719, 0.2739], [0.3773, 0.2799], [0.39, 0.2883],
              [0.4081, 0.2925], [0.4261, 0.2925], [0.4782, 0.2877], [0.5143, 0.2877], [0.5664, 0.2925], [0.5824, 0.2925],
              [0.6026, 0.2883], [0.6174, 0.2769], [0.6227, 0.2638], [0.6227, 0.2536], [0.6196, 0.2422], [0.6121, 0.2291],
              [0.5983, 0.2147], [0.5877, 0.2087], [0.5739, 0.2045], [0.5441, 0.2033], [0.5101, 0.2063], [0.4825, 0.2063],
              [0.4474, 0.2033], [0.4219, 0.2039], [0.4017, 0.2099], [0.3932, 0.2153]
            ]
          ] }
        ]
      },
      {
        id: "neck", zoneId: "neck", baseOutline: true,
        geometry: [
          { type: "polygon", points: [
            [0.4463, 0.1328], [0.4453, 0.1525], [0.4368, 0.1651], [0.4208, 0.1728], [0.431, 0.1765], [0.443, 0.1802],
            [0.456, 0.1843], [0.47, 0.188], [0.482, 0.1905], [0.4955, 0.192], [0.509, 0.1905], [0.522, 0.188],
            [0.536, 0.1843], [0.549, 0.1802], [0.561, 0.1765], [0.5728, 0.1734], [0.5547, 0.1651], [0.5462, 0.1531],
            [0.5441, 0.1334], [0.5197, 0.1417], [0.491, 0.1441], [0.4729, 0.1417]
          ] }
        ]
      },
      {
        id: "vitals", zoneId: "vitals",
        geometry: [
          { type: "polygon", points: [
            [0.3826, 0.2261], [0.3709, 0.247], [0.3688, 0.2644], [0.3719, 0.2739], [0.3773, 0.2799], [0.39, 0.2883],
            [0.4081, 0.2925], [0.4261, 0.2925], [0.4782, 0.2877], [0.5143, 0.2877], [0.5664, 0.2925], [0.5824, 0.2925],
            [0.6026, 0.2883], [0.6174, 0.2769], [0.6227, 0.2638], [0.6227, 0.2536], [0.6196, 0.2422], [0.6121, 0.2291],
            [0.5983, 0.2147], [0.5877, 0.2087], [0.5739, 0.2045], [0.5441, 0.2033], [0.5101, 0.2063], [0.4825, 0.2063],
            [0.4474, 0.2033], [0.4219, 0.2039], [0.4017, 0.2099], [0.3932, 0.2153]
          ] }
        ]
      },
      {
        id: "torso", zoneId: "torso", selectWholeZone: true,
        geometry: [
          { type: "polygon", points: [
            [0.3804, 0.3062], [0.3698, 0.317], [0.3698, 0.326], [0.3804, 0.3547], [0.3794, 0.3672], [0.3719, 0.3882],
            [0.3719, 0.4001], [0.3921, 0.4163], [0.407, 0.4342], [0.4261, 0.442], [0.458, 0.445], [0.5335, 0.445],
            [0.5579, 0.4432], [0.576, 0.439], [0.5887, 0.4306], [0.5994, 0.4163], [0.6164, 0.4037], [0.6196, 0.3977],
            [0.61, 0.3624], [0.6111, 0.3493], [0.6217, 0.3218], [0.6164, 0.3092], [0.6047, 0.3044], [0.5058, 0.2949],
            [0.4687, 0.2961]
          ] }
        ]
      },
      {
        id: "groin", zoneId: "groin",
        geometry: [
          { type: "polygon", points: [
            [0.4315, 0.4504], [0.4315, 0.4533], [0.4431, 0.4683], [0.458, 0.4934], [0.4697, 0.506], [0.4803, 0.5114],
            [0.4899, 0.5132], [0.5005, 0.5132], [0.508, 0.512], [0.5154, 0.5096], [0.5239, 0.5042], [0.5324, 0.494],
            [0.5462, 0.4707], [0.56, 0.4528], [0.56, 0.4504], [0.5239, 0.4522], [0.5228, 0.4528], [0.4676, 0.4528]
          ] }
        ]
      },
      {
        id: "right-arm", zoneId: "arm", side: "right", label: "Правая рука", modifierLabel: "Right Arm",
        geometry: [
          { type: "polygon", points: [
            [0.3433, 0.1848], [0.3199, 0.1854], [0.2954, 0.192], [0.2752, 0.2051], [0.2604, 0.2249], [0.2572, 0.235],
            [0.2604, 0.2656], [0.2402, 0.2925], [0.2317, 0.3301], [0.1945, 0.3666], [0.1807, 0.4049], [0.1573, 0.4402],
            [0.1583, 0.4438], [0.1955, 0.4539], [0.2009, 0.4533], [0.2731, 0.3876], [0.2837, 0.3684], [0.2901, 0.3445],
            [0.3262, 0.3014], [0.3348, 0.2793], [0.3273, 0.244], [0.3528, 0.201], [0.3528, 0.1902]
          ] }
        ]
      },
      {
        id: "left-arm", zoneId: "arm", side: "left", label: "Левая рука", modifierLabel: "Left Arm",
        geometry: [
          { type: "polygon", points: [
            [0.6482, 0.1848], [0.6397, 0.1884], [0.6387, 0.201], [0.6652, 0.2446], [0.6567, 0.2667], [0.6567, 0.2811],
            [0.6642, 0.3002], [0.7024, 0.3451], [0.7088, 0.3708], [0.7237, 0.3935], [0.7906, 0.4528], [0.796, 0.4533],
            [0.8342, 0.4438], [0.8342, 0.4402], [0.8119, 0.4079], [0.7949, 0.3636], [0.7588, 0.3289], [0.7535, 0.2984],
            [0.7311, 0.2656], [0.7343, 0.2362], [0.7301, 0.2225], [0.7163, 0.2045], [0.6971, 0.1926], [0.6706, 0.1854]
          ] }
        ]
      },
      {
        id: "right-hand", zoneId: "hand", side: "right", label: "Правая кисть", modifierLabel: "Hand",
        geometry: [
          { type: "polygon", points: [
            [0.153, 0.451], [0.1467, 0.4516], [0.136, 0.4581], [0.1031, 0.4701], [0.085, 0.4827], [0.0627, 0.4928],
            [0.0638, 0.4964], [0.0755, 0.497], [0.1063, 0.4868], [0.1126, 0.4886], [0.084, 0.5389], [0.084, 0.5443],
            [0.0925, 0.5449], [0.1116, 0.5138], [0.1158, 0.5114], [0.1222, 0.5138], [0.1063, 0.5484], [0.1084, 0.5568],
            [0.1137, 0.5568], [0.118, 0.5538], [0.1339, 0.5197], [0.1392, 0.5156], [0.1456, 0.5191], [0.1328, 0.5484],
            [0.1328, 0.5556], [0.1403, 0.5562], [0.1435, 0.5538], [0.1583, 0.5191], [0.1637, 0.5156], [0.169, 0.5173],
            [0.1637, 0.5443], [0.17, 0.5449], [0.1743, 0.5395], [0.1796, 0.5161], [0.1934, 0.4856], [0.1923, 0.4617]
          ] }
        ]
      },
      {
        id: "left-hand", zoneId: "hand", side: "left", label: "Левая кисть", modifierLabel: "Hand",
        geometry: [
          { type: "polygon", points: [
            [0.8342, 0.4516], [0.7991, 0.4611], [0.7981, 0.4844], [0.8119, 0.515], [0.8183, 0.5401], [0.8236, 0.5455],
            [0.8289, 0.5449], [0.8236, 0.5179], [0.8278, 0.5156], [0.831, 0.5161], [0.8491, 0.552], [0.8544, 0.5562],
            [0.8597, 0.5562], [0.8608, 0.5496], [0.848, 0.5221], [0.848, 0.5173], [0.8544, 0.5156], [0.8757, 0.5544],
            [0.8842, 0.5562], [0.8863, 0.549], [0.8693, 0.515], [0.8714, 0.5126], [0.8789, 0.5126], [0.899, 0.5437],
            [0.9075, 0.5449], [0.9086, 0.5383], [0.8852, 0.4952], [0.8789, 0.4892], [0.8884, 0.4868], [0.9129, 0.4964],
            [0.9288, 0.4964], [0.9299, 0.4928], [0.915, 0.4868], [0.8874, 0.4695], [0.8544, 0.4575], [0.8438, 0.451]
          ] }
        ]
      },
      {
        id: "right-leg", zoneId: "leg", side: "right", label: "Правая нога", modifierLabel: "Right Leg",
        geometry: [
          { type: "polygon", points: [
            [0.3783, 0.4366], [0.3549, 0.4402], [0.3273, 0.5018], [0.3199, 0.5335], [0.3231, 0.5694], [0.3518, 0.6453],
            [0.3475, 0.6824], [0.3188, 0.7291], [0.3167, 0.759], [0.3507, 0.8654], [0.3911, 0.8612], [0.3911, 0.82],
            [0.4198, 0.756], [0.4123, 0.6998], [0.4283, 0.6734], [0.4463, 0.6017], [0.4655, 0.5616], [0.475, 0.5233],
            [0.4463, 0.497], [0.4166, 0.4528], [0.4038, 0.4438]
          ] }
        ]
      },
      {
        id: "left-leg", zoneId: "leg", side: "left", label: "Левая нога", modifierLabel: "Left Leg",
        geometry: [
          { type: "polygon", points: [
            [0.6121, 0.4366], [0.5877, 0.4438], [0.5728, 0.4545], [0.543, 0.4994], [0.5165, 0.5191], [0.5165, 0.5311],
            [0.5441, 0.6005], [0.5632, 0.6734], [0.5792, 0.7004], [0.5707, 0.7512], [0.5983, 0.814], [0.6004, 0.8618],
            [0.6397, 0.8654], [0.6759, 0.7536], [0.6695, 0.7213], [0.644, 0.683], [0.6397, 0.6453], [0.6695, 0.567],
            [0.6716, 0.5311], [0.6366, 0.4402], [0.6281, 0.4366]
          ] }
        ]
      },
      {
        id: "right-foot", zoneId: "foot", side: "right", label: "Правая ступня", modifierLabel: "Foot",
        geometry: [
          { type: "polygon", points: [
            [0.3953, 0.8708], [0.3709, 0.8738], [0.3518, 0.8744], [0.3496, 0.8756], [0.3464, 0.8983], [0.3379, 0.9121],
            [0.3209, 0.9318], [0.3156, 0.9402], [0.3156, 0.9432], [0.322, 0.9444], [0.3252, 0.9468], [0.3337, 0.9462],
            [0.339, 0.9492], [0.3433, 0.9492], [0.3454, 0.948], [0.3518, 0.951], [0.3603, 0.9504], [0.3656, 0.9528],
            [0.3698, 0.9528], [0.3719, 0.9516], [0.3741, 0.9522], [0.3741, 0.9569], [0.3709, 0.9605], [0.3677, 0.9695],
            [0.3709, 0.9707], [0.3709, 0.9725], [0.3762, 0.9749], [0.3858, 0.9749], [0.3932, 0.9725], [0.3974, 0.9677],
            [0.4038, 0.9516], [0.4038, 0.9348], [0.3974, 0.9025], [0.4006, 0.8804]
          ] }
        ]
      },
      {
        id: "left-foot", zoneId: "foot", side: "left", label: "Левая ступня", modifierLabel: "Foot",
        geometry: [
          { type: "polygon", points: [
            [0.5962, 0.8708], [0.5909, 0.8792], [0.5909, 0.8888], [0.594, 0.9019], [0.5877, 0.9372], [0.5877, 0.9516],
            [0.5962, 0.9707], [0.6004, 0.9737], [0.6047, 0.9749], [0.6142, 0.9749], [0.6196, 0.9737], [0.6206, 0.9707],
            [0.6238, 0.9695], [0.6217, 0.9623], [0.6164, 0.9563], [0.6164, 0.9533], [0.6185, 0.9522], [0.6259, 0.9528],
            [0.6312, 0.9504], [0.6408, 0.951], [0.6461, 0.9486], [0.6536, 0.9492], [0.6589, 0.9462], [0.6674, 0.9462],
            [0.6716, 0.9438], [0.6759, 0.9432], [0.6759, 0.939], [0.6472, 0.9025], [0.644, 0.8959], [0.644, 0.8858],
            [0.6408, 0.875], [0.6206, 0.8738], [0.6026, 0.8708]
          ] }
        ]
      }
    ]
  }
});

export class TargetingService {
  static async create({ attack, bodyplan = "humanoid" } = {}) {
    const definition = BODYPLAN_DEFINITIONS[bodyplan] ?? BODYPLAN_DEFINITIONS.humanoid;
    let table = null;
    let loadError = null;
    try {
      const systemModulePath = globalThis.foundry?.utils?.getRoute?.(
        "systems/gurps/module/hitlocation/hitlocation.js"
      ) ?? "/systems/gurps/module/hitlocation/hitlocation.js";
      const ggaHitLocations = await import(systemModulePath);
      table = ggaHitLocations.HitLocation?.getHitLocationRolls?.(definition.id) ?? null;
    } catch (error) {
      loadError = error;
    }
    if (!table) {
      throw new Error("GGA не предоставила humanoid Hit Location Table.", { cause: loadError });
    }
    return new TargetingService({ definition, table, tableSource: "gga", attack });
  }

  constructor({ definition, table, tableSource, attack }) {
    this.bodyplan = definition.id;
    this.image = definition.image;
    this.table = table;
    this.tableSource = tableSource;
    this.damageProfile = this._inspectDamageProfile(attack);
    this.zones = definition.zones.map(zone => ({
      ...zone,
      penalty: this._resolvePenalty(zone),
      available: !zone.precisionOnly || !this.damageProfile.reliable || this.damageProfile.precisionEligible,
      unavailableReason: zone.precisionOnly && this.damageProfile.reliable && !this.damageProfile.precisionEligible
        ? "Доступно только для impaling, piercing и tight-beam burning атак"
        : ""
    }));
    this.regions = definition.regions.map(region => ({ ...region }));
  }

  getDefaultSelection() {
    return { zoneId: "silhouette", regionId: null };
  }

  getZone(zoneId) {
    return this.zones.find(zone => zone.id === zoneId) ?? null;
  }

  getRegion(regionId) {
    return this.regions.find(region => region.id === regionId) ?? null;
  }

  getSelection(zoneId, regionId = null) {
    const zone = this.getZone(zoneId);
    if (!zone || !zone.available) return null;
    const region = regionId ? this.getRegion(regionId) : null;
    if (regionId && (!region || region.zoneId !== zone.id)) return null;
    return {
      zoneId: zone.id,
      regionId: region?.selectWholeZone ? null : region?.id ?? null,
      side: region?.side ?? null,
      label: region?.selectWholeZone ? zone.label : region?.label ?? zone.label,
      modifierLabel: region?.modifierLabel ?? zone.modifierLabel,
      penalty: zone.penalty,
      random: !!zone.random
    };
  }

  async resolveRandomHitLocation() {
    const roll = Roll.create("3d6[Hit Location]");
    await roll.evaluate();
    if (typeof roll.toMessage === "function") {
      try {
        await roll.toMessage({ chatMessage: "Rolling for Hit Location." });
      } catch (_error) {
        // The resolved location remains valid even if publishing the die message fails.
      }
    }
    const total = Number(roll.total);
    const match = Object.entries(this.table).find(([, entry]) => this._expandRoll(entry?.roll).includes(total));
    if (!match) throw new Error(`В humanoid Hit Location Table нет результата для ${total}.`);
    const [ggaKey] = match;
    const region = /^(?:Right|Left) /.test(ggaKey)
      ? this.regions.find(entry => entry.modifierLabel === ggaKey)
      : null;
    const zone = region ? this.getZone(region.zoneId) : this.zones.find(entry => entry.ggaKeys?.includes(ggaKey));
    return {
      total,
      roll,
      ggaKey,
      zoneId: zone?.id ?? null,
      regionId: region?.id ?? null,
      label: region?.label ?? zone?.label ?? ggaKey
    };
  }

  _resolvePenalty(zone) {
    for (const key of zone.ggaKeys ?? []) {
      const value = Number(this.table?.[key]?.penalty);
      if (Number.isFinite(value)) return value;
    }
    return Number(zone.fallbackPenalty ?? zone.penalty ?? 0);
  }

  _expandRoll(specification) {
    if (!specification || specification === "-") return [];
    const results = [];
    for (const part of String(specification).split("&")) {
      const [startText, endText = startText] = part.trim().split("-");
      const start = Number(startText);
      const end = Number(endText);
      if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
      for (let value = Math.min(start, end); value <= Math.max(start, end); value += 1) results.push(value);
    }
    return results;
  }

  _inspectDamageProfile(attack) {
    const damage = attack?.data?.damage;
    const expressions = (Array.isArray(damage) ? damage : [damage])
      .map(value => typeof value === "string" ? value.trim() : "")
      .filter(Boolean);
    if (expressions.length === 0 || !globalThis.GURPS?.parselink) {
      return { reliable: false, precisionEligible: true, types: [] };
    }

    const profiles = [];
    for (const expression of expressions) {
      try {
        const action = globalThis.GURPS.parselink(`[${expression}]`)?.action;
        const translated = globalThis.GURPS.DamageTables?.translate?.(action?.damagetype) ?? action?.damagetype;
        const type = String(translated ?? "").toLowerCase();
        if (!type) return { reliable: false, precisionEligible: true, types: [] };
        profiles.push({ type, extension: String(action?.extdamagetype ?? "").toLowerCase() });
      } catch (_error) {
        return { reliable: false, precisionEligible: true, types: [] };
      }
    }

    const knownTypes = new Set(["aff", "burn", "cor", "cr", "cut", "dmg", "fat", "imp", "injury", "kb", "pi-", "pi", "pi+", "pi++", "tox"]);
    if (profiles.some(profile => !knownTypes.has(profile.type))) {
      return { reliable: false, precisionEligible: true, types: profiles.map(profile => profile.type) };
    }
    const precisionEligible = profiles.some(profile =>
      profile.type === "imp" ||
      profile.type.startsWith("pi") ||
      (profile.type === "burn" && /(?:^|\W)(?:tbb|tight[ -]?beam)(?:$|\W)/i.test(profile.extension))
    );
    return { reliable: true, precisionEligible, types: profiles.map(profile => profile.type) };
  }
}