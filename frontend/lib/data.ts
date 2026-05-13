// Mock data for PitchPulse — typed exports.
// All match results, goals, and scorelines are fictional.
// Team & host city names are real.

import type {
  Stadium, Team, Match, Pulse, GroupRow, Country, CountryCode,
  TopScorer, TopAssist, TopCards, Bracket, NewsItem,
} from './types';

export const stadiums: Stadium[] = [
  {
    "id": "tor",
    "city": "Toronto",
    "country": "CA",
    "name": "Toronto Stadium",
    "capacity": 45736,
    "lat": 43.65,
    "lng": -79.38,
    "opened": 2007,
    "surface": "Hybrid grass",
    "orientation": "NE–SW"
  },
  {
    "id": "van",
    "city": "Vancouver",
    "country": "CA",
    "name": "BC Place",
    "capacity": 54500,
    "lat": 49.28,
    "lng": -123.12,
    "opened": 1983,
    "surface": "Hybrid grass",
    "orientation": "N–S"
  },
  {
    "id": "mex",
    "city": "Mexico City",
    "country": "MX",
    "name": "Estadio Azteca",
    "capacity": 87000,
    "lat": 19.43,
    "lng": -99.13,
    "opened": 1966,
    "surface": "Natural grass",
    "orientation": "N–S"
  },
  {
    "id": "gdl",
    "city": "Guadalajara",
    "country": "MX",
    "name": "Estadio Akron",
    "capacity": 48071,
    "lat": 20.67,
    "lng": -103.35,
    "opened": 2010,
    "surface": "Natural grass",
    "orientation": "NW–SE"
  },
  {
    "id": "mty",
    "city": "Monterrey",
    "country": "MX",
    "name": "Estadio BBVA",
    "capacity": 53500,
    "lat": 25.67,
    "lng": -100.31,
    "opened": 2015,
    "surface": "Natural grass",
    "orientation": "N–S"
  },
  {
    "id": "atl",
    "city": "Atlanta",
    "country": "US",
    "name": "Atlanta Stadium",
    "capacity": 71000,
    "lat": 33.75,
    "lng": -84.39,
    "opened": 2017,
    "surface": "Hybrid grass",
    "orientation": "E–W"
  },
  {
    "id": "bos",
    "city": "Boston",
    "country": "US",
    "name": "Foxborough",
    "capacity": 65878,
    "lat": 42.09,
    "lng": -71.26,
    "opened": 2002,
    "surface": "Natural grass",
    "orientation": "N–S"
  },
  {
    "id": "dal",
    "city": "Dallas",
    "country": "US",
    "name": "Arlington Stadium",
    "capacity": 80000,
    "lat": 32.75,
    "lng": -97.09,
    "opened": 2009,
    "surface": "Hybrid grass",
    "orientation": "E–W"
  },
  {
    "id": "hou",
    "city": "Houston",
    "country": "US",
    "name": "Houston Stadium",
    "capacity": 72220,
    "lat": 29.76,
    "lng": -95.37,
    "opened": 2002,
    "surface": "Hybrid grass",
    "orientation": "N–S"
  },
  {
    "id": "kan",
    "city": "Kansas City",
    "country": "US",
    "name": "Arrowhead",
    "capacity": 76416,
    "lat": 39.1,
    "lng": -94.58,
    "opened": 1972,
    "surface": "Hybrid grass",
    "orientation": "NW–SE"
  },
  {
    "id": "lax",
    "city": "Los Angeles",
    "country": "US",
    "name": "SoFi Stadium",
    "capacity": 70240,
    "lat": 33.95,
    "lng": -118.34,
    "opened": 2020,
    "surface": "Hybrid grass",
    "orientation": "E–W"
  },
  {
    "id": "mia",
    "city": "Miami",
    "country": "US",
    "name": "Hard Rock Stadium",
    "capacity": 67518,
    "lat": 25.96,
    "lng": -80.24,
    "opened": 1987,
    "surface": "Hybrid grass",
    "orientation": "N–S"
  },
  {
    "id": "nyc",
    "city": "New York / NJ",
    "country": "US",
    "name": "MetLife Stadium",
    "capacity": 82500,
    "lat": 40.81,
    "lng": -74.07,
    "opened": 2010,
    "surface": "Hybrid grass",
    "orientation": "N–S"
  },
  {
    "id": "phi",
    "city": "Philadelphia",
    "country": "US",
    "name": "Lincoln Field",
    "capacity": 69596,
    "lat": 39.9,
    "lng": -75.17,
    "opened": 2003,
    "surface": "Hybrid grass",
    "orientation": "NE–SW"
  },
  {
    "id": "sfo",
    "city": "San Francisco",
    "country": "US",
    "name": "Levi's Stadium",
    "capacity": 68500,
    "lat": 37.4,
    "lng": -121.97,
    "opened": 2014,
    "surface": "Natural grass",
    "orientation": "NW–SE"
  },
  {
    "id": "sea",
    "city": "Seattle",
    "country": "US",
    "name": "Lumen Field",
    "capacity": 68740,
    "lat": 47.59,
    "lng": -122.33,
    "opened": 2002,
    "surface": "Hybrid grass",
    "orientation": "N–S"
  }
];

export const teams: Record<string, Team> = {
  "BRA": {
    "code": "BRA",
    "name": "Brazil",
    "flag": [
      "#009C3B",
      "#FFDF00",
      "#002776"
    ],
    "group": "A",
    "form": [
      "W",
      "W",
      "D",
      "W",
      "W"
    ]
  },
  "ARG": {
    "code": "ARG",
    "name": "Argentina",
    "flag": [
      "#75AADB",
      "#FFFFFF",
      "#75AADB"
    ],
    "group": "C",
    "form": [
      "W",
      "D",
      "W",
      "W",
      "L"
    ]
  },
  "ENG": {
    "code": "ENG",
    "name": "England",
    "flag": [
      "#FFFFFF",
      "#CE1124",
      "#FFFFFF"
    ],
    "group": "B",
    "form": [
      "W",
      "W",
      "W",
      "D",
      "W"
    ]
  },
  "FRA": {
    "code": "FRA",
    "name": "France",
    "flag": [
      "#0055A4",
      "#FFFFFF",
      "#EF4135"
    ],
    "group": "F",
    "form": [
      "W",
      "L",
      "W",
      "W",
      "W"
    ]
  },
  "GER": {
    "code": "GER",
    "name": "Germany",
    "flag": [
      "#000000",
      "#DD0000",
      "#FFCE00"
    ],
    "group": "D",
    "form": [
      "D",
      "W",
      "W",
      "L",
      "W"
    ]
  },
  "ESP": {
    "code": "ESP",
    "name": "Spain",
    "flag": [
      "#AA151B",
      "#F1BF00",
      "#AA151B"
    ],
    "group": "E",
    "form": [
      "W",
      "W",
      "D",
      "W",
      "W"
    ]
  },
  "POR": {
    "code": "POR",
    "name": "Portugal",
    "flag": [
      "#006600",
      "#FF0000",
      "#FF0000"
    ],
    "group": "H",
    "form": [
      "W",
      "D",
      "W",
      "W",
      "D"
    ]
  },
  "NED": {
    "code": "NED",
    "name": "Netherlands",
    "flag": [
      "#AE1C28",
      "#FFFFFF",
      "#21468B"
    ],
    "group": "B",
    "form": [
      "W",
      "W",
      "L",
      "W",
      "D"
    ]
  },
  "BEL": {
    "code": "BEL",
    "name": "Belgium",
    "flag": [
      "#000000",
      "#FAE042",
      "#ED2939"
    ],
    "group": "F",
    "form": [
      "L",
      "D",
      "W",
      "W",
      "W"
    ]
  },
  "ITA": {
    "code": "ITA",
    "name": "Italy",
    "flag": [
      "#008C45",
      "#F4F5F0",
      "#CD212A"
    ],
    "group": "A",
    "form": [
      "D",
      "W",
      "W",
      "W",
      "D"
    ]
  },
  "USA": {
    "code": "USA",
    "name": "USA",
    "flag": [
      "#B22234",
      "#FFFFFF",
      "#3C3B6E"
    ],
    "group": "D",
    "form": [
      "W",
      "D",
      "W",
      "L",
      "W"
    ]
  },
  "MEX": {
    "code": "MEX",
    "name": "Mexico",
    "flag": [
      "#006847",
      "#FFFFFF",
      "#CE1126"
    ],
    "group": "A",
    "form": [
      "W",
      "W",
      "D",
      "W",
      "W"
    ]
  },
  "CAN": {
    "code": "CAN",
    "name": "Canada",
    "flag": [
      "#FF0000",
      "#FFFFFF",
      "#FF0000"
    ],
    "group": "E",
    "form": [
      "D",
      "W",
      "L",
      "D",
      "W"
    ]
  },
  "JPN": {
    "code": "JPN",
    "name": "Japan",
    "flag": [
      "#FFFFFF",
      "#BC002D",
      "#FFFFFF"
    ],
    "group": "C",
    "form": [
      "W",
      "W",
      "W",
      "D",
      "W"
    ]
  },
  "KOR": {
    "code": "KOR",
    "name": "Korea Rep.",
    "flag": [
      "#FFFFFF",
      "#0047A0",
      "#CD2E3A"
    ],
    "group": "G",
    "form": [
      "W",
      "D",
      "L",
      "W",
      "W"
    ]
  },
  "AUS": {
    "code": "AUS",
    "name": "Australia",
    "flag": [
      "#012169",
      "#FFFFFF",
      "#E4002B"
    ],
    "group": "H",
    "form": [
      "L",
      "D",
      "W",
      "W",
      "D"
    ]
  },
  "MAR": {
    "code": "MAR",
    "name": "Morocco",
    "flag": [
      "#C1272D",
      "#006233",
      "#C1272D"
    ],
    "group": "G",
    "form": [
      "W",
      "D",
      "W",
      "W",
      "D"
    ]
  },
  "SEN": {
    "code": "SEN",
    "name": "Senegal",
    "flag": [
      "#00853F",
      "#FDEF42",
      "#E31B23"
    ],
    "group": "E",
    "form": [
      "D",
      "W",
      "W",
      "L",
      "W"
    ]
  },
  "CRO": {
    "code": "CRO",
    "name": "Croatia",
    "flag": [
      "#FF0000",
      "#FFFFFF",
      "#171796"
    ],
    "group": "D",
    "form": [
      "W",
      "D",
      "D",
      "W",
      "L"
    ]
  },
  "URU": {
    "code": "URU",
    "name": "Uruguay",
    "flag": [
      "#FFFFFF",
      "#0038A8",
      "#FFFFFF"
    ],
    "group": "F",
    "form": [
      "W",
      "L",
      "W",
      "D",
      "W"
    ]
  },
  "SUI": {
    "code": "SUI",
    "name": "Switzerland",
    "flag": [
      "#FF0000",
      "#FFFFFF",
      "#FF0000"
    ],
    "group": "B",
    "form": [
      "D",
      "W",
      "D",
      "W",
      "L"
    ]
  },
  "DEN": {
    "code": "DEN",
    "name": "Denmark",
    "flag": [
      "#C60C30",
      "#FFFFFF",
      "#C60C30"
    ],
    "group": "C",
    "form": [
      "W",
      "D",
      "W",
      "D",
      "W"
    ]
  },
  "POL": {
    "code": "POL",
    "name": "Poland",
    "flag": [
      "#FFFFFF",
      "#DC143C",
      "#DC143C"
    ],
    "group": "G",
    "form": [
      "L",
      "W",
      "D",
      "W",
      "D"
    ]
  },
  "COL": {
    "code": "COL",
    "name": "Colombia",
    "flag": [
      "#FCD116",
      "#003893",
      "#CE1126"
    ],
    "group": "H",
    "form": [
      "W",
      "W",
      "D",
      "W",
      "D"
    ]
  }
};

export const matches: Match[] = [
  {
    "id": "m01",
    "home": "BRA",
    "away": "POR",
    "score": [
      2,
      1
    ],
    "status": "live",
    "minute": 73,
    "stadium": "nyc",
    "stage": "R16",
    "heat": 0.92,
    "kickoff": "15:00"
  },
  {
    "id": "m02",
    "home": "FRA",
    "away": "BEL",
    "score": [
      1,
      1
    ],
    "status": "live",
    "minute": 58,
    "stadium": "lax",
    "stage": "R16",
    "heat": 0.88,
    "kickoff": "15:30"
  },
  {
    "id": "m03",
    "home": "ARG",
    "away": "JPN",
    "score": [
      3,
      2
    ],
    "status": "live",
    "minute": 89,
    "stadium": "mex",
    "stage": "R16",
    "heat": 0.97,
    "kickoff": "13:00"
  },
  {
    "id": "m04",
    "home": "ESP",
    "away": "MAR",
    "score": [
      0,
      1
    ],
    "status": "live",
    "minute": 34,
    "stadium": "atl",
    "stage": "R16",
    "heat": 0.79,
    "kickoff": "16:00"
  },
  {
    "id": "m05",
    "home": "ENG",
    "away": "NED",
    "score": [
      2,
      2
    ],
    "status": "ft",
    "minute": 90,
    "stadium": "tor",
    "stage": "R16",
    "heat": 0.85,
    "kickoff": "12:00",
    "winner": "ENG (pen 4–3)"
  },
  {
    "id": "m06",
    "home": "GER",
    "away": "USA",
    "score": [
      1,
      3
    ],
    "status": "ft",
    "minute": 90,
    "stadium": "dal",
    "stage": "R16",
    "heat": 0.81,
    "kickoff": "11:00"
  },
  {
    "id": "m07",
    "home": "MEX",
    "away": "CRO",
    "score": [
      2,
      0
    ],
    "status": "ft",
    "minute": 90,
    "stadium": "gdl",
    "stage": "R16",
    "heat": 0.74,
    "kickoff": "10:30"
  },
  {
    "id": "m08",
    "home": "ITA",
    "away": "SEN",
    "score": [
      1,
      2
    ],
    "status": "ft",
    "minute": 90,
    "stadium": "mia",
    "stage": "R16",
    "heat": 0.77,
    "kickoff": "09:00"
  },
  {
    "id": "m09",
    "home": "URU",
    "away": "COL",
    "score": null,
    "status": "upcoming",
    "minute": 0,
    "stadium": "hou",
    "stage": "QF",
    "heat": 0,
    "kickoff": "Tomorrow 14:00"
  },
  {
    "id": "m10",
    "home": "CAN",
    "away": "KOR",
    "score": null,
    "status": "upcoming",
    "minute": 0,
    "stadium": "van",
    "stage": "QF",
    "heat": 0,
    "kickoff": "Tomorrow 17:00"
  },
  {
    "id": "m11",
    "home": "DEN",
    "away": "AUS",
    "score": null,
    "status": "upcoming",
    "minute": 0,
    "stadium": "sea",
    "stage": "QF",
    "heat": 0,
    "kickoff": "Tomorrow 20:00"
  },
  {
    "id": "m12",
    "home": "SUI",
    "away": "POL",
    "score": null,
    "status": "upcoming",
    "minute": 0,
    "stadium": "phi",
    "stage": "QF",
    "heat": 0,
    "kickoff": "Jun 8 13:00"
  },
  {
    "id": "m13",
    "home": "BRA",
    "away": "JPN",
    "score": [
      4,
      0
    ],
    "status": "ft",
    "minute": 90,
    "stadium": "kan",
    "stage": "GS",
    "heat": 0.66,
    "kickoff": "Group Stage"
  },
  {
    "id": "m14",
    "home": "FRA",
    "away": "AUS",
    "score": [
      3,
      1
    ],
    "status": "ft",
    "minute": 90,
    "stadium": "bos",
    "stage": "GS",
    "heat": 0.62,
    "kickoff": "Group Stage"
  },
  {
    "id": "m15",
    "home": "ARG",
    "away": "POL",
    "score": [
      2,
      0
    ],
    "status": "ft",
    "minute": 90,
    "stadium": "sfo",
    "stage": "GS",
    "heat": 0.58,
    "kickoff": "Group Stage"
  },
  {
    "id": "m16",
    "home": "ENG",
    "away": "MAR",
    "score": [
      1,
      1
    ],
    "status": "ft",
    "minute": 90,
    "stadium": "mty",
    "stage": "GS",
    "heat": 0.71,
    "kickoff": "Group Stage"
  }
];

export const pulses: Pulse[] = [
  {
    "id": "p1",
    "match": "m03",
    "minute": 88,
    "scorer": "L. Messi",
    "team": "ARG",
    "t": 12
  },
  {
    "id": "p2",
    "match": "m01",
    "minute": 67,
    "scorer": "Vinícius Jr.",
    "team": "BRA",
    "t": 340
  },
  {
    "id": "p3",
    "match": "m02",
    "minute": 41,
    "scorer": "K. Mbappé",
    "team": "FRA",
    "t": 1020
  },
  {
    "id": "p4",
    "match": "m04",
    "minute": 27,
    "scorer": "H. Ziyech",
    "team": "MAR",
    "t": 1860
  },
  {
    "id": "p5",
    "match": "m01",
    "minute": 33,
    "scorer": "B. Fernandes",
    "team": "POR",
    "t": 2700
  },
  {
    "id": "p6",
    "match": "m03",
    "minute": 71,
    "scorer": "J. Álvarez",
    "team": "ARG",
    "t": 3240
  },
  {
    "id": "p7",
    "match": "m02",
    "minute": 22,
    "scorer": "R. Lukaku",
    "team": "BEL",
    "t": 3900
  },
  {
    "id": "p8",
    "match": "m03",
    "minute": 15,
    "scorer": "T. Kubo",
    "team": "JPN",
    "t": 4800
  }
];

export const groups: Record<string, GroupRow[]> = {
  "A": [
    {
      "team": "BRA",
      "p": 3,
      "w": 3,
      "d": 0,
      "l": 0,
      "gf": 9,
      "ga": 1,
      "pts": 9
    },
    {
      "team": "MEX",
      "p": 3,
      "w": 2,
      "d": 1,
      "l": 0,
      "gf": 6,
      "ga": 2,
      "pts": 7
    },
    {
      "team": "ITA",
      "p": 3,
      "w": 1,
      "d": 1,
      "l": 1,
      "gf": 4,
      "ga": 4,
      "pts": 4
    },
    {
      "team": "CAN",
      "p": 3,
      "w": 0,
      "d": 0,
      "l": 3,
      "gf": 1,
      "ga": 8,
      "pts": 0
    }
  ],
  "B": [
    {
      "team": "ENG",
      "p": 3,
      "w": 2,
      "d": 1,
      "l": 0,
      "gf": 7,
      "ga": 3,
      "pts": 7
    },
    {
      "team": "NED",
      "p": 3,
      "w": 2,
      "d": 0,
      "l": 1,
      "gf": 6,
      "ga": 4,
      "pts": 6
    },
    {
      "team": "SUI",
      "p": 3,
      "w": 1,
      "d": 1,
      "l": 1,
      "gf": 3,
      "ga": 3,
      "pts": 4
    },
    {
      "team": "AUS",
      "p": 3,
      "w": 0,
      "d": 0,
      "l": 3,
      "gf": 1,
      "ga": 7,
      "pts": 0
    }
  ]
};

export const countries: Record<CountryCode, Country> = {
  "CA": {
    "code": "CA",
    "name": "Canada",
    "tagline": "Pine forests, polite roars",
    "colors": [
      "#D52B1E",
      "#F4F1EA"
    ],
    "cities": [
      "Toronto",
      "Vancouver"
    ],
    "population": "40.1M",
    "timezones": "6 (UTC-3:30 to UTC-8)",
    "food": [
      {
        "name": "Poutine",
        "note": "Fries, cheese curds, gravy. Eaten at 2 a.m."
      },
      {
        "name": "Butter tart",
        "note": "Sweet pastry from Ontario kitchens."
      },
      {
        "name": "Tourtière",
        "note": "Spiced meat pie, a Québécois classic."
      }
    ],
    "culture": [
      "Two official languages: English & French.",
      "The maple leaf has been the national symbol since 1965.",
      "Hockey is the de facto religion; soccer is rising fast."
    ],
    "fanFact": "Canadian fans queue politely — and apologise when celebrating."
  },
  "US": {
    "code": "US",
    "name": "United States",
    "tagline": "Eleven cities, one tournament",
    "colors": [
      "#0A3161",
      "#B31942"
    ],
    "cities": [
      "Atlanta",
      "Boston",
      "Dallas",
      "Houston",
      "Kansas City",
      "Los Angeles",
      "Miami",
      "New York/NJ",
      "Philadelphia",
      "San Francisco",
      "Seattle"
    ],
    "population": "335M",
    "timezones": "6 (UTC-5 to UTC-10)",
    "food": [
      {
        "name": "Tex-Mex",
        "note": "Brisket tacos travel well to a stadium."
      },
      {
        "name": "Buffalo wings",
        "note": "Hot sauce, blue cheese, napkins."
      },
      {
        "name": "Philly cheesesteak",
        "note": "Thin steak, melted cheese, long roll."
      }
    ],
    "culture": [
      "Hosts the most matches of any country in 2026.",
      "Soccer attendance has grown 280% in the last decade.",
      "Time-zone span makes back-to-back viewing easy."
    ],
    "fanFact": "Tailgate parties begin five hours before kickoff. Always."
  },
  "MX": {
    "code": "MX",
    "name": "Mexico",
    "tagline": "The first three-time host nation",
    "colors": [
      "#006847",
      "#CE1126"
    ],
    "cities": [
      "Mexico City",
      "Guadalajara",
      "Monterrey"
    ],
    "population": "128M",
    "timezones": "4 (UTC-5 to UTC-8)",
    "food": [
      {
        "name": "Tacos al pastor",
        "note": "Marinated pork, pineapple, corn tortilla."
      },
      {
        "name": "Mole poblano",
        "note": "20+ ingredients, chocolate, chile, alchemy."
      },
      {
        "name": "Elote",
        "note": "Grilled corn, lime, chile, cotija. Street perfection."
      }
    ],
    "culture": [
      "Estadio Azteca is the only stadium to host 3 World Cup tournaments.",
      "The Mexican Wave was popularised at the 1986 World Cup.",
      "\"¡Sí, se puede!\" — a chant you will hear and feel."
    ],
    "fanFact": "Sombreros bigger than the goalmouth. Bring earplugs."
  }
};

export const stadiumViews = {
  "seating": {
    "label": "Seating bowl",
    "detail": "Lower / Club / Upper · 11 tiers"
  },
  "pitch": {
    "label": "Pitch & lines",
    "detail": "105m × 68m · Hybrid surface"
  },
  "fan": {
    "label": "Fan zone",
    "detail": "6 entry gates · 4 concourse rings"
  }
} as const;

export const topScorers: TopScorer[] = [
  {
    "rank": 1,
    "player": "K. Mbappé",
    "team": "FRA",
    "goals": 7,
    "assists": 2,
    "xg": 5.4,
    "mp": 5
  },
  {
    "rank": 2,
    "player": "L. Messi",
    "team": "ARG",
    "goals": 6,
    "assists": 4,
    "xg": 4.1,
    "mp": 5
  },
  {
    "rank": 3,
    "player": "Vinícius Jr.",
    "team": "BRA",
    "goals": 5,
    "assists": 3,
    "xg": 4.7,
    "mp": 5
  },
  {
    "rank": 4,
    "player": "J. Bellingham",
    "team": "ENG",
    "goals": 5,
    "assists": 2,
    "xg": 3.9,
    "mp": 5
  },
  {
    "rank": 5,
    "player": "L. Yamal",
    "team": "ESP",
    "goals": 4,
    "assists": 5,
    "xg": 3.2,
    "mp": 5
  },
  {
    "rank": 6,
    "player": "C. Pulisic",
    "team": "USA",
    "goals": 4,
    "assists": 2,
    "xg": 3.6,
    "mp": 5
  },
  {
    "rank": 7,
    "player": "J. Álvarez",
    "team": "ARG",
    "goals": 4,
    "assists": 1,
    "xg": 3.8,
    "mp": 5
  },
  {
    "rank": 8,
    "player": "R. Lukaku",
    "team": "BEL",
    "goals": 4,
    "assists": 0,
    "xg": 4.1,
    "mp": 5
  },
  {
    "rank": 9,
    "player": "H. Ziyech",
    "team": "MAR",
    "goals": 3,
    "assists": 3,
    "xg": 2.7,
    "mp": 5
  },
  {
    "rank": 10,
    "player": "H. Kane",
    "team": "ENG",
    "goals": 3,
    "assists": 2,
    "xg": 4,
    "mp": 5
  }
];

export const topAssists: TopAssist[] = [
  {
    "rank": 1,
    "player": "L. Yamal",
    "team": "ESP",
    "assists": 5,
    "key": 14
  },
  {
    "rank": 2,
    "player": "K. De Bruyne",
    "team": "BEL",
    "assists": 5,
    "key": 16
  },
  {
    "rank": 3,
    "player": "L. Messi",
    "team": "ARG",
    "assists": 4,
    "key": 12
  },
  {
    "rank": 4,
    "player": "J. Musiala",
    "team": "GER",
    "assists": 4,
    "key": 11
  },
  {
    "rank": 5,
    "player": "B. Saka",
    "team": "ENG",
    "assists": 3,
    "key": 10
  }
];

export const topCards: TopCards[] = [
  {
    "team": "ITA",
    "y": 14,
    "r": 2
  },
  {
    "team": "URU",
    "y": 12,
    "r": 1
  },
  {
    "team": "ARG",
    "y": 11,
    "r": 1
  },
  {
    "team": "NED",
    "y": 10,
    "r": 0
  },
  {
    "team": "POR",
    "y": 9,
    "r": 1
  }
];

export const bracket: Bracket = {
  "R16": [
    {
      "id": "r1",
      "a": "BRA",
      "b": "POR",
      "score": [
        2,
        1
      ],
      "status": "live"
    },
    {
      "id": "r2",
      "a": "ENG",
      "b": "NED",
      "score": [
        2,
        2
      ],
      "status": "ft",
      "pen": [
        4,
        3
      ]
    },
    {
      "id": "r3",
      "a": "FRA",
      "b": "BEL",
      "score": [
        1,
        1
      ],
      "status": "live"
    },
    {
      "id": "r4",
      "a": "GER",
      "b": "USA",
      "score": [
        1,
        3
      ],
      "status": "ft"
    },
    {
      "id": "r5",
      "a": "ARG",
      "b": "JPN",
      "score": [
        3,
        2
      ],
      "status": "live"
    },
    {
      "id": "r6",
      "a": "MEX",
      "b": "CRO",
      "score": [
        2,
        0
      ],
      "status": "ft"
    },
    {
      "id": "r7",
      "a": "ESP",
      "b": "MAR",
      "score": [
        0,
        1
      ],
      "status": "live"
    },
    {
      "id": "r8",
      "a": "ITA",
      "b": "SEN",
      "score": [
        1,
        2
      ],
      "status": "ft"
    }
  ],
  "QF": [
    {
      "id": "q1",
      "a": null,
      "b": null,
      "hint": "R1·W vs R2·W",
      "score": null,
      "status": "upcoming"
    },
    {
      "id": "q2",
      "a": null,
      "b": null,
      "hint": "R3·W vs R4·W",
      "score": null,
      "status": "upcoming"
    },
    {
      "id": "q3",
      "a": null,
      "b": null,
      "hint": "R5·W vs R6·W",
      "score": null,
      "status": "upcoming"
    },
    {
      "id": "q4",
      "a": null,
      "b": null,
      "hint": "R7·W vs R8·W",
      "score": null,
      "status": "upcoming"
    }
  ],
  "SF": [
    {
      "id": "s1",
      "a": null,
      "b": null,
      "hint": "QF1·W vs QF2·W",
      "score": null,
      "status": "upcoming"
    },
    {
      "id": "s2",
      "a": null,
      "b": null,
      "hint": "QF3·W vs QF4·W",
      "score": null,
      "status": "upcoming"
    }
  ],
  "F": [
    {
      "id": "f1",
      "a": null,
      "b": null,
      "hint": "The Final · Jul 19 · MetLife",
      "score": null,
      "status": "upcoming"
    }
  ]
};

export const news: NewsItem[] = [
  {
    "id": "n1",
    "kind": "feature",
    "title": "The night Mexico City roared again",
    "dek": "A 2–0 win at the Azteca puts the hosts in their first knockout round on home soil since 1986.",
    "source": "PitchPulse Editorial",
    "time": "2h ago",
    "tag": "MEXICO",
    "accent": "#006847"
  },
  {
    "id": "n2",
    "kind": "short",
    "title": "Bellingham named player of the round",
    "dek": "Two goals and an assist in the group stage decider.",
    "source": "PP Wire",
    "time": "4h ago",
    "tag": "ENGLAND"
  },
  {
    "id": "n3",
    "kind": "short",
    "title": "Argentina training disrupted by storm",
    "dek": "Indoor session at Estadio Akron after lightning halts open practice.",
    "source": "AP",
    "time": "6h ago",
    "tag": "ARGENTINA"
  },
  {
    "id": "n4",
    "kind": "feature",
    "title": "Vancouver fans, finally",
    "dek": "A generation grew up without a senior World Cup match in Canada. Tomorrow that changes — and the line outside BC Place started at 4 a.m.",
    "source": "The Athletic",
    "time": "8h ago",
    "tag": "CANADA",
    "accent": "#D52B1E"
  },
  {
    "id": "n5",
    "kind": "short",
    "title": "Morocco springs the upset",
    "dek": "Ziyech opener stuns Spain in Atlanta, half-time 1–0.",
    "source": "PP Wire",
    "time": "10m ago",
    "tag": "MOROCCO"
  },
  {
    "id": "n6",
    "kind": "short",
    "title": "Referee assignments for QFs announced",
    "dek": "No host-nation referee will officiate any of their own teams' matches.",
    "source": "Reuters",
    "time": "12h ago",
    "tag": "OFFICIATING"
  },
  {
    "id": "n7",
    "kind": "short",
    "title": "Brazil rotate keeper for Portugal clash",
    "dek": "Ederson starts ahead of Alisson — a tactical call against high crosses.",
    "source": "ESPN",
    "time": "14h ago",
    "tag": "BRAZIL"
  },
  {
    "id": "n8",
    "kind": "short",
    "title": "USA-Germany was the highest-rated match of the year",
    "dek": "Average 18.4M U.S. viewers, peak 24.1M during the second half.",
    "source": "Nielsen",
    "time": "1d ago",
    "tag": "BROADCAST"
  }
];
