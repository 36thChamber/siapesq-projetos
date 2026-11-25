from geopy.distance import great_circle

def is_within_radius(lat, lon, sp1_points, radius_km):
    for sp1_lat, sp1_lon in sp1_points:
        if great_circle((lat, lon), (sp1_lat, sp1_lon)).km <= radius_km:
            return True
    return False

def check_radius(row, sp1_points, radius_km):
    lat = row['decimalLatitude']
    lon = row['decimalLongitude']
    return not is_within_radius(lat, lon, sp1_points, radius_km)




# from geopy.distance import great_circle

# # Função auxiliar para manter coordenadas válidas
# def _sanitize_coord(lat, lon):
#     # Corrige possíveis erros numéricos vindos do numpy/pandarallel
#     lat = max(min(float(lat), 89.999999), -89.999999)
#     lon = max(min(float(lon), 179.999999), -179.999999)
#     return lat, lon

# def is_within_radius(lat, lon, sp1_points, radius_km):

#     # Garantir coordenadas válidas antes de usar geopy
#     lat, lon = _sanitize_coord(lat, lon)

#     for sp1_lat, sp1_lon in sp1_points:

#         sp1_lat, sp1_lon = _sanitize_coord(sp1_lat, sp1_lon)

#         if great_circle((lat, lon), (sp1_lat, sp1_lon)).km <= radius_km:
#             return True
    
#     return False

# def check_radius(row, sp1_points, radius_km):
#     lat = row['decimalLatitude']
#     lon = row['decimalLongitude']
#     return not is_within_radius(lat, lon, sp1_points, radius_km)
