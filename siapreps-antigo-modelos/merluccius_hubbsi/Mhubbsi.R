library(rgbif)

library(maps)
library(dplyr)
library(dismo)
library(installr)
library(sdmpredictors)
library(sdm)
library(writexl)
library(readxl)

myspecies <- c("Merluccius hubbsi")

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

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/merluccius_hubbsi")

## Escrevrendo planilha nova em csv
#write.csv(myspecies_coords, "gbif_Mhubbsi.csv")

#Mhubbsi_import = read.csv('gbif_Mhubbsi', h= T)

dim(myspecies_coords)

Mhubbsi= dplyr::select(myspecies_coords, decimalLongitude, decimalLatitude, year)

dim(Mhubbsi)


Mhubbsi_ajust = Mhubbsi%>% filter(year >= 2000 & year <= 2014) 

dim(Mhubbsi_ajust)

Mhubbsi_ajust = tidyr::drop_na(Mhubbsi_ajust, decimalLongitude, decimalLatitude, year)

dim(Mhubbsi_ajust)

Mhubbsi_aj_dup = duplicated(Mhubbsi_ajust[,c("decimalLongitude","decimalLatitude")])#tirand dados duplicados

Merlu_geo = Mhubbsi_ajust[!Mhubbsi_aj_dup,]
write_xlsx(Merlu_geo ,"Mhubbsi_OcorrData.xlsx")
coordinates(Merlu_geo) <- ~decimalLongitude+decimalLatitude 

#####====> Importar Variáveis Ambientais #################################  ###########################
############

library(raster)

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/preditores")

f <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/preditores", pattern='tif$', full.names=TRUE)


r <- lapply(f, raster)


bio_presente <- stack(f)

r.Merlu= raster(Merlu_geo)
res(r.Merlu) <- res(bio_presente)
res(r.Merlu)

crs(r.Merlu) <- crs(bio_presente)

#grid sample
Merlugrid <- gridSample(Merlu_geo, r.Merlu, n=1)
Merlugrid

Merlu1= as.data.frame(Merlugrid)

Merlu1$species= 1

Merlu2= Merlu1[,c("decimalLongitude","decimalLatitude","species")]

#transformando de novo em pontos
coordinates(Merlu2) <- ~decimalLongitude+decimalLatitude
crs(Merlu2) <- crs(bio_presente)
class(Merlu2)

#plot(bio_presente[[2]])
#points(Merlu2)

# cortando raster de variavéis ambientais (presente)


Atl.sul<-extent(c(-90, 55, -60, 40))
bio_presente.Atl.sul= crop(bio_presente,Atl.sul)

### Fazendo Resample nas dimensoes dos dados

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)


names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")


bio_presente.Atl.sul_resampled <- resample(bio_presente.Atl.sul, bio_presente_cop, method = "bilinear")


#### Gerando modelos de Distribuição de espécies  ########################  ###################

DadospMod = sdmData(species~.,
                    train = Merlu2,
                    predictors = bio_presente.Atl.sul_resampled, #bio_presente faria o modelo para variaveis abioticas de todo o globo
                    bg=list(n=1000, method= 'gRandom', remove= TRUE)) #LEMBRAR em bg=list n < 100% do  nuemro de pontos de ocorrencia extraidos do gbif  #method= 'gRandom' , 'eRandom'

modeloMhubbsi<- sdm(species~., DadospMod, methods = c('rf'),  #GLM, BRT, GAM, SVM, ANN, SVM, CART, MARS, MAD, ENFA, maxent, maxlike, 
                      replication=c('boot'),n=2)

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/merluccius_hubbsi")

write.sdm(modeloMhubbsi,"Modelo_Mhubbsi")

modeloMhubbsi

getModelInfo(modeloMhubbsi)
roc(modeloMhubbsi, smooth = TRUE)

