library(rgbif)
library(maps)
library(dplyr)
library(dismo)
library(installr)
library(sdmpredictors)
library(sdm)
library(writexl)
library(readxl)

#myspecies <- c("Engraulis anchoita")

#gbif_data <- occ_data(scientificName = myspecies, hasCoordinate = TRUE, limit = 20000)
#View(gbif_data)
#dim(gbif_data)

#gbif_data <- occ_data(scientificName = myspecies, hasCoordinate = TRUE, limit = 20000, decimalLongitude = "-90, 55", decimalLatitude = "-60, 40")  # note that coordinate ranges must be specified this way: "smaller, larger" (e.g. "-5, -2")
#gbif_data

#names(gbif_data)
#names(gbif_data$meta)
#names(gbif_data$data)

#--> Selecionando variáveis de interesse
#myspecies_coords <- gbif_data$data[ , c("decimalLongitude", "decimalLatitude", "year")]
#head(myspecies_coords)

setwd("/workspace/map-api/engraulis_anchoita")

## Escrevrendo planilha nova em csv
#write.csv(myspecies_coords, "gbif_Eanchoita.csv")

#Eanchoita_import = read.csv('gbif_Eanchoita', h= T)

Eanchoitai_import = read.csv('Engraulis_anchoita_SibbrOcurrenceData.csv', h= T)

myspecies_coords <- Eanchoitai_import[ , c("decimalLongitude", "decimalLatitude", "year")]
head(myspecies_coords)

View(Eanchoitai_import)

dim(myspecies_coords)

Eanchoitai = dplyr::select(myspecies_coords, decimalLongitude, decimalLatitude, year)

dim(Eanchoitai)


Eanchoitai_ajust = Eanchoitai %>% filter(year >= 2000 & year <= 2014) 

dim(Eanchoitai_ajust)

Eanchoitai_ajust = tidyr::drop_na(Eanchoitai_ajust, decimalLongitude, decimalLatitude, year)

dim(Eanchoitai_ajust)

Eanchoitai_aj_dup = duplicated(Eanchoitai_ajust[,c("decimalLongitude","decimalLatitude")])#tirand dados duplicados

Engra_geo = Eanchoitai_ajust[!Eanchoitai_aj_dup,]

write_xlsx(Engra_geo ,"Eanchoitai_OcorrData.xlsx") #Escrevendo planilha de info

dim(Engra_geo)

coordinates(Engra_geo) <- ~decimalLongitude+decimalLatitude  

#####====> Importar Variáveis Ambientais #################################  ###########################
############

library(raster)

Engra_geo <- read_excel("/workspace/map-api/engraulis_anchoita/Eanchoitai_OcorrData.xlsx", sheet = 1)

coordinates(Engra_geo) <- ~decimalLongitude+decimalLatitude 

setwd("/workspace/map-api/preditores")

f <- list.files(path="/workspace/map-api/preditores", pattern='tif$', full.names=TRUE)


r <- lapply(f, raster)


bio_presente <- stack(f)

r.Engra= raster(Engra_geo)
res(r.Engra) <- res(bio_presente)
res(r.Engra)

crs(r.Engra) <- crs(bio_presente)

#grid sample
Engragrid <- gridSample(Engra_geo, r.Engra, n=1)
Engragrid

Engra1= as.data.frame(Engragrid)

Engra1$species= 1

Engra2= Engra1[,c("decimalLongitude","decimalLatitude","species")]

#transformando de novo em pontos
coordinates(Engra2) <- ~decimalLongitude+decimalLatitude
crs(Engra2) <- crs(bio_presente)
class(Engra2)

#plot(bio_presente[[2]])
#points(Engra2)

# cortando raster de variavéis ambientais (presente)


Atl.sul<-extent(c(-90, 55, -60, 40))
bio_presente.Atl.sul= crop(bio_presente,Atl.sul)


### Fazendo Resample nas dimensoes dos dados

setwd("/workspace/map-api")

nc_files <- list.files(path="/workspace/map-api/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)

plot(r)
bio_presente_cop <- stack(r)


names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean", "MS_bathymetry")


bio_presente.Atl.sul_resampled <- resample(bio_presente.Atl.sul, bio_presente_cop, method = "bilinear")


#### Gerando modelos de Distribuição de espécies  ########################  ###################

DadospMod = sdmData(species~.,
                    train = Engra2,
                    predictors = bio_presente.Atl.sul_resampled, #bio_presente faria o modelo para variaveis abioticas de todo o globo
                    bg=list(n=1000, method= 'gRandom', remove= TRUE)) #LEMBRAR em bg=list n < 100% do  nuemro de pontos de ocorrencia extraidos do gbif  #method= 'gRandom' , 'eRandom'

modeloEanchoita<- sdm(species~., DadospMod, methods = c('rf'),  #GLM, BRT, GAM, SVM, ANN, SVM, CART, MARS, MAD, ENFA, maxent, maxlike, 
                        replication=c('boot'),n=2)

setwd("/workspace/map-api/engraulis_anchoita")

write.sdm(modeloEanchoita,"Modelo_Eanchoita")

modeloEanchoita

getModelInfo(modeloEanchoita)
roc(modeloEanchoita, smooth = TRUE)

