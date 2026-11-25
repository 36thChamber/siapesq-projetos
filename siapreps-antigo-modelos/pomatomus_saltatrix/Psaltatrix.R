library(rgbif)
library(maps)
library(dplyr)
library(dismo)
library(installr)
library(sdmpredictors)
library(sdm)
library(writexl)
library(readxl)

myspecies <- c("Pomatomus saltatrix")

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

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/pomatomus_saltatrix")

## Escrevrendo planilha nova em csv
#write.csv(myspecies_coords, "gbif_Psaltatrix.csv")

#Psaltatrix_import = read.csv('gbif_Psaltatrix', h= T)

dim(myspecies_coords)

Psaltatrix = dplyr::select(myspecies_coords, decimalLongitude, decimalLatitude, year)

dim(Psaltatrix)


Psaltatrix_ajust = Psaltatrix %>% filter(year >= 2000 & year <= 2014) 

dim(Psaltatrix_ajust)

Psaltatrix_ajust = tidyr::drop_na(Psaltatrix_ajust, decimalLongitude, decimalLatitude, year)

dim(Psaltatrix_ajust)

Psaltatrix_aj_dup = duplicated(Psaltatrix_ajust[,c("decimalLongitude","decimalLatitude")])#tirand dados duplicados

Poma_geo = Psaltatrix_ajust[!Psaltatrix_aj_dup,]
write_xlsx(Poma_geo, "Psaltatrix_OcorrData.xlsx") 
coordinates(Poma_geo) <- ~decimalLongitude+decimalLatitude 

#####====> Importar Variáveis Ambientais #################################  ###########################
############

library(raster)

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/preditores")

f <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/preditoress", pattern='tif$', full.names=TRUE)


r <- lapply(f, raster)


bio_presente <- stack(f)

r.Poma= raster(Poma_geo)
res(r.Poma) <- res(bio_presente)
res(r.Poma)

crs(r.Poma) <- crs(bio_presente)

#grid sample
Pomagrid <- gridSample(Poma_geo, r.Poma, n=1)
Pomagrid

Poma1= as.data.frame(Pomagrid)

Poma1$species= 1

Poma2= Poma1[,c("decimalLongitude","decimalLatitude","species")]

#transformando de novo em pontos
coordinates(Poma2) <- ~decimalLongitude+decimalLatitude
crs(Poma2) <- crs(bio_presente)
class(Poma2)

#plot(bio_presente[[2]])
#points(Poma2)

# cortando raster de variavéis ambientais (presente)


Atl.sul<-extent(c(-90, 55, -60, 40))
bio_presente.Atl.sul= crop(bio_presente,Atl.sul)

v1 = vifstep(bio_presente.Atl.sul,th=7 )

### Fazendo Resample nas dimensoes dos dados

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq")

nc_files <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/variables", pattern = "*nc$", full.names = TRUE)
r <- lapply(nc_files, raster)
bio_presente_cop <- stack(r)


names(bio_presente_cop) <- c("Surface.Salinity.Mean", "Surface.Temperature.Mean")


bio_presente.Atl.sul_resampled <- resample(bio_presente.Atl.sul, bio_presente_cop, method = "bilinear")


#### Gerando modelos de Distribuição de espécies  ########################  ###################

DadospMod = sdmData(species~.,
                    train = Poma2,
                    predictors = bio_presente.Atl.sul_resampled, #bio_presente faria o modelo para variaveis abioticas de todo o globo
                    bg=list(n=1000, method= 'gRandom', remove= TRUE)) #LEMBRAR em bg=list n < 100% do  nuemro de pontos de ocorrencia extraidos do gbif  #method= 'gRandom' , 'eRandom'

modeloPsaltatrix <- sdm(species~., DadospMod, methods = c('rf'),  #GLM, BRT, GAM, SVM, ANN, SVM, CART, MARS, MAD, ENFA, maxent, maxlike, 
                      replication=c('boot'),n=2)

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/pomatomus_saltatrix")

write.sdm(modeloPsaltatrix,"Modelo_Psaltatrix")

modeloPsaltatrix

getModelInfo(modeloPsaltatrix)
roc(modeloPsaltatrix, smooth = TRUE)

