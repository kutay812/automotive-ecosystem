export interface Category {
  name: string;
  subcategories: string[];
}

export interface Brand {
  name: string;
  models: string[];
}

export const PART_CATEGORIES: Category[] = [
  {
    name: "Motor ve Mekanik",
    subcategories: [
      "Motor Parçaları",
      "Silindir Kapağı",
      "Piston ve Segman",
      "Krank Mili",
      "Turbo Sistemleri",
      "Triger Setleri",
      "Conta Takımları",
      "Yağ Pompası",
      "Yakıt Pompası",
      "Motor Takozu"
    ]
  },
  {
    name: "Şanzıman ve Aktarma",
    subcategories: [
      "Şanzıman Parçaları",
      "Debriyaj Setleri",
      "Volan",
      "Diferansiyel",
      "Aks ve Aks Kafası",
      "Şaft Sistemleri",
      "Vites Kutusu",
      "Otomatik Şanzıman Yağları"
    ]
  },
  {
    name: "Fren Sistemi",
    subcategories: [
      "Fren Balatası",
      "Fren Diski",
      "Fren Merkezi",
      "ABS Sensörleri",
      "Fren Hidroliği",
      "El Freni Sistemleri",
      "Kampana Fren"
    ]
  },
  {
    name: "Süspansiyon ve Yürüyen Aksam",
    subcategories: [
      "Amortisör",
      "Yay Sistemleri",
      "Rot Başı",
      "Salıncak",
      "Z Rot",
      "Direksiyon Kutusu",
      "Rulman",
      "Viraj Demiri"
    ]
  },
  {
    name: "Elektrik ve Elektronik",
    subcategories: [
      "Akü",
      "Alternatör",
      "Marş Motoru",
      "Sigorta ve Röle",
      "Sensörler",
      "ECU Beyni",
      "Far Beyni",
      "Kablo Tesisatı",
      "Kamera ve Multimedya"
    ]
  },
  {
    name: "Aydınlatma Sistemleri",
    subcategories: [
      "Ön Far",
      "Arka Stop",
      "Sis Farı",
      "LED Xenon Sistemleri",
      "Sinyal Lambaları",
      "İç Aydınlatma"
    ]
  },
  {
    name: "Filtre ve Bakım Ürünleri",
    subcategories: [
      "Yağ Filtresi",
      "Hava Filtresi",
      "Polen Filtresi",
      "Yakıt Filtresi",
      "Motor Yağları",
      "Antifriz",
      "Cam Suyu",
      "Katkı Ürünleri"
    ]
  },
  {
    name: "Klima ve Soğutma",
    subcategories: [
      "Radyatör",
      "Klima Kompresörü",
      "Fan Motoru",
      "Intercooler",
      "Termostat",
      "Su Pompası",
      "Klima Gazı"
    ]
  },
  {
    name: "Kaporta ve Dış Aksam",
    subcategories: [
      "Tampon",
      "Çamurluk",
      "Kaput",
      "Bagaj Kapağı",
      "Yan Ayna",
      "Kapı Parçaları",
      "Panjur",
      "Marşpiyel"
    ]
  },
  {
    name: "İç Mekan",
    subcategories: [
      "Koltuk Sistemleri",
      "Direksiyon",
      "Göğüs Paneli",
      "Vites Topuzu",
      "Multimedya Sistemleri",
      "Paspas",
      "Tavan Döşemesi"
    ]
  },
  {
    name: "Lastik ve Jant",
    subcategories: [
      "Yaz Lastiği",
      "Kış Lastiği",
      "Dört Mevsim Lastik",
      "Çelik Jant",
      "Alaşım Jant",
      "Bijon ve Kapaklar"
    ]
  },
  {
    name: "Egzoz Sistemi",
    subcategories: [
      "Egzoz Borusu",
      "Susturucu",
      "Katalitik Konvertör",
      "Partikül Filtresi",
      "Egzoz Manifoldu"
    ]
  },
  {
    name: "Performans ve Modifiye",
    subcategories: [
      "Spor Egzoz",
      "Coilover",
      "Body Kit",
      "Yazılım ve Chip Tuning",
      "Hava Süspansiyonu",
      "Spor Filtre"
    ]
  },
  {
    name: "Oto Aksesuar",
    subcategories: [
      "Telefon Tutucu",
      "Araç Kamerası",
      "Park Sensörü",
      "Koltuk Kılıfı",
      "Direksiyon Kılıfı",
      "LED İç Ambiyans",
      "Şarj Cihazları"
    ]
  }
];

export const VEHICLE_BRANDS: Brand[] = [
  {
    name: "BMW",
    models: [
      "BMW 1 Serisi",
      "BMW 3 Serisi",
      "BMW 5 Serisi",
      "BMW 7 Serisi",
      "BMW X1",
      "BMW X3",
      "BMW X5",
      "BMW M Serisi"
    ]
  },
  {
    name: "Mercedes-Benz",
    models: [
      "C Serisi",
      "E Serisi",
      "S Serisi",
      "CLA",
      "GLA",
      "GLC",
      "AMG Serisi"
    ]
  },
  {
    name: "Audi",
    models: [
      "Audi A3",
      "Audi A4",
      "Audi A6",
      "Audi Q3",
      "Audi Q5",
      "Audi Q7",
      "Audi RS Serisi"
    ]
  },
  {
    name: "Volkswagen",
    models: [
      "Golf",
      "Passat",
      "Jetta",
      "Polo",
      "Tiguan",
      "Touareg",
      "Caddy"
    ]
  },
  {
    name: "Toyota",
    models: [
      "Corolla",
      "Camry",
      "Yaris",
      "Hilux",
      "CH-R",
      "RAV4"
    ]
  },
  {
    name: "Honda",
    models: [
      "Civic",
      "Accord",
      "CR-V",
      "Jazz",
      "City"
    ]
  },
  {
    name: "Renault",
    models: [
      "Clio",
      "Megane",
      "Symbol",
      "Talisman",
      "Kangoo"
    ]
  },
  {
    name: "Fiat",
    models: [
      "Egea",
      "Linea",
      "Doblo",
      "Fiorino",
      "Panda"
    ]
  },
  {
    name: "Ford",
    models: [
      "Focus",
      "Fiesta",
      "Mondeo",
      "Ranger",
      "Transit"
    ]
  },
  {
    name: "Hyundai",
    models: [
      "i20",
      "i30",
      "Elantra",
      "Tucson",
      "Santa Fe"
    ]
  },
  {
    name: "Peugeot",
    models: [
      "208",
      "308",
      "508",
      "2008",
      "3008"
    ]
  },
  {
    name: "Opel",
    models: [
      "Astra",
      "Corsa",
      "Insignia",
      "Crossland",
      "Mokka"
    ]
  },
  {
    name: "Nissan",
    models: [
      "Qashqai",
      "Juke",
      "Micra",
      "Navara",
      "X-Trail"
    ]
  },
  {
    name: "Kia",
    models: [
      "Rio",
      "Cerato",
      "Sportage",
      "Sorento",
      "Stonic"
    ]
  },
  {
    name: "Skoda",
    models: [
      "Octavia",
      "Superb",
      "Fabia",
      "Kodiaq",
      "Kamiq"
    ]
  },
  {
    name: "Seat",
    models: [
      "Ibiza",
      "Leon",
      "Ateca",
      "Arona",
      "Toledo"
    ]
  },
  {
    name: "Tesla",
    models: [
      "Model S",
      "Model 3",
      "Model X",
      "Model Y"
    ]
  },
  {
    name: "Porsche",
    models: [
      "911",
      "Panamera",
      "Cayenne",
      "Macan",
      "Taycan"
    ]
  },
  {
    name: "Chevrolet",
    models: [
      "Cruze",
      "Camaro",
      "Malibu",
      "Captiva"
    ]
  },
  {
    name: "Dacia",
    models: [
      "Sandero",
      "Logan",
      "Duster",
      "Jogger"
    ]
  },
  {
    name: "Volvo",
    models: [
      "S60",
      "S90",
      "XC40",
      "XC60",
      "XC90"
    ]
  },
  {
    name: "Mini",
    models: [
      "Cooper",
      "Clubman",
      "Countryman"
    ]
  },
  {
    name: "Jeep",
    models: [
      "Renegade",
      "Compass",
      "Wrangler",
      "Cherokee"
    ]
  },
  {
    name: "Land Rover",
    models: [
      "Range Rover",
      "Discovery",
      "Defender",
      "Evoque"
    ]
  }
];
