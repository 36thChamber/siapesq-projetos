library(rgbif)
library(maps)
library(dplyr)
library(dismo)
library(installr)
library(sdmpredictors)
library(sdm)
library(writexl)
library(readxl)
myspecies <- c("Mugil liza")

#gbif_data <- occ_data(scientificName = myspecies, hasCoordinate = TRUE, limit = 20000)
#View(gbif_data)
#dim(gbif_data)

gbif_data <- occ_data(scientificName = myspecies, hasCoordinate = TRUE, limit = 20000, decimalLongitude = "-90, 55", decimalLatitude = "-60, 40")  # note that coordinate ranges must be specified this way: "smaller, larger" (e.g. "-5, -2")
gbif_data

names(gbif_data)
names(gbif_data$meta)
names(gbif_data$data)

#--> Selecionando variáveis de interesse
myspecies_coords <- gbif_data$data[ , c("decimalLongitude", "decimalLatitude", "year")]
head(myspecies_coords)

setwd("/workspace/map-api/mugil_liza")

## Escrevrendo planilha nova em csv
#write.csv(myspecies_coords, "gbif_Mliza.csv")

#Mliza_import = read.csv('gbif_Mliza', h= T)

dim(myspecies_coords)

Mliza = dplyr::select(myspecies_coords, decimalLongitude, decimalLatitude, year)

dim(Mliza)


Mliza_ajust = Mliza %>% filter(year >= 2000 & year <= 2014) 

dim(Mliza_ajust)

Mliza_ajust = tidyr::drop_na(Mliza_ajust, decimalLongitude, decimalLatitude, year)

dim(Mliza_ajust)

Mliza_aj_dup = duplicated(Mliza_ajust[,c("decimalLongitude","decimalLatitude")])#tirand dados duplicados

Mugil_geo = Mliza_ajust[!Mliza_aj_dup,]
write_xlsx(Mugil_geo ,"Mliza_OcorrData.xlsx") 
coordinates(Mugil_geo) <- ~decimalLongitude+decimalLatitude 

#####====> Importar Variáveis Ambientais #################################  ###########################
############

library(raster)

setwd("/workspace/map-api/preditores")

f <- list.files(path="/workspace/map-api/preditores", pattern='tif$', full.names=TRUE)


r <- lapply(f, raster)


bio_presente <- stack(f)

r.Mugil= raster(Mugil_geo)
res(r.Mugil) <- res(bio_presente)
res(r.Mugil)

crs(r.Mugil) <- crs(bio_presente)

#grid sample
Mugilgrid <- gridSample(Mugil_geo, r.Mugil, n=1)
Mugilgrid

Mugil1= as.data.frame(Mugilgrid)

Mugil1$species= 1

Mugil2= Mugil1[,c("decimalLongitude","decimalLatitude","species")]

#transformando de novo em pontos
coordinates(Mugil2) <- ~decimalLongitude+decimalLatitude
crs(Mugil2) <- crs(bio_presente)
class(Mugil2)

#plot(bio_presente[[2]])
#points(Mugil2)

# cortando raster de variavéis ambientais (presente)


Atl.sul<-extent(c(-90, 55, -60, 40))
bio_presente.Atl.sul= crop(bio_presente,Atl.sul)

#v1 = vifstep(bio_presente.Atl.sul,th=7 )

### Fazendo Resample nas dimensoes dos dados

setwd("/workspace/map-api")

nc_files <- list.files(path="/workspace/map-api/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)


names(bio_presente_cop) <- c("MS_bathymetry", "Surface.Salinity.Mean", "Surface.Temperature.Mean")

bio_presente.Atl.sul_resampled <- resample(bio_presente.Atl.sul, bio_presente_cop, method = "bilinear")


#### Gerando modelos de Distribuição de espécies  ########################  ###################

DadospMod = sdmData(species~.,
                    train = Mugil2,
                    predictors = bio_presente.Atl.sul_resampled, #bio_presente faria o modelo para variaveis abioticas de todo o globo
                    bg=list(n=2000, method= 'gRandom', remove= TRUE)) #LEMBRAR em bg=list n < 100% do  nuemro de pontos de ocorrencia extraidos do gbif  #method= 'gRandom' , 'eRandom'

modeloMliza <- sdm(species~., DadospMod, methods = c('rf'),  #ANN, SVM, CART, MARS, MAD, ENFA, maxent, maxlike, 
                       replication=c('boot'),n=2)

setwd("/workspace/map-api/mugil_liza")

write.sdm(modeloMliza,"Modelo_Mliza", overwrite = TRUE)

