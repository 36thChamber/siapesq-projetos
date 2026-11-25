library(tidyr)
library(rgbif)
library(dplyr)

# Função para baixar, filtrar e salvar dados de ocorrência de uma espécie a partir do GBIF
process_gbif_data <- function(species_name,
                              lon_range = c(-180,180), # Faixa de longitude para filtrar ocorrências
                              lat_range = c(-90, 90), # Faixa de latitude para filtrar ocorrências
                              year_range = c(2000, 2024), # Faixa de anos de interesse
                              output_dir = getwd(), # Diretório onde o arquivo CSV será salvo
                              limit=5000) { # Limite máximo de registros a serem baixados
  
  # Baixa dados de ocorrência da espécie informada, com coordenadas e dentro dos limites geográficos
  print("Procurando ocorrencias...")
  gbif_data <- occ_data(scientificName = species_name, hasCoordinate = TRUE,
                        decimalLongitude = paste(lon_range, collapse=","), 
                        decimalLatitude = paste(lat_range, collapse=","),
                        limit=limit)
  
  print("Ocorrencias Encontradas:")
  # Exibe as primeiras linhas dos dados brutos baixados para inspeção
  print(head(gbif_data$data))
  
  # Cria subset de interesse
  species_coords <- gbif_data$data[, c("decimalLongitude", "decimalLatitude", "year","day","month")]
  str(species_coords)
  
  # Define work dir
  setwd(output_dir)
  
  # Filtra os dados por faixa de anos e remove linhas com valores ausentes (NA)
  species_filtered <- species_coords %>% 
    filter(.data$year >= year_range[1] & .data$year <= year_range[2]) %>%
    drop_na(decimalLongitude, decimalLatitude,year,day,month)
  
  # Remove ocorrências duplicadas com base nas colunas principais
  unique_species <- species_filtered[!duplicated(species_filtered[, c("decimalLongitude", "decimalLatitude","year","day","month")]), ]
  
  # Adiciona a coluna com o nome da espécie
  unique_species$species <- species_name
  
  # Define o nome do arquivo de saída
  # Salva o arquivo CSV com nome da especie no wd
  output_file <- paste0(gsub(" ", "_", species_name), "_GBIF_Data.csv")
  write.csv(unique_species, output_file, row.names = FALSE)
}


# saltatrix decimalLongitude = "-90, 55", decimalLatitude = "-60, 40"
process_gbif_data("Pomatomus saltatrix",
                  lon_range = c(-90, 55),
                  lat_range = c(-60, 40),
                  limit = 10000)
