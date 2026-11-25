import Head from "next/head";
import React, { useEffect } from "react";

import dynamic from "next/dynamic";
 const MapContainer = dynamic(() => import("../mapContainer/mapContainer"), {
   ssr: false,
 });

function Map() {
  return (
    <React.Fragment>
      <Head>
        <title> Navegação - SIAPESQ </title>
        <style>
          {`.leaflet-container {
              height: 100vh;
              width: 100vw;
            }`}
          {`.body,html{
            margin:-8px;
            padding:-8px;
            overflow: hidden;
           user-select:none;

        }`}
        </style>
      </Head>
      <MapContainer />
    </React.Fragment>
  );
}

export default Map;
