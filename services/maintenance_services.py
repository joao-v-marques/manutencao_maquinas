from models.maintenance_models import MaintenanceModel

class MaintenanceService:
    @staticmethod
    def get_all():
        try:
            maintenances = MaintenanceModel.get_all()

            return maintenances
        except Exception as e:
            raise Exception(str(e))