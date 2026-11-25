#!/usr/bin/env python3

import pandas as pd
import folium
import argparse

def run_cmd(args:argparse.Namespace):
    csv=args.csv
    out=args.html
    data = pd.read_csv(csv)
    latitude = data['decimalLatitude']
    longitude = data['decimalLongitude']
    sp = data['sp']
    map_center = [latitude.mean(), longitude.mean()]
    mymap = folium.Map(location=map_center, zoom_start=6)
    for lat, lon, sp_value in zip(latitude, longitude, sp):
        color = 'red' if sp_value == 1 else 'blue'
        folium.CircleMarker(
            location=[lat, lon],
            radius=5,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.6
        ).add_to(mymap)
    mymap.save(out)

def main():
    parser = argparse.ArgumentParser(description='Generate Map with occurrences')
    parser.add_argument('--csv', type=str, help='CSV file with occurrences and pseudo absences')
    parser.add_argument('--html',type=str,help='HTML file to save the map',default='map.html',required=False)
    args = parser.parse_args()
    run_cmd(args)

if __name__ == "__main__":
    main()