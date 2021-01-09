import ArcGISWebScene from '@arcgis/core/WebScene';
import SceneView from '@arcgis/core/views/SceneView';
import ArcGISMap from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import request from '@arcgis/core/request';
import ElevationProfile from "@arcgis/core/widgets/ElevationProfile";
import Basemap from "@arcgis/core/Basemap";
import Polyline from "@arcgis/core/geometry/Polyline";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import TileLayer from "@arcgis/core/layers/TileLayer";
import LabelClass from "@arcgis/core/layers/support/LabelClass";
import { tcx } from "@tmcw/togeojson";
import "./index.css";

const blue = [17, 121, 207];
const lightBlue = [129, 175, 214]
const brown = [158, 114, 82];
const lightBrown = [161, 136, 119];
const orange = [245, 173, 66];

const miniMap = new ArcGISMap({
  basemap: new Basemap({
    baseLayers: [
      new TileLayer({
        portalItem: {
          id: "1b243539f4514b6ba35e7d995890db1d" // world hillshade
        },
        opacity: 0.4
      }),
      new VectorTileLayer({
        portalItem:{
          id: "378fd91096fe478cb78a4e06b639b715"
        },
        blendMode: "multiply"
     })
    ]
  })
});

new MapView({
  container: "miniMap",
  map: miniMap,
  center: [8.29369, 46.437067],
  zoom: 7,
  ui: {
    components: []
  }
});

const citiesLayer = new FeatureLayer({
  url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/swiss_cities/FeatureServer",
  definitionExpression: "KURZTEXT IN ('Bern', 'Zürich', 'Lausanne', 'Genève', 'Kandersteg', 'Luzern', 'Winterthur', 'Lugano', 'Chur')",
  renderer: {
    type: "unique-value",
    field: "KURZTEXT",
    defaultSymbol: {
      type: "simple-marker",  // autocasts as new SimpleMarkerSymbol()
      style: "circle",
      color: [150, 150, 150],
      size: "8px",  // pixels
      outline: {
        width: 0  // points
      }
    },
    uniqueValueInfos: [{
      value: "Kandersteg",
      symbol: {
        type: "simple-marker",  // autocasts as new SimpleMarkerSymbol()
        style: "circle",
        color: orange,
        size: "8px",  // pixels
        outline: {
          width: 0  // points
        }
      }
    }]
  },
  labelingInfo: [
    new LabelClass({
      labelExpressionInfo: { expression: "$feature.KURZTEXT"},
      labelPlacement: "above-center",
      symbol: {
        type: "text",
        color: [100, 100, 100],
        haloSize: 1,
        haloColor: [255, 255, 255, 0.9]
      }
    })
  ]
});

miniMap.add(citiesLayer);

/**
 * Initialize application
 */
const map = new ArcGISWebScene({
  portalItem: {
    id: "eec4efdf5aef4971abd0bb6b69827522"
  }
});

const graphicsLayer = new GraphicsLayer({
  elevationInfo: {
    mode: "on-the-ground"
  }
});

const view = new SceneView({
  map,
  container: 'viewDiv',
  qualityProfile: "high"
});

request("./assets/data/hike_01_01_2020.tcx", {
  responseType: "xml"
}).then(function(response){
  const data = tcx(response.data) ;
  const geometry = new Polyline({
    paths: data.features[0].geometry.coordinates,
    hasZ: false,
    spatialReference: {
      wkid: 4326
    }
  });

  const graphic = new Graphic({
    geometry: geometry
  });

  graphicsLayer.add(graphic);

  map.add(graphicsLayer);
  view.when(function() {
    view.goTo({
      position: [
        7.66570611,
        46.48383810,
        3424.75347
      ],
      heading: 205.25,
      tilt: 72.51
    });
  });

  function generateSymbol(svgURL, color) {
    return {
      type: "point-3d",
      symbolLayers: [
        {
          type: "icon",
          resource: { primitive: "circle" },
          material: {
            color: color
          },
          outline: {
            color: "white",
            size: 1
          },
          size: 20
        },
        {
          type: "icon",
          resource: { href: svgURL },
          material: {
            color: "white"
          },
          size: 10
        }
      ],
      verticalOffset: {
        screenLength: 40,
        maxWorldLength: 500000,
        minWorldLength: 0
      },
      callout: {
        type: "line",
        size: 1.5,
        color: [255, 255, 255, 1],
        border: {
          color: [100, 100, 100]
        }
      }
    }
  }

  const popupExpression = `
    var urlPart1 = "https://services2.arcgis.com/cFEFS0EWrhfDeVw9/arcgis/rest/services/Hiking_POI/FeatureServer/0/"
    var objectID = $feature.OBJECTID
    var urlPart2 = "/attachments/"
    var attachID = 0;
    if (Count(Attachments($feature)) > 0) {
      attachID = (First(Attachments($feature))).id
    }
    return urlPart1 + objectID + urlPart2 + attachID
  `

  const picturesLayer = new FeatureLayer({
    url: "https://services2.arcgis.com/cFEFS0EWrhfDeVw9/arcgis/rest/services/Hiking_POI/FeatureServer",
    elevationInfo: {
      mode: "relative-to-ground",
    },
    definitionExpression: "Class = 'picture'",
    popupTemplate: {
      expressionInfos: [{
        name: "image",
        expression: popupExpression
      }],
      content: "<img src='{expression/image}'%'>",
      lastEditInfoEnabled: false
    },
    screenSizePerspectiveEnabled: false,
    renderer: {
      type: "simple",
      symbol: generateSymbol("https://static.arcgis.com/arcgis/styleItems/Icons/web/resource/Landmark.svg", [100, 100, 100])
    }
  });

  map.add(picturesLayer);

  const hikingPOI = new FeatureLayer({
    url: "https://services2.arcgis.com/cFEFS0EWrhfDeVw9/arcgis/rest/services/Hiking_POI/FeatureServer",
    elevationInfo: {
      mode: "relative-to-ground",
    },
    definitionExpression: "Class <> 'picture'",
    screenSizePerspectiveEnabled: false,
    labelingInfo: [
      new LabelClass({
        labelExpressionInfo: { expression: "$feature.Name"},
        symbol: {
          type: "label-3d",
          symbolLayers: [{
            type: "text",
            material: {
              color: [255, 255, 255, 0.9]
            },
            halo: {
              size:  1,
              color: [27, 53, 94]
            },
            font: {
              size:  10,
              family: "sans-serif"
            }
          }]
        }
      })
    ],
    renderer: {
        type: "unique-value",
        field: "Class",
        defaultSymbol: {
          type: "point-3d",
          symbolLayers: [
            {
              type: "icon",
              resource: { primitive: "circle" },
              material: {
                color: "white"
              },
              size: 0.1
            }]
        },
        uniqueValueInfos: [
          {
            value: "restaurant",
            symbol: generateSymbol("https://static.arcgis.com/arcgis/styleItems/Icons/web/resource/Restaurant.svg", lightBrown)
          },
          {
            value: "bus",
            symbol: generateSymbol("https://static.arcgis.com/arcgis/styleItems/Icons/web/resource/Bus.svg", lightBlue)
          },
          {
            value: "cable car",
            symbol: generateSymbol("https://static.arcgis.com/arcgis/styleItems/Icons/web/resource/AerialTram.svg", lightBlue)
          }
        ]
      }
  });

  map.add(hikingPOI);

  new ElevationProfile({
    view: view,
    container: "profile",
    input: graphic,
    profiles: [{
      type: "ground",
      color: "orange"
    }],
    visibleElements: {
      legend: false,
      sketchButton: false,
      selectButton: false
    }
  });
});

const viewpoints = {
  trainStation: {
    position: [
      7.66371179,
      46.50680737,
      1944.91065
    ],
    heading: 153.80,
    tilt: 66.63
  },
  cableCar: {
    position: [
      7.66950766,
      46.48476542,
      1570.19567
    ],
    heading: 207.12,
    tilt: 75.00
  },
  bergRestaurant: {
    position: [
      7.65150784,
      46.45879114,
      1954.86814
    ],
    heading: 219.39,
    tilt: 77.12
  },
  berghotelSchwarenbach: {
    position: [
      7.63867205,
      46.44178047,
      2829.83936
    ],
    heading: 221.31,
    tilt: 66.06
  }
}


const viewpointBtns = document.getElementsByClassName("viewpointBtn");

for (let i = 0; i < viewpointBtns.length; i++) {
  const elem = viewpointBtns.item(i);
  elem.addEventListener("click", function(event) {
    view.goTo(viewpoints[event.target.dataset.value]);
  });
}

const mqDesktop = window.matchMedia("(min-width: 681px)");

setCorrectPadding(mqDesktop);
mqDesktop.addEventListener("change", setCorrectPadding);

function setCorrectPadding(mq) {
  if (mq.matches) {
    view.padding = {
      left: 420,
      bottom: 0
    }
  } else {
    const height = document.body.clientHeight;
    const percentageHeight = 4/10 * height;
    view.padding = {
      left: 0,
      bottom: percentageHeight
    }
  }
}
