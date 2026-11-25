#!/bin/bash
DIR="$HOME/map-api"
cd $DIR
source .venv/bin/activate
python variables.py > $HOME/logs_variables.py.log 2>&1

cd variables_CHL
gdal_translate -of GTiff -a_srs EPSG:4326 NETCDF:"SouthAtlanticSal.nc":so SouthAtlanticSal.tif > $HOME/logs_variables-daily-sal.py.log 2>&1
gdal_translate -of GTiff -a_srs EPSG:4326 NETCDF:"SouthAtlanticTemp.nc":thetao SouthAtlanticTemp.tif > $HOME/logs_variables-daily-temp.py.log 2>&1
gdal_translate -of GTiff -a_srs EPSG:4326 NETCDF:"SouthAtlanticChl.nc":chl SouthAtlanticChl.tif > $HOME/logs_variables-daily-chl.py.log 2>&1
gdal_translate -of GTiff -a_srs EPSG:4326 NETCDF:"SouthAtlanticCO2.nc":spco2 SouthAtlanticCO2.tif > $HOME/logs_variables-daily-co2.py.log 2>&1
gdal_translate -of GTiff NETCDF:"MS_bathymetry.nc":__xarray_dataarray_variable__ MS_bathymetry.tif > $HOME/logs_variables-daily-bath.py.log 2>&1
cd ..

cd variables_date
for file in *.nc; do
    [[ "$file" == ".gitkeep" ]] && continue
    type=$(basename "$file" .nc | awk -F'_' '{print $(NF)}')
    case "$type" in
        SouthAtlanticSal)
            var="so"
            ;;
        SouthAtlanticTemp)
            var="thetao"
            ;;
        SouthAtlanticChl)
            var="chl"
            ;;
        SouthAtlanticCO2)
            var="spco2"
            ;;
        *)
            echo "Skipping $file: unknown type '$type'."
            continue
            ;;
    esac
    base="${file%.nc}"
    gdal_translate -of GTiff NETCDF:"$file":"$var" "${base}.tif"
done
cd ..

aws s3 cp dashboard s3://example-bucket --recursive > $HOME/logs_aws.py.log 2>&1
aws s3 cp variables_CHL s3://example-bucket --recursive > $HOME/logs_aws.py.log 2>&1
aws s3 cp variables_date s3://example-bucket --recursive > $HOME/logs_aws.py.log 2>&1
rm *.gri *.grd

cd variables_CHL
rm *.tif
rm SouthAtlanticSal.nc SouthAtlanticTemp.nc SouthAtlanticChl.nc SouthAtlanticCO2.nc
cd ..

cd variables_date
rm *.tif
rm *.nc
cd ..

deactivate
