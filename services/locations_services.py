from models.locations_models import LocationsModel

class LocationService:
    def get_all():
        try:
            locations = LocationsModel.get_all()

            return locations
        except Exception as e:
            raise Exception(str(e))