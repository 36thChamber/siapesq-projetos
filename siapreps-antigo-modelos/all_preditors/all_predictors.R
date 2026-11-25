library(rgbif)
library(maps)
library(dismo)
library(installr)
library(readxl)
library(magrittr)
library(raster)
library(mapview)
library(shiny)
library(sdmpredictors)
library(sdm)
library(dismo)
library(usdm)
library(dplyr)
library(sp)
library(gbm)
library(leaflet)
library(randomForest)
library(tidyr)
library(nnet)
library(neuralnet)
library(gbm)
library(mda)
library(htmlwidgets)
library(webshot)
library(rmarkdown)

#Xiphias gladius

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/xiphias_gladius")

modeloXgladius <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/xiphias_gladius/Xgladius.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloXgladius, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3, filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/xiphias_gladius/xiphias_gladius.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Engraulis anchoita

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/engraulis_anchoita")

modeloEanchoita <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/engraulis_anchoita/Modelo_Eanchoita.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloEanchoita, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3, filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/engraulis_anchoita/engraulis_anchoita.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Genidens barbus
setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/genidens_barbus")

modeloGbarbus <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/genidens_barbus/Modelo_Gbarbus.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloXgladius, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3, filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/genidens_barbus/genidens_barbus.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Merluccius hubbsi

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/merluccius_hubbsi")

modeloMhubbsi <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/merluccius_hubbsi/Modelo_Mhubbsi.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloMhubbsi, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3, filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/merluccius_hubbsi/merluccius_hubbsi.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Micropogonia funieri

#setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/micropogonia_funieri")

#modeloXgladius <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/genidens_barbus/Mfunieri.sdm")

#setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

#nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
#r <- lapply(nc_files, raster)
#bio_presente_cop <- stack(r)
#names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

#predictTeste3 = predict(modeloXgladius, bio_presente_cop, meant= T, na.rm= T)

#writeRaster(predictTeste3[[3]], filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/micropogonia_funieri/micropogonia_funieri.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Pomatomus saltatrix

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/pomatomus_saltatrix")

modeloPsaltatrix <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/pomatomus_saltatrix/Modelo_Psaltatrix.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloPsaltatrix, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3, filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/pomatomus_saltatrix/pomatomus_saltatrix.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Sardinella brasiliensis

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/sardinella_brasiliensis")

modeloXgladius <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/genidens_barbus/Sbrasiliensis.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloXgladius, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3[[3]], filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/sardinella_brasiliensis/sardinella_brasiliensis.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Thunnus alalunga

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_alalunga")

modeloTalalunga <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_alalunga/Modelo_Talalunga.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloTalalunga, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3, filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_alalunga/thunnus_alalunga.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Thunnus albacares

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_albacares")

modeloTalbacares <- read.sdm("CC:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_albacares/Modelo_Talbacares.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloTalbacares, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3, filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_albacares/thunnus_albacares.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Thunnus obesus

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_obesus")

modeloTobesus <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_obesus/Tobesus.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloTobesus, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3, filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_obesus/thunnus_obesus.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")

#Urophycis brasiliensis

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/urophycis_brasiliensis")

modeloUbrasiliensis <- read.sdm("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/urophycis_brasiliensis/Ubrasiliensis.sdm")

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)
names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")

predictTeste3 = predict(modeloUbrasiliensis, bio_presente_cop, meant= T, na.rm= T)

writeRaster(predictTeste3 filename = "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/urophycis_brasiliensis/urophycis_brasiliensis.tif", format = "GTiff", overwrite = TRUE, datatype = "FLT4S")
