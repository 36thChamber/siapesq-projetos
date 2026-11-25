library(rgbif)
library(maps)
library(dplyr)
library(dismo)
library(installr)
library(sdmpredictors)
library(sdm)
library(writexl)
library(readxl)
myspecies <- c("Thunnus alalunga")

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

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_alalunga")

## Escrevrendo planilha nova em csv
#write.csv(myspecies_coords, "gbif_Talalunga.csv")

#Talalunga_import = read.csv('gbif_Talalunga', h= T)

dim(myspecies_coords)

Talalunga = dplyr::select(myspecies_coords, decimalLongitude, decimalLatitude, year)

dim(Talalunga)


Talalunga_ajust = Talalunga %>% filter(year >= 2000 & year <= 2014) 

dim(Talalunga_ajust)

Talalunga_ajust = tidyr::drop_na(Talalunga_ajust, decimalLongitude, decimalLatitude, year)

dim(Talalunga_ajust)

Talalunga_aj_dup = duplicated(Talalunga_ajust[,c("decimalLongitude","decimalLatitude")])#tirand dados duplicados

Thunnus_geo = Talalunga_ajust[!Talalunga_aj_dup,]
write_xlsx(Thunnus_geo ,"Talalunga_OcorrData.xlsx") 
coordinates(Thunnus_geo) <- ~decimalLongitude+decimalLatitude 

#####====> Importar Variáveis Ambientais #################################  ###########################
############

library(raster)

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/preditores")

f <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/preditores", pattern='tif$', full.names=TRUE)


r <- lapply(f, raster)


bio_presente <- stack(f)

r.Thunnus= raster(Thunnus_geo)
res(r.Thunnus) <- res(bio_presente)
res(r.Thunnus)

crs(r.Thunnus) <- crs(bio_presente)

#grid sample
Thunnusgrid <- gridSample(Thunnus_geo, r.Thunnus, n=1)
Thunnusgrid

Thunnus1= as.data.frame(Thunnusgrid)

Thunnus1$species= 1

Thunnus2= Thunnus1[,c("decimalLongitude","decimalLatitude","species")]

#transformando de novo em pontos
coordinates(Thunnus2) <- ~decimalLongitude+decimalLatitude
crs(Thunnus2) <- crs(bio_presente)
class(Thunnus2)

#plot(bio_presente[[2]])
#points(Thunnus2)

# cortando raster de variavéis ambientais (presente)


Atl.sul<-extent(c(-90, 55, -60, 40))
bio_presente.Atl.sul= crop(bio_presente,Atl.sul)

#v1 = vifstep(bio_presente.Atl.sul,th=7 )

### Fazendo Resample nas dimensoes dos dados

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)


names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")


bio_presente.Atl.sul_resampled <- resample(bio_presente.Atl.sul, bio_presente_cop, method = "bilinear")


#### Gerando modelos de Distribuição de espécies  ########################  ###################

DadospMod = sdmData(species~.,
                    train = Thunnus2,
                    predictors = bio_presente.Atl.sul_resampled, #bio_presente faria o modelo para variaveis abioticas de todo o globo
                    bg=list(n=2000, method= 'gRandom', remove= TRUE)) #LEMBRAR em bg=list n < 100% do  nuemro de pontos de ocorrencia extraidos do gbif  #method= 'gRandom' , 'eRandom'

modeloTalalunga <- sdm(species~., DadospMod, methods = c('rf'),  #ANN, SVM, CART, MARS, MAD, ENFA, maxent, maxlike, 
                           replication=c('boot'),n=2)

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/thunnus_alalunga")

write.sdm(modeloTalalunga,"Modelo_Talalunga")

modeloTalalunga

getModelInfo(modeloTalalunga)
roc(modeloTalalunga, smooth = TRUE)
