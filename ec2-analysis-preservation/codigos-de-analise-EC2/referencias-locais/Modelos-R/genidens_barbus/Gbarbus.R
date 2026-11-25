library(rgbif)
library(maps)
library(dplyr)
library(dismo)
library(installr)
library(sdmpredictors)
library(sdm)
library(writexl)
library(readxl)

myspecies <- c("Genidens barbus")


gbif_data <- occ_data(scientificName = myspecies, hasCoordinate = TRUE, limit = 20000, decimalLongitude = "-90, 55", decimalLatitude = "-60, 40")  # note that coordinate ranges must be specified this way: "smaller, larger" (e.g. "-5, -2")
gbif_data

names(gbif_data)
names(gbif_data$meta)
names(gbif_data$data)

#--> Selecionando variáveis de interesse
myspecies_coords <- gbif_data$data[ , c("decimalLongitude", "decimalLatitude", "year")]
head(myspecies_coords)

setwd("/workspace/map-api/genidens_barbus")

## Escrevrendo planilha nova em csv
#write.csv(myspecies_coords, "gbif_Gbarbus.csv")

#Gbarbus_import = read.csv('gbif_Gbarbus', h= T)

dim(myspecies_coords)

Gbarbus= dplyr::select(myspecies_coords, decimalLongitude, decimalLatitude, year)

dim(Gbarbus)


Gbarbus_ajust = Gbarbus%>% filter(year >= 2000 & year <= 2014) 

dim(Gbarbus_ajust)

Gbarbus_ajust = tidyr::drop_na(Gbarbus_ajust, decimalLongitude, decimalLatitude, year)

dim(Gbarbus_ajust)

Gbarbus_aj_dup = duplicated(Gbarbus_ajust[,c("decimalLongitude","decimalLatitude")])#tirand dados duplicados

Genid_geo = Gbarbus_ajust[!Gbarbus_aj_dup,]
write_xlsx(Genid_geo ,"Gbarbus_OcorrData.xlsx")

# APÓS ATUALIZAÇÕES NA PLANILHA DE OCORRENCIAS RODAR A PARTIR DAQUI

#path <- "/workspace/map-api/genidens_barbus"

#Genid_geo <- read_xlsx("Gbarbus_OcurrData.xlsx")
#Genid_geo <- read_excel(path, "Gbarbus_OcurrData.xlsx")


#datasets <- readxl_example("Gbarbus_OcurrData.xlsx")
#read_excel(datasets)

coordinates(Genid_geo) <- ~decimalLongitude+decimalLatitude 

#####====> Importar Variáveis Ambientais #################################  ###########################
############

library(raster)

f <- list.files(path="/workspace/map-api/preditores", pattern='tif$', full.names=TRUE)


r <- lapply(f, raster)


bio_presente <- stack(f)

plot(bio_presente)

r.Genid= raster(Genid_geo)
res(r.Genid) <- res(bio_presente)
res(r.Genid)

crs(r.Genid) <- crs(bio_presente)

#grid sample
Genidgrid <- gridSample(Genid_geo, r.Genid, n=1)
Genidgrid

Genid1= as.data.frame(Genidgrid)

Genid1$species= 1

Genid2= Genid1[,c("decimalLongitude","decimalLatitude","species")]

#transformando de novo em pontos
coordinates(Genid2) <- ~decimalLongitude+decimalLatitude
crs(Genid2) <- crs(bio_presente)
class(Genid2)

#plot(bio_presente[[2]])
#points(Genid2)

# cortando raster de variavéis ambientais (presente)


Atl.sul<-extent(c(-90, 55, -60, 40))
bio_presente.Atl.sul= crop(bio_presente,Atl.sul)

#v1 = vifstep(bio_presente.Atl.sul,th=7 )

### Fazendo Resample nas dimensoes dos dados

setwd("/workspace/map-api")

nc_files <- list.files(path="/workspace/map-api/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)

bio_presente_cop <- stack(r)

plot(bio_presente_cop)

names(bio_presente_cop) <- c("MS_bathymetry", "Surface.Salinity.Mean", "Surface.Temperature.Mean")

plot(bio_presente_cop)

bio_presente.Atl.sul_resampled <- resample(bio_presente.Atl.sul, bio_presente_cop, method = "bilinear")


#### Gerando modelos de Distribuição de espécies  ########################  ###################

DadospMod = sdmData(species~.,
                    train = Genid2,
                    predictors = bio_presente.Atl.sul_resampled, #bio_presente faria o modelo para variaveis abioticas de todo o globo
                    bg=list(n=1000, method= 'gRandom', remove= TRUE)) #LEMBRAR em bg=list n < 100% do  nuemro de pontos de ocorrencia extraidos do gbif  #method= 'gRandom' , 'eRandom'

modeloGbarbus<- sdm(species~., DadospMod, methods = c('rf'),  #GLM, BRT, GAM, SVM, ANN, SVM, CART, MARS, MAD, ENFA, maxent, maxlike, 
                          replication=c('boot'),n=2)

setwd("/workspace/map-api/genidens_barbus")

write.sdm(modeloGbarbus,"Modelo_Gbarbus", overwrite = TRUE)

modeloGbarbus

getModelInfo(modeloGbarbus)
roc(modeloGbarbus, smooth = TRUE)
