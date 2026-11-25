# Carregue a biblioteca ncdf4
library(ncdf4)

setwd("/workspace/map-api/variables")

# Caminho para o arquivo NetCDF que deseja verificar

ncfile <- nc_open("MS_bathymetry[.nc")

plot(ncfile)


#cropar tif original 

setwd("/workspace/map-api/preditores")

library(raster)

f <- list.files(path="/workspace/map-api/preditores/bathy", pattern='tif$', full.names=TRUE)


r <- lapply(f, raster)


bio_presente <- stack(f)

plot(bio_presente)


Atl.sul<-extent(c(-90, 55, -60, 40))
bio_presente.Atl.sul= crop(bio_presente,Atl.sul)

plot(bio_presente.Atl.sul)

#fazendo resample

setwd("/workspace/map-api/variables")

nc_files <- list.files(path="/workspace/map-api/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)

bio_presente_cop <- stack(r)

plot(bio_presente_cop)

names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

bio_presente.Atl.sul_resampled <- resample(bio_presente.Atl.sul, bio_presente_cop, method = "bilinear")

setwd("/workspace/map-api/preditores")

writeRaster(bio_presente.Atl.sul_resampled,"bathy_resampled.tiff") #format= 'raster'
