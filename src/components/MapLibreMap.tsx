"use client";

import React, { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapMarker = {
  coord: [number, number];
  popupText?: string;
};

type MapLibreMapProps = {
  center: [number, number];
  zoom?: number;
  styleUrl?: string;
  markers?: MapMarker[];
  line?: [number, number][];
  height?: number | string;
};

const MapLibreMap: React.FC<MapLibreMapProps> = ({
  center,
  zoom = 12,
  styleUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  markers,
  line,
  height = "300px",
}) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map>();

  // initialize map once
  useEffect(() => {
    if (map.current || !container.current) return;

    map.current = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [styleUrl],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [center[1], center[0]],
      zoom,
    });

    return () => {
      map.current?.remove();
    };
  }, [center, zoom, styleUrl]);

  // add or update markers and route line once style is loaded
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const applyFeatures = () => {
      // clear existing route source/layer if present
      if (m.getLayer("route-layer")) {
        m.removeLayer("route-layer");
      }
      if (m.getSource("route")) {
        m.removeSource("route");
      }

      // add markers
      markers?.forEach(({ coord, popupText }) => {
        const el = document.createElement("div");
        el.className = "marker bg-red-600 rounded-full w-4 h-4 border-2 border-white";
        const marker = new maplibregl.Marker(el).setLngLat([coord[1], coord[0]]);
        if (popupText) {
          marker.setPopup(new maplibregl.Popup().setText(popupText));
        }
        marker.addTo(m);
      });

      // add line if provided
      if (line) {
        m.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: line.map(([lat, lng]) => [lng, lat]),
            },
            properties: {},
          },
        });
        m.addLayer({
          id: "route-layer",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#0074D9",
            "line-width": 4,
          },
        });
      }
    };

    if (!m.isStyleLoaded()) {
      m.once("load", applyFeatures);
    } else {
      applyFeatures();
    }
  }, [markers, line]);

  return <div ref={container} style={{ width: "100%", height }} />;
};

export default MapLibreMap;