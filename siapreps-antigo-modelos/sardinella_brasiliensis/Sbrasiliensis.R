library(rgbif)
library(maps)
library(dplyr)
library(dismo)
library(installr)
library(sdmpredictors)
library(sdm)
library(writexl)
library(readxl)

myspecies <- c("Sardinella brasiliensis")

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

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/sardinella_brasiliensis")

## Escrevrendo planilha nova em csv
#write.csv(myspecies_coords, "gbif_Sbrasiliensis.csv")

#Sbrasiliensis_import = read.csv('gbif_Sbrasiliensis', h= T)

dim(myspecies_coords)

Sbrasiliensis= dplyr::select(myspecies_coords, decimalLongitude, decimalLatitude, year)

dim(Sbrasiliensis)


Sbrasiliensis_ajust = Sbrasiliensis%>% filter(year >= 2000 & year <= 2014) 

dim(Sbrasiliensis_ajust)

Sbrasiliensis_ajust = tidyr::drop_na(Sbrasiliensis_ajust, decimalLongitude, decimalLatitude, year)

dim(Sbrasiliensis_ajust)

Sbrasiliensis_aj_dup = duplicated(Sbrasiliensis_ajust[,c("decimalLongitude","decimalLatitude")])#tirand dados duplicados

Sardi_geo = Sbrasiliensis_ajust[!Sbrasiliensis_aj_dup,]
write_xlsx(Sardi_geo ,"Sbrasiliensis_OcorrData.xlsx")

# APÓS ATUALIZAÇÕES NA PLANILHA DE OCORRENCIAS RODAR A PARTIR DAQUI

#path <- "C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/sardinella_brasiliensis"

#Sardi_geo <- read_xlsx("Sbrasiliensis_OcurrData.xlsx")
#Sardi_geo <- read_excel(path, "Sbrasiliensis_OcurrData.xlsx")


#datasets <- readxl_example("Sbrasiliensis_OcurrData.xlsx")
#read_excel(datasets)

coordinates(Sardi_geo) <- ~decimalLongitude+decimalLatitude 

#####====> Importar Variáveis Ambientais #################################  ###########################
############

library(raster)

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/preditores")

f <- list.files(path="C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/preditores", pattern='tif$', full.names=TRUE)


r <- lapply(f, raster)


bio_presente <- stack(f)

r.Sardi= raster(Sardi_geo)
res(r.Sardi) <- res(bio_presente)
res(r.Sardi)

crs(r.Sardi) <- crs(bio_presente)

#grid sample
Sardigrid <- gridSample(Sardi_geo, r.Sardi, n=1)
Sardigrid

Sardi1= as.data.frame(Sardigrid)

Sardi1$species= 1

Sardi2= Sardi1[,c("decimalLongitude","decimalLatitude","species")]

#transformando de novo em pontos
coordinates(Sardi2) <- ~decimalLongitude+decimalLatitude
crs(Sardi2) <- crs(bio_presente)
class(Sardi2)

#plot(bio_presente[[2]])
#points(Sardi2)

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
                    train = Sardi2,
                    predictors = bio_presente.Atl.sul_resampled, #bio_presente faria o modelo para variaveis abioticas de todo o globo
                    bg=list(n=1000, method= 'gRandom', remove= TRUE)) #LEMBRAR em bg=list n < 100% do  nuemro de pontos de ocorrencia extraidos do gbif  #method= 'gRandom' , 'eRandom'

modeloSbrasiliensis<- sdm(species~., DadospMod, methods = c('rf'),  #GLM, BRT, GAM, SVM, ANN, SVM, CART, MARS, MAD, ENFA, maxent, maxlike, 
                       replication=c('boot'),n=2)

setwd("C:/Users/user/OneDrive/Documentos/R/Plat_siapesq/sardinella_brasiliensis")

write.sdm(modeloSbrasiliensis,"Modelo_Sbrasiliensis")

modeloSbrasiliensis

getModelInfo(modeloSbrasiliensis)
roc(modeloSbrasiliensis, smooth = TRUE)
